/**
 * Prerender public pages to static HTML (SSG) for SEO.
 *
 * How it works:
 * - runs after the frontend build has produced dist/
 * - starts `vite preview`
 * - uses puppeteer to render routes and saves the resulting HTML into dist/
 *
 * Notes:
 * - If backend API is reachable, it will also prerender all procedure pages:
 *   /service/<category>/<id>-<slug>
 * - If API is not reachable, it will still prerender core static routes.
 */
import http from "node:http";
import https from "node:https";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.resolve(rootDir, "dist");

function readEnvFile(fileName) {
  const filePath = path.resolve(rootDir, fileName);
  if (!fsSync.existsSync(filePath)) {
    return {};
  }

  const fileContent = fsSync.readFileSync(filePath, "utf8");
  const parsed = {};

  fileContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const normalizedValue = rawValue.replace(/^['"]|['"]$/g, "");
    parsed[key] = normalizedValue;
  });

  return parsed;
}

const fileEnv = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.production"),
};
const BROWSER_EXECUTABLE_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean);

// Ensure puppeteer uses a workspace-local cache (sandbox-friendly).
process.env.PUPPETEER_CACHE_DIR =
  process.env.PUPPETEER_CACHE_DIR || path.resolve(rootDir, ".puppeteer-cache");
process.env.TMPDIR = process.env.TMPDIR || path.resolve(rootDir, ".tmp");
// Sandbox-friendly HOME so Chromium doesn't touch user Library dirs.
process.env.HOME = process.env.HOME || path.resolve(rootDir, ".home");

const PREVIEW_HOST = process.env.PRERENDER_HOST || "127.0.0.1";
const PREVIEW_PORT = Number(process.env.PRERENDER_PORT || "4173");
const PREVIEW_BASE = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
const BACKEND_PORT = Number(process.env.BACKEND_PORT || fileEnv.BACKEND_PORT || "8002");
const LOCAL_BACKEND_BASE = `http://127.0.0.1:${BACKEND_PORT}`;

const API_BASE =
  process.env.PRERENDER_API_BASE ||
  process.env.VITE_API_URL || // if you set it for build
  fileEnv.VITE_API_URL ||
  LOCAL_BACKEND_BASE;
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin.replace(/\/+$/, "");
  } catch {
    return String(API_BASE).replace(/\/+$/, "");
  }
})();
const RAW_SITE_BASE_URL = (
  process.env.PRERENDER_SITE_URL ||
  process.env.VITE_SITE_URL ||
  fileEnv.VITE_SITE_URL ||
  process.env.VITE_API_URL ||
  fileEnv.VITE_API_URL ||
  "https://mlediamant.com"
);
const SITE_BASE_URL = (() => {
  try {
    return new URL(RAW_SITE_BASE_URL).origin.replace(/\/+$/, "");
  } catch {
    return String(RAW_SITE_BASE_URL).replace(/\/+$/, "");
  }
})();

const SUPPORTED_LANGUAGES = ["en", "ru", "ar", "es", "de", "fr", "hi", "kk", "pt"];
const DEFAULT_LANGUAGE = "en";
const ROUTE_OVERRIDE = String(process.env.PRERENDER_ROUTES || "")
  .split(",")
  .map((route) => route.trim())
  .filter((route) => route.length > 0)
  .map((route) => normalizeRoutePath(route));
const DETECTED_PARALLELISM = typeof os.availableParallelism === "function"
  ? os.availableParallelism()
  : os.cpus().length;
