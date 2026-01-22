import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/ui/button";
import { useCurrency } from "../../src/hooks/useSalonSettings";
import { getApiUrl } from "../utils/apiUtils";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

type SeoMetadata = {
  salon_name?: string;
  city?: string;
  base_url?: string;
  logo_url?: string;
  seo_description?: string;
};

type PublicService = {
  id: number;
  category?: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  duration?: string | number | null;
};

function upsertMeta(selector: string, attr: string, value: string) {
  if (!value) return;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
    const propMatch = selector.match(/meta\[property="([^"]+)"\]/);
    if (nameMatch) el.setAttribute("name", nameMatch[1]);
    if (propMatch) el.setAttribute("property", propMatch[1]);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id: string, data: any) {
  const scriptId = `jsonld-${id}`;
  let el = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = scriptId;
    document.head.appendChild(el);
  }
  el.text = JSON.stringify(data);
}

function parseServiceId(serviceParam: string | undefined): number | null {
  if (!serviceParam) return null;
  const first = serviceParam.split("-")[0];
  const id = Number(first);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function ProcedureDetail() {
  const { t, i18n } = useTranslation(["public_landing", "public_landing/services", "common"]);
  const language = i18n.language;
  const { category, service: serviceParam } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  const serviceId = useMemo(() => parseServiceId(serviceParam), [serviceParam]);
  const [seo, setSeo] = useState<SeoMetadata | null>(null);
  const [service, setService] = useState<PublicService | null>(null);

  useEffect(() => {
    const API_URL = getApiUrl();

    // SEO metadata
    try {
      const cached = localStorage.getItem("seo_metadata");
      if (cached) setSeo(JSON.parse(cached));
    } catch { }
    fetch(`${API_URL}/api/public/seo-metadata`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") setSeo(data);
      })
      .catch(() => { });

    if (!serviceId) return;
    fetch(`${API_URL}/api/public/services/${serviceId}?language=${encodeURIComponent(language)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load service");
        return r.json();
      })
      .then((data) => setService(data))
      .catch(() => setService(null));
  }, [language, serviceId]);

  useEffect(() => {
    const baseUrl = (seo?.base_url || window.location.origin).replace(/\/$/, "");
    if (!serviceId) return;

    const catSlug = encodeURIComponent(String(category || "other").toLowerCase());
    const canonicalUrl = `${baseUrl}/service/${catSlug}/${serviceParam || serviceId}`;

    const salonName = seo?.salon_name || "Beauty Salon";
    const city = seo?.city || "";
    const serviceName = service?.name || t("service", { defaultValue: "Service" });

    const title = `${serviceName}${city ? ` — ${city}` : ""} | ${salonName}`;
    const description = (service?.description || seo?.seo_description || "").toString().slice(0, 300);

    document.title = title;
    upsertMeta('meta[name="description"]', "content", description);
    upsertLink("canonical", canonicalUrl);

    upsertMeta('meta[property="og:title"]', "content", title);
    upsertMeta('meta[property="og:description"]', "content", description);
    upsertMeta('meta[property="og:url"]', "content", canonicalUrl);
    if (seo?.logo_url) upsertMeta('meta[property="og:image"]', "content", seo.logo_url);

    upsertMeta('meta[name="twitter:title"]', "content", title);
    upsertMeta('meta[name="twitter:description"]', "content", description);
    if (seo?.logo_url) upsertMeta('meta[name="twitter:image"]', "content", seo.logo_url);

    const serviceSchema = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": serviceName,
      "description": description || undefined,
      "serviceType": service?.category || category || undefined,
      "offers": service?.price
        ? {
          "@type": "Offer",
          "price": service.price,
          "priceCurrency": service.currency || "AED",
          "url": canonicalUrl,
        }
        : undefined,
      "provider": {
        "@type": "BeautySalon",
        "name": salonName,
        "url": baseUrl,
        "image": seo?.logo_url,
      },
    };
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
        { "@type": "ListItem", "position": 2, "name": String(category || "Services"), "item": `${baseUrl}/service/${catSlug}` },
        { "@type": "ListItem", "position": 3, "name": serviceName, "item": canonicalUrl },
      ],
    };
    upsertJsonLd("service", serviceSchema);
    upsertJsonLd("breadcrumbs", breadcrumbSchema);
  }, [seo, service, category, serviceId, serviceParam, t]);

  const scrollToBooking = () => navigate("/#booking");

  if (!serviceId) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="pt-24 pb-24 px-6 lg:px-12">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-4 text-[var(--heading)]">
            {service?.name}
          </h1>

          {service?.description && (
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              {service.description}
            </p>
          )}

          <div className="bg-card rounded-2xl p-6 border border-border mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {service?.duration ? (
                  <span>
                    {t("duration", { ns: "public_landing", defaultValue: "Длительность" })}: {service.duration}{" "}
                    {t("minutes", { defaultValue: "мин" })}
                  </span>
                ) : null}
              </div>
              <div className="text-2xl font-semibold text-primary">
                {service?.price != null ? formatCurrency(service.price) : null}
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={scrollToBooking} className="px-8 py-6 rounded-full text-lg">
                {t("bookNow", { ns: "public_landing", defaultValue: "Записаться" })}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

