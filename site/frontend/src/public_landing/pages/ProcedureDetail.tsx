import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/ui/button";
import { useCurrency } from "@site/hooks/useSalonSettings";
import { getApiUrl } from "../utils/apiUtils";
import { BookingSection } from "../components/BookingSection";
import { safeFetch } from "../utils/errorHandler";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getSalonName,
  getSalonCity,
  getBaseUrl,
  getSafeString,
  getCurrency,
} from "../utils/dataHelpers";
import {
  buildLocalizedUrl,
  getLanguageFromQuery,
  normalizeSeoLanguage,
  syncCanonicalAndHreflang,
  syncHtmlLanguageMeta,
  syncLanguageQueryParam,
} from "../utils/urlUtils";
import { buildApiUrl } from "@site/api/client";

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
  const language = normalizeSeoLanguage(i18n.language);
  const { category, service: serviceParam } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  const serviceId = useMemo(() => parseServiceId(serviceParam), [serviceParam]);
  const [seo, setSeo] = useState<SeoMetadata | null>(null);
  const [service, setService] = useState<PublicService | null>(null);
  const [serviceImage, setServiceImage] = useState<string>("");

  useEffect(() => {
    const queryLanguage = getLanguageFromQuery();
    const targetLanguage = normalizeSeoLanguage(queryLanguage || i18n.language);
    if (normalizeSeoLanguage(i18n.language) !== targetLanguage) {
      i18n.changeLanguage(targetLanguage);
      return;
    }
    syncLanguageQueryParam(targetLanguage);
    syncHtmlLanguageMeta(targetLanguage);
  }, [i18n, i18n.language]);

  useEffect(() => {
    const API_URL = getApiUrl();

    // SEO metadata
    try {
      const cached = localStorage.getItem("seo_metadata");
      if (cached) setSeo(JSON.parse(cached));
    } catch { }
    fetch(buildApiUrl('/api/public/seo-metadata', API_URL))
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") setSeo(data);
      })
      .catch(() => { });

    if (!serviceId) return;
    fetch(buildApiUrl(`/api/public/services/${serviceId}?language=${encodeURIComponent(language)}`, API_URL))
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load service");
        return r.json();
      })
      .then((data) => {
        setService(data);
        // Try to find portfolio image for this service
        const routeCategory = getSafeString(category);
        safeFetch(buildApiUrl(`/api/public/gallery?category=portfolio&language=${language}`, API_URL))
          .then(res => res.json())
          .then(galleryData => {
            if (galleryData.images && Array.isArray(galleryData.images)) {
              // Try to find image matching service category
              const matching = galleryData.images.find((img: any) => {
                const imgCategory = (img.category || "").toLowerCase();
                const catLower = routeCategory.toLowerCase();
                return imgCategory === catLower || imgCategory.includes(catLower);
              });
              if (matching && matching.image_path) {
                setServiceImage(matching.image_path);
              } else if (galleryData.images.length > 0 && galleryData.images[0].image_path) {
                setServiceImage(galleryData.images[0].image_path);
              }
            }
          })
          .catch(() => {});
      })
      .catch(() => setService(null));
  }, [language, serviceId, category]);

  useEffect(() => {
    if (!seo || !serviceId) {
      return;
    }

    const baseUrl = getBaseUrl(seo);
    const routeCategory = getSafeString(category).toLowerCase();
    const catSlug =
      routeCategory.length > 0
        ? encodeURIComponent(routeCategory)
        : "other";
    const serviceParamSafe = getSafeString(serviceParam);
    const canonicalPath = `/service/${catSlug}/${serviceParamSafe.length > 0 ? serviceParamSafe : serviceId}`;
    const canonicalUrl = syncCanonicalAndHreflang(baseUrl, canonicalPath, language);
    syncHtmlLanguageMeta(language);

    const salonName = getSalonName(seo);
    const city = getSalonCity(seo);
    const serviceName =
      service && typeof service.name === "string" && service.name.trim().length > 0
        ? service.name.trim()
        : "";

    if (serviceName.length === 0) {
      return;
    }

    let title = serviceName;
    if (city.length > 0 && salonName.length > 0) {
      title = `${serviceName} — ${city} | ${salonName}`;
    } else if (salonName.length > 0) {
      title = `${serviceName} | ${salonName}`;
    }

    let description = "";
    if (
      service &&
      typeof service.description === "string" &&
      service.description.trim().length > 0
    ) {
      description = service.description.trim().slice(0, 300);
    } else if (
      seo.seo_description &&
      typeof seo.seo_description === "string" &&
      seo.seo_description.trim().length > 0
    ) {
      description = seo.seo_description.trim().slice(0, 300);
    }

    if (title.length > 0) {
      document.title = title;
    }
    if (description.length > 0) {
      upsertMeta('meta[name="description"]', "content", description);
    }
    upsertLink("canonical", canonicalUrl);

    if (title.length > 0) {
      upsertMeta('meta[property="og:title"]', "content", title);
      upsertMeta('meta[name="twitter:title"]', "content", title);
    }
    if (description.length > 0) {
      upsertMeta('meta[property="og:description"]', "content", description);
      upsertMeta('meta[name="twitter:description"]', "content", description);
    }
    upsertMeta('meta[property="og:url"]', "content", canonicalUrl);
    if (
      seo.logo_url &&
      typeof seo.logo_url === "string" &&
      seo.logo_url.trim().length > 0
    ) {
      upsertMeta('meta[property="og:image"]', "content", seo.logo_url);
      upsertMeta('meta[name="twitter:image"]', "content", seo.logo_url);
    }

    const serviceCategory =
      service && typeof service.category === "string" && service.category.trim().length > 0
        ? service.category.trim()
        : routeCategory.length > 0
          ? routeCategory
          : undefined;

    const serviceCurrency = getCurrency(service, seo);

    const serviceSchema: any = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: serviceName,
      description: description.length > 0 ? description : undefined,
      serviceType: serviceCategory,
      offers:
        service &&
        typeof service.price === "number" &&
        service.price > 0
          ? {
              "@type": "Offer",
              price: service.price,
              priceCurrency: serviceCurrency.length > 0 ? serviceCurrency : undefined,
              url: canonicalUrl,
            }
          : undefined,
      provider: {
        "@type": "BeautySalon",
        name: salonName,
        url: baseUrl,
        image:
          seo.logo_url && typeof seo.logo_url === "string" && seo.logo_url.trim().length > 0
            ? seo.logo_url
            : undefined,
      },
    };
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: t("homeTag", { ns: "public_landing" }),
          item: buildLocalizedUrl(baseUrl, "/", language),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: routeCategory.length > 0 ? routeCategory : t("ourServices", { ns: "public_landing" }),
          item: buildLocalizedUrl(baseUrl, `/service/${catSlug}`, language),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: serviceName,
          item: canonicalUrl,
        },
      ],
    };
    upsertJsonLd("service", serviceSchema);
    upsertJsonLd("breadcrumbs", breadcrumbSchema);
  }, [seo, service, category, serviceId, serviceParam, t, language]);

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section');
    if (bookingSection) {
      // Set hash with service ID for pre-selection
      if (serviceId) {
        window.location.hash = `booking?service=${serviceId}`;
      } else {
        window.location.hash = 'booking';
      }
      bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      if (serviceId) {
        navigate(`/#booking?service=${serviceId}`);
      } else {
        navigate("/#booking");
      }
    }
  };

  if (!serviceId) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="pt-24 pb-24 px-6 lg:px-12">
        <div className="container mx-auto max-w-4xl">
          {/* Hero Image */}
          {serviceImage && (
            <div className="mb-8 rounded-3xl overflow-hidden shadow-xl h-[300px] sm:h-[400px] bg-muted">
              <img
                src={serviceImage.startsWith('http') ? serviceImage : `${getApiUrl()}${serviceImage.startsWith('/') ? '' : '/'}${serviceImage}`}
                alt={service?.name || "Service"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

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
                {service &&
                  service.duration &&
                  (typeof service.duration === "number" ||
                    (typeof service.duration === "string" &&
                      service.duration.trim().length > 0)) && (
                    <span>
                      {t("duration", { ns: "public_landing" })}: {service.duration}{" "}
                      {t("minutes", { ns: "public_landing" })}
                    </span>
                  )}
              </div>
              <div className="text-2xl font-semibold text-primary">
                {service?.price != null ? formatCurrency(service.price) : null}
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={scrollToBooking} className="px-8 py-6 rounded-full text-lg">
                {t("bookNow", { ns: "public_landing" })}
              </Button>
            </div>
          </div>

          {/* Booking Form Section */}
          <div id="booking-section">
            <BookingSection />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
