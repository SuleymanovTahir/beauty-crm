/**
 * Prerender public pages to static HTML (SSG) for SEO.
 *
 * How it works:
 * - builds the frontend first (run this after `vite build`)
 * - starts `vite preview`
 * - uses puppeteer to render routes and saves the resulting HTML into dist/
 *
 * Notes:
 * - If backend API is reachable, it will also prerender all procedure pages:
 *   /service/<category>/<id>-<slug>
 * - If API is not reachable, it will still prerender core static routes.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.resolve(rootDir, "dist");

// Ensure puppeteer uses a workspace-local cache (sandbox-friendly).
process.env.PUPPETEER_CACHE_DIR =
  process.env.PUPPETEER_CACHE_DIR || path.resolve(rootDir, ".puppeteer-cache");
process.env.TMPDIR = process.env.TMPDIR || path.resolve(rootDir, ".tmp");
// Sandbox-friendly HOME so Chromium doesn't touch user Library dirs.
process.env.HOME = process.env.HOME || path.resolve(rootDir, ".home");

const PREVIEW_HOST = process.env.PRERENDER_HOST || "127.0.0.1";
const PREVIEW_PORT = Number(process.env.PRERENDER_PORT || "4173");
const PREVIEW_BASE = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;

const API_BASE =
  process.env.PRERENDER_API_BASE ||
  process.env.VITE_API_URL || // if you set it for build
  PREVIEW_BASE; // fallback (proxy may exist in dev; in preview it won't)

function log(...args) {
  process.stdout.write(args.join(" ") + "\n");
}

async function httpGetJson(url) {
  return await new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
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

function routeToFile(route) {
  // route: "/" or "/service/x"
  const clean = route.replace(/[#?].*$/, "").replace(/^\/+/, "");
  if (!clean) return path.join(distDir, "index.html");
  return path.join(distDir, clean, "index.html");
}

async function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
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
  ];

  // Try to discover procedure routes from API.
  try {
    const services = await httpGetJson(`${API_BASE}/api/public/services?language=en`);
    if (Array.isArray(services)) {
      const routes = new Set(baseRoutes);
      for (const s of services) {
        const id = s?.id;
        const category = (s?.category || "other").toString().toLowerCase();
        const name = s?.name_en || s?.name || s?.name_ru || "";
        const slug = slugifyAscii(name) || `service-${id}`;
        if (id) {
          routes.add(`/service/${encodeURIComponent(category)}/${id}-${encodeURIComponent(slug)}`);
        }
        // also category page
        routes.add(`/service/${encodeURIComponent(category)}`);
      }
      return Array.from(routes);
    }
  } catch (e) {
    log("ℹ️  API not reachable for route discovery; prerendering core routes only.");
  }

  return baseRoutes;
}

async function main() {
  // Ensure dist exists
  await fs.access(distDir);
  await fs.mkdir(process.env.TMPDIR, { recursive: true });
  await fs.mkdir(process.env.HOME, { recursive: true });
  const userDataDir = path.resolve(rootDir, ".puppeteer-user-data");
  await fs.mkdir(userDataDir, { recursive: true });

  const preview = await startPreview();
  log(`✅ Preview started at ${PREVIEW_BASE}`);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: "new",
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

    const page = await browser.newPage();
    // Give JS some time to fetch data / paint.
    page.setDefaultNavigationTimeout(60_000);

    for (const route of routes) {
      const url = `${PREVIEW_BASE}${route}`;
      log(`→ ${route}`);

      await page.goto(url, { waitUntil: "networkidle2" });
      // Small settle time for lazy content
      await new Promise((r) => setTimeout(r, 300));

      const html = await page.content();
      const outFile = routeToFile(route);
      await ensureDirForFile(outFile);
      await fs.writeFile(outFile, html, "utf8");
    }
  } finally {
    await browser.close();
    preview.kill("SIGTERM");
  }

  log("✅ Prerender complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