const DEFAULT_PRERENDER_CONCURRENCY = Math.max(1, Math.min(6, DETECTED_PARALLELISM));
const PRERENDER_CONCURRENCY = (() => {
  const parsed = Number.parseInt(String(process.env.PRERENDER_CONCURRENCY || ""), 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_PRERENDER_CONCURRENCY;
})();

function log(...args) {
  process.stdout.write(args.join(" ") + "\n");
}

function resolveBrowserExecutablePath(puppeteerModule) {
  for (const candidate of BROWSER_EXECUTABLE_CANDIDATES) {
    if (candidate && fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    if (typeof puppeteerModule.executablePath === "function") {
      const bundledExecutable = puppeteerModule.executablePath();
      if (bundledExecutable && fsSync.existsSync(bundledExecutable)) {
        return bundledExecutable;
      }
    }
  } catch {
    // Ignore missing bundled browser and continue with system Chrome detection.
  }

  return undefined;
}

async function httpGetJson(url) {
  return await new Promise((resolve, reject) => {
    const requestClient = String(url).startsWith("https:") ? https : http;
    const req = requestClient.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed JSON parse for ${url}: ${e?.message || e}`));
        }
      });
    });
    req.on("error", reject);
  });
}

function slugifyAscii(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeRoutePath(route) {
  const normalized = String(route || "").trim();
  if (!normalized || normalized === "/") {
    return "/";
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function buildLocalizedUrl(route, language) {
  const pathname = normalizeRoutePath(route);
  if (language === DEFAULT_LANGUAGE) {
    return `${SITE_BASE_URL}${pathname}`;
  }
  return `${SITE_BASE_URL}${pathname}?lang=${encodeURIComponent(language)}`;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractServices(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.services)) {
    return payload.services;
  }
  if (payload && Array.isArray(payload.categories)) {
    return payload.categories.flatMap((categoryItem) => (
      Array.isArray(categoryItem?.items)
        ? categoryItem.items.map((item) => ({ ...item, category: categoryItem.id }))
        : []
    ));
  }
  return [];
}

async function writeSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const uniqueRoutes = Array.from(new Set(routes.map((route) => normalizeRoutePath(route))));
  const xmlEntries = uniqueRoutes.map((route) => {
    const normalizedRoute = normalizeRoutePath(route);
    const loc = escapeXml(buildLocalizedUrl(normalizedRoute, DEFAULT_LANGUAGE));
    const hreflangLinks = SUPPORTED_LANGUAGES
      .map((language) => {
        const href = escapeXml(buildLocalizedUrl(normalizedRoute, language));
        return `    <xhtml:link rel="alternate" hreflang="${language}" href="${href}" />`;
      })
      .concat(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(buildLocalizedUrl(normalizedRoute, DEFAULT_LANGUAGE))}" />`
      )
      .join("\n");

    let changefreq = "monthly";
    let priority = "0.6";

    if (normalizedRoute === "/") {
      changefreq = "daily";
      priority = "1.0";
    } else if (
      normalizedRoute === "/terms" ||
      normalizedRoute === "/privacy-policy" ||
      normalizedRoute === "/data-deletion"
    ) {
      changefreq = "yearly";
      priority = "0.2";
    } else if (normalizedRoute.startsWith("/service/")) {
      changefreq = "weekly";
      priority = normalizedRoute.split("/").filter(Boolean).length > 2 ? "0.7" : "0.8";
    }

    return `  <url>
    <loc>${loc}</loc>
${hreflangLinks}
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlEntries.join("\n")}
</urlset>
`;

  await fs.writeFile(path.join(distDir, "sitemap.xml"), sitemap, "utf8");
}

function routeToFile(route) {
  // route: "/" or "/service/x"
  const clean = route.replace(/[#?].*$/, "").replace(/^\/+/, "");
  if (!clean) return path.join(distDir, "index.html");
  return path.join(distDir, clean, "index.html");
}

function getPrerenderVisitUrl(route) {
  const pathname = normalizeRoutePath(route);
  const separator = pathname.includes("?") ? "&" : "?";
  return `${PREVIEW_BASE}${pathname}${separator}lang=${DEFAULT_LANGUAGE}`;
}

function getExpectedCanonicalUrl(route) {
  return buildLocalizedUrl(route, DEFAULT_LANGUAGE);
}

function appendHeaderValue(existingValue, nextValue) {
  const normalizedExisting = String(existingValue || "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (!normalizedExisting.includes(nextValue)) {
    normalizedExisting.push(nextValue);
  }

  return normalizedExisting.join(", ");
}

function isServiceRoute(route) {
  return normalizeRoutePath(route).startsWith("/service/");
}

function isProcedureRoute(route) {
  return normalizeRoutePath(route).split("/").filter(Boolean).length >= 3;
}

async function readPageDebugState(page) {
  return await page.evaluate(() => {
    const canonicalHref = document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href") || "";
    const ogUrl = document
      .querySelector('meta[property="og:url"]')
      ?.getAttribute("content") || "";
    const h1Text = document.querySelector("h1")?.textContent?.trim() || "";
    const bodyPreview = document.body?.innerText?.trim().slice(0, 240) || "";

    return {
      pageUrl: window.location.href,
      title: document.title,
      canonicalHref,
      ogUrl,
      h1Text,
      bodyPreview,
    };
  });
}

function isDebugStateReady(debugState, canonicalUrl, requireHeading) {
  if (debugState.canonicalHref !== canonicalUrl) {
    return false;
  }
  if (debugState.ogUrl.length > 0 && debugState.ogUrl !== canonicalUrl) {
    return false;
  }
  if (debugState.title.trim().length === 0 || debugState.bodyPreview.trim().length === 0) {
    return false;
  }
  if (requireHeading && debugState.h1Text.trim().length === 0) {
    return false;
  }
  return true;
}

async function waitForRouteReady(page, route) {
  const normalizedRoute = normalizeRoutePath(route);
  const expectedCanonicalUrl = getExpectedCanonicalUrl(normalizedRoute);
  const requireHeading = isServiceRoute(normalizedRoute);

  const readinessPredicate = (canonicalUrl, requireHeading) => {
    const canonicalHref = document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href") || "";
    const ogUrl = document
      .querySelector('meta[property="og:url"]')
      ?.getAttribute("content") || "";
    const title = document.title.trim();
    const rootText = document.getElementById("root")?.textContent?.trim() || "";
    const bodyText = document.body?.innerText?.trim() || "";
    const contentText = rootText || bodyText;
    const headingText = document.querySelector("h1")?.textContent?.trim() || "";

    if (canonicalHref !== canonicalUrl) {
      return false;
    }
    if (ogUrl.length > 0 && ogUrl !== canonicalUrl) {
      return false;
    }
    if (title.length === 0 || contentText.length === 0) {
      return false;
    }
    if (requireHeading && headingText.length === 0) {
      return false;
    }

    return true;
  };

  try {
    if (requireHeading) {
      await page.waitForFunction(readinessPredicate, {
        timeout: 25_000,
      }, expectedCanonicalUrl, true);
    } else {
      await page.waitForFunction(readinessPredicate, {
        timeout: 20_000,
      }, expectedCanonicalUrl, false);
    }
  } catch (error) {
    const debugState = await readPageDebugState(page);
    if (isDebugStateReady(debugState, expectedCanonicalUrl, requireHeading)) {
      log(`ℹ️ SEO readiness fallback accepted for ${normalizedRoute}`);
      return;
    }
    throw new Error(
      `SEO readiness timeout for ${normalizedRoute}: ${JSON.stringify(debugState)}`
    );
  }

  if (isProcedureRoute(normalizedRoute)) {
    const debugState = await readPageDebugState(page);
    if (debugState.h1Text.length === 0) {
      throw new Error(
        `Procedure route rendered without heading for ${normalizedRoute}: ${JSON.stringify(debugState)}`
      );
    }
  }
}

async function preparePrerenderPage(page) {
  await page.setExtraHTTPHeaders({
    "Accept-Language": DEFAULT_LANGUAGE,
  });
  await page.evaluateOnNewDocument((apiOrigin, previewBase) => {
    const rewriteUrl = (rawInput) => {
      try {
        const parsed = new URL(String(rawInput), window.location.origin);
        const shouldRewrite =
          parsed.origin === apiOrigin &&
          (parsed.pathname.startsWith("/api/") || parsed.pathname.startsWith("/uploads/"));

        if (!shouldRewrite) {
          return parsed.toString();
        }

        return `${previewBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        return String(rawInput);
      }
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (typeof input === "string") {
        return originalFetch(rewriteUrl(input), init);
      }

      if (input instanceof URL) {
        return originalFetch(rewriteUrl(input.toString()), init);
      }

      if (input instanceof Request) {
        return originalFetch(new Request(rewriteUrl(input.url), input), init);
      }

      return originalFetch(input, init);
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function open(method, url, ...rest) {
      return originalXhrOpen.call(this, method, rewriteUrl(url), ...rest);
    };
  }, API_ORIGIN, PREVIEW_BASE);

  await page.setRequestInterception(true);
}

async function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function runWithConcurrency(items, concurrency, iteratee) {
  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  let nextIndex = 0;
  let firstError = null;

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      if (firstError) {
        return;
      }

      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      try {
        await iteratee(items[currentIndex], currentIndex);
      } catch (error) {
        if (!firstError) {
          firstError = error instanceof Error ? error : new Error(String(error));
        }
        return;
      }
    }
  }));

  if (firstError) {
    throw firstError;
  }
}

async function startPreview() {
  // We run preview from frontend root so it serves dist/
  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "preview", "--", "--host", PREVIEW_HOST, "--port", String(PREVIEW_PORT)],
    {
      cwd: rootDir,
      stdio: "pipe",
      env: { ...process.env },
    }
  );

  // Wait until server is up by polling.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${PREVIEW_BASE}/`, (res) => {
          res.resume();
          resolve();
        });
        req.on("error", reject);
      });
      return child;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  child.kill("SIGTERM");
  throw new Error("vite preview did not start within 60s");
}

async function getRoutes() {
  const baseRoutes = [
    "/",
    "/terms",
    "/privacy-policy",
    "/data-deletion",
    "/new-booking",
  ];

  // Try to discover procedure routes from API.
  try {
    const servicesPayload = await httpGetJson(`${API_BASE}/api/public/services?language=en`);
    const services = extractServices(servicesPayload);
    if (services.length > 0) {
      const routes = new Set(baseRoutes);
      for (const s of services) {
        const id = s?.id;
        const category = (s?.category || "other").toString().toLowerCase();
        const name = s?.name || "";
        const slug = slugifyAscii(name) || `service-${id}`;
        if (id) {
          routes.add(`/service/${encodeURIComponent(category)}/${id}-${encodeURIComponent(slug)}`);
        }
        // also category page
        routes.add(`/service/${encodeURIComponent(category)}`);
      }
      if (ROUTE_OVERRIDE.length > 0) {
        return ROUTE_OVERRIDE;
      }
      return Array.from(routes);
    }
  } catch (e) {
    log("ℹ️  API not reachable for route discovery; prerendering core routes only.");
  }

  if (ROUTE_OVERRIDE.length > 0) {
    return ROUTE_OVERRIDE;
  }
  return baseRoutes;
}

async function prerenderRoute(browser, route, routeIndex, totalRoutes) {
  const url = getPrerenderVisitUrl(route);
  log(`→ [${routeIndex + 1}/${totalRoutes}] ${route}`);
  const page = await browser.newPage();

  try {
    await preparePrerenderPage(page);
    page.setDefaultNavigationTimeout(60_000);

    page.on("console", (message) => {
      const type = message.type();
      if (type === "error" || type === "warning") {
        log(`⚠️ Browser ${type} on ${route}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      log(`⚠️ Page error on ${route}: ${error instanceof Error ? error.message : error}`);
    });
    page.on("requestfailed", (request) => {
      log(`⚠️ Request failed on ${route}: ${request.url()} (${request.failure()?.errorText || "unknown"})`);
    });
    page.on("request", async (request) => {
      const requestUrl = request.url();
      const isPreviewApiRequest = requestUrl.startsWith(`${PREVIEW_BASE}/api/`);
      const isPreviewUploadRequest = requestUrl.startsWith(`${PREVIEW_BASE}/uploads/`);
      const isApiOriginApiRequest = requestUrl.startsWith(`${API_ORIGIN}/api/`);
      const isApiOriginUploadRequest = requestUrl.startsWith(`${API_ORIGIN}/uploads/`);

      if (
        !isPreviewApiRequest &&
        !isPreviewUploadRequest &&
        !isApiOriginApiRequest &&
        !isApiOriginUploadRequest
      ) {
        await request.continue();
        return;
      }

      try {
        const parsedUrl = new URL(requestUrl);
        const proxiedUrl = new URL(`${parsedUrl.pathname}${parsedUrl.search}`, `${API_ORIGIN}/`).toString();
        const proxiedHeaders = { ...request.headers() };
        delete proxiedHeaders.host;
        delete proxiedHeaders.connection;
        delete proxiedHeaders["content-length"];
        const requestBody = typeof request.postData === "function"
          ? request.postData()
          : undefined;

        const proxiedResponse = await fetch(proxiedUrl, {
          method: request.method(),
          headers: proxiedHeaders,
          body: requestBody,
          redirect: "follow",
        });
        const responseBody = Buffer.from(await proxiedResponse.arrayBuffer());
        const responseHeaders = Object.fromEntries(proxiedResponse.headers.entries());
        responseHeaders["access-control-allow-origin"] = PREVIEW_BASE;
        responseHeaders["access-control-allow-credentials"] = "true";
        responseHeaders.vary = appendHeaderValue(responseHeaders.vary, "Origin");

        await request.respond({
          status: proxiedResponse.status,
          headers: responseHeaders,
          body: responseBody,
        });
      } catch (error) {
        log(`⚠️ API proxy failed for ${requestUrl}: ${error instanceof Error ? error.message : error}`);
        await request.respond({
          status: 502,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": PREVIEW_BASE,
            "access-control-allow-credentials": "true",
          },
          body: JSON.stringify({ error: "prerender_proxy_failed" }),
        });
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await waitForRouteReady(page, route);

    const html = await page.content();
    const outFile = routeToFile(route);
    await ensureDirForFile(outFile);
    await fs.writeFile(outFile, html, "utf8");
  } finally {
    await page.close();
  }
}

async function main() {
  // Ensure dist exists
  await fs.access(distDir);
  await fs.mkdir(process.env.TMPDIR, { recursive: true });
  await fs.mkdir(process.env.HOME, { recursive: true });
  const userDataDir = await fs.mkdtemp(path.join(process.env.TMPDIR, "puppeteer-user-data-"));

  const preview = await startPreview();
  log(`✅ Preview started at ${PREVIEW_BASE}`);

  const puppeteer = await import("puppeteer");
  const executablePath = resolveBrowserExecutablePath(puppeteer);
  const browser = await puppeteer.launch({
    headless: "new",
    ...(executablePath ? { executablePath } : {}),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-crash-reporter",
      "--disable-breakpad",
      "--disable-crashpad",
      `--user-data-dir=${userDataDir}`,
    ],
  });

  try {
    const routes = await getRoutes();
    log(`🔎 Routes to prerender: ${routes.length}`);
    log(`⚡ Prerender concurrency: ${Math.max(1, Math.min(PRERENDER_CONCURRENCY, routes.length || 1))}`);
    await runWithConcurrency(
      routes,
      PRERENDER_CONCURRENCY,
      async (route, routeIndex) => {
        await prerenderRoute(browser, route, routeIndex, routes.length);
      },
    );

    await writeSitemap(routes);
  } finally {
    await browser.close();
    preview.kill("SIGTERM");
    // Cleanup temp profile to avoid creating lots of files in repo
    try {
      await fs.rm(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }

  log("✅ Prerender complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
