//new/pages/ServiceDetail.tsx
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { useCurrency } from "@site/hooks/useSalonSettings";
import { getApiUrl } from "../utils/apiUtils";
import { BookingSection } from "../components/BookingSection";
import { safeFetch } from "../utils/errorHandler";
import {
    getLocalizedServiceName,
    getSafeString,
    getSalonName,
    getSalonCity,
    getBaseUrl,
    getMasterName,
    getMasterSpecialization,
    getMasterImageUrl,
    getInitialLetter,
    slugifyAscii,
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
    seo_title?: string;
    seo_description?: string;
    schema?: any;
};

function upsertMeta(selector: string, attr: string, value: string) {
    if (!value) return;
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
        el = document.createElement('meta');
        // Support selectors like meta[name="description"] or meta[property="og:title"]
        const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
        const propMatch = selector.match(/meta\[property="([^"]+)"\]/);
        if (nameMatch) el.setAttribute('name', nameMatch[1]);
        if (propMatch) el.setAttribute('property', propMatch[1]);
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

function upsertLink(rel: string, href: string) {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: any) {
    const scriptId = `jsonld-${id}`;
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
        el = document.createElement('script');
        el.type = 'application/ld+json';
        el.id = scriptId;
        document.head.appendChild(el);
    }
    el.text = JSON.stringify(data);
}


export function ServiceDetail() {
    const { t, i18n } = useTranslation(['public_landing/services', 'public_landing', 'common']);
    const language = normalizeSeoLanguage(i18n.language);
    const { category } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useCurrency();
    const [masters, setMasters] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [seo, setSeo] = useState<SeoMetadata | null>(null);
    const [portfolioImages, setPortfolioImages] = useState<any[]>([]);
    const [categoryImage, setCategoryImage] = useState<string>("");

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

        // Try to load cached SEO metadata (fast) + refresh from API (best-effort)
        try {
            const cached = localStorage.getItem('seo_metadata');
            if (cached) setSeo(JSON.parse(cached));
        } catch { }
        fetch(buildApiUrl('/api/public/seo-metadata', API_URL))
            .then(res => res.json())
            .then((data) => {
                if (data && typeof data === 'object') {
                    setSeo(data);
                    try { localStorage.setItem('seo_metadata', JSON.stringify({ ...data, _timestamp: Date.now() })); } catch { }
                }
            })
            .catch(() => { });

        // Load masters
        fetch(buildApiUrl(`/api/public/employees?language=${language}`, API_URL))
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setMasters(data.filter((m: any) => m.role === 'master' || m.position === 'master' || m.job_title === 'master'));
                }
            })
            .catch(err => console.error('Error loading masters:', err));

        // Load services dynamically
        fetch(buildApiUrl(`/api/public/services?language=${language}`, API_URL))
            .then(res => res.json())
            .then(data => {
                let loadedServices: any[] = [];
                if (Array.isArray(data)) {
                    loadedServices = data;
                } else if (data.categories) {
                    // Fallback for nested
                    data.categories.forEach((cat: any) => {
                        if (cat.items) {
                            loadedServices.push(...cat.items.map((item: any) => ({ ...item, category: cat.id })));
                        }
                    });
                }
                setServices(loadedServices);
            })
            .catch(err => console.error('Error loading services:', err));

        // Load portfolio images for this category
        const routeCategory = getSafeString(category);
        safeFetch(buildApiUrl(`/api/public/gallery?category=portfolio&language=${language}`, API_URL))
            .then(res => res.json())
            .then(data => {
                if (data.images && Array.isArray(data.images)) {
                    // Filter by category if possible, or use all portfolio images
                    const filtered = data.images.filter((img: any) => {
                        const imgCategory = (img.category || "").toLowerCase();
                        const catLower = routeCategory.toLowerCase();
                        return imgCategory === catLower || imgCategory.includes(catLower) || catLower.includes(imgCategory);
                    });
                    setPortfolioImages(filtered.length > 0 ? filtered : data.images.slice(0, 8));
                    // Set first image as category hero image
                    if (filtered.length > 0 && filtered[0].image_path) {
                        setCategoryImage(filtered[0].image_path);
                    } else if (data.images.length > 0 && data.images[0].image_path) {
                        setCategoryImage(data.images[0].image_path);
                    }
                }
            })
            .catch(err => console.error('Error loading portfolio:', err));
    }, [language, category]);

    // Filter services by category
    const categoryServices = services.filter((s) => {
        if (!s || typeof s !== "object") {
            return false;
        }
        const serviceCategory = getSafeString(s.category).toLowerCase();
        const routeCategory = getSafeString(category).toLowerCase();

        if (serviceCategory.length === 0 || routeCategory.length === 0) {
            return false;
        }

        if (serviceCategory === routeCategory) {
            return true;
        }
        if (serviceCategory.indexOf(routeCategory) >= 0) {
            return true;
        }
        if (routeCategory.indexOf(serviceCategory) >= 0) {
            return true;
        }
        return false;
    });

    const getCategoryInfo = () => {
        const routeCategory = getSafeString(category);
        let title = routeCategory;
        let description = "";

        if (routeCategory === "nails") {
            title = t("manicurePedicure", { ns: "public_landing/services" });
            description = t("service1Desc", { ns: "public_landing/services" });
        } else if (routeCategory === "hair") {
            title = t("haircutsStyling", { ns: "public_landing/services" });
            description = t("service2Desc", { ns: "public_landing/services" });
        } else if (routeCategory === "makeup") {
            title = t("service3Title", { ns: "public_landing/services" });
            description = t("service3Desc", { ns: "public_landing/services" });
        } else {
            // Dynamic translation fallback
            const dynamicTitle = t(`categories.${routeCategory.toLowerCase().replace(/\s+/g, '_')}`, { ns: 'dynamic', defaultValue: "" });
            if (dynamicTitle) {
                title = dynamicTitle;
            } else {
                title = routeCategory.charAt(0).toUpperCase() + routeCategory.slice(1);
            }
        }

        return {
            title,
            description,
            image: categoryImage || "",
        };
    };

    const categoryInfo = getCategoryInfo();

    // SEO for category page: title/description/canonical/open graph/schema.
    useEffect(() => {
        if (!seo) {
            return;
        }

        const baseUrl = getBaseUrl(seo);
        const routeCategory = getSafeString(category);
        const slug = encodeURIComponent(routeCategory.toLowerCase());
        const canonicalPath = slug.length > 0 ? `/service/${slug}` : `/`;
        const canonicalUrl = syncCanonicalAndHreflang(baseUrl, canonicalPath, language);
        syncHtmlLanguageMeta(language);

        const salonName = getSalonName(seo);
        const city = getSalonCity(seo);

        const limitedServices = categoryServices.slice(0, 6);
        const serviceNames: string[] = [];
        limitedServices.forEach((s) => {
            const localized = getLocalizedServiceName(s, language);
            if (localized.length > 0) {
                serviceNames.push(localized);
            }
        });

        let title = "";
        if (categoryInfo.title && categoryInfo.title.length > 0) {
            if (city.length > 0 && salonName.length > 0) {
                title = `${categoryInfo.title} — ${city} | ${salonName}`;
            } else if (salonName.length > 0) {
                title = `${categoryInfo.title} | ${salonName}`;
            } else {
                title = categoryInfo.title;
            }
        } else if (salonName.length > 0) {
            title = salonName;
        }

        const descriptionParts: string[] = [];
        if (categoryInfo.description && categoryInfo.description.length > 0) {
            descriptionParts.push(categoryInfo.description);
        }
        if (serviceNames.length > 0) {
            const servicesLabel = t("ourServices", { ns: "public_landing" });
            descriptionParts.push(`${servicesLabel}: ${serviceNames.join(", ")}`);
        }

        let description = "";
        if (descriptionParts.length > 0) {
            description = descriptionParts.join(" ").slice(0, 300);
        } else if (seo.seo_description && typeof seo.seo_description === "string") {
            const trimmed = seo.seo_description.trim();
            if (trimmed.length > 0) {
                description = trimmed.slice(0, 300);
            }
        }

        if (title.length > 0) {
            document.title = title;
        }
        if (description.length > 0) {
            upsertMeta('meta[name="description"]', "content", description);
        }
        upsertLink("canonical", canonicalUrl);

        // Basic OG/Twitter for sharing & consistency
        if (title.length > 0) {
            upsertMeta('meta[property="og:title"]', "content", title);
            upsertMeta('meta[name="twitter:title"]', "content", title);
        }
        if (description.length > 0) {
            upsertMeta('meta[property="og:description"]', "content", description);
            upsertMeta('meta[name="twitter:description"]', "content", description);
        }
        upsertMeta('meta[property="og:url"]', "content", canonicalUrl);
        if (seo.logo_url && typeof seo.logo_url === "string" && seo.logo_url.trim().length > 0) {
            upsertMeta('meta[property="og:image"]', "content", seo.logo_url);
            upsertMeta('meta[name="twitter:image"]', "content", seo.logo_url);
        }

        // Schema.org: Service + Breadcrumbs (minimal, safe)
        const schemaName = categoryInfo.title && categoryInfo.title.length > 0
            ? categoryInfo.title
            : routeCategory;
        const serviceSchema: any = {
            "@context": "https://schema.org",
            "@type": "Service",
            name: schemaName,
            description: description.length > 0 ? description : undefined,
            serviceType: categoryInfo.title && categoryInfo.title.length > 0 ? categoryInfo.title : undefined,
            provider: {
                "@type": "BeautySalon",
                name: salonName,
                url: baseUrl,
                image: seo.logo_url && typeof seo.logo_url === "string" ? seo.logo_url : undefined,
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
                    name: schemaName,
                    item: canonicalUrl,
                },
            ],
        };
        upsertJsonLd("service", serviceSchema);
        upsertJsonLd("breadcrumbs", breadcrumbSchema);
    }, [category, language, seo, categoryInfo.title, categoryInfo.description, categoryServices, t]);

    const scrollToBooking = () => {
        const bookingSection = document.getElementById('booking-section');
        if (bookingSection) {
            // Set hash with category for pre-selection
            const routeCategory = getSafeString(category);
            if (routeCategory.length > 0) {
                window.location.hash = `booking?category=${encodeURIComponent(routeCategory)}`;
            } else {
                window.location.hash = 'booking';
            }
            bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            const routeCategory = getSafeString(category);
            if (routeCategory.length > 0) {
                navigate(`/#booking?category=${encodeURIComponent(routeCategory)}`);
            } else {
                navigate('/#booking');
            }
        }
    };

    return (
        <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <Header />

            <main className="pt-24 pb-24 px-6 lg:px-12">
                <div className="container mx-auto max-w-6xl">
                    {/* Hero Section */}
                    <div className="grid lg:grid-cols-2 gap-12 mb-16 items-center">
                        <div className="order-2 lg:order-1">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-[var(--heading)]">
                                {categoryInfo.title}
                            </h1>
                            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                                {categoryInfo.description}
                            </p>
                            <Button
                                onClick={scrollToBooking}
                                className="px-8 py-6 rounded-full text-lg"
                            >
                                {t("bookNow", { ns: "public_landing" })}
                            </Button>
                        </div>
                        <div className="order-1 lg:order-2 relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden shadow-xl bg-muted">
                            {categoryInfo.image ? (
                                <img
                                    src={categoryInfo.image}
                                    alt={categoryInfo.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    {categoryInfo.title}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Services & Pricing */}
                    {categoryServices.length > 0 && (
                        <div className="bg-card rounded-3xl p-8 lg:p-12 mb-12 shadow-sm border border-border">
                            <h2 className="text-3xl font-bold mb-8">
                                {t("ourServices", { ns: "public_landing" })}
                            </h2>
                            <div className="space-y-6">
                                {categoryServices.map((service, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-border last:border-0 hover:bg-muted/50 hover:px-4 hover:rounded-lg transition-all"
                                    >
                                        <div className="flex-1 mb-2 sm:mb-0">
                                            <h4 className="font-medium text-lg mb-1">
                                                {(() => {
                                                    const localizedName = getLocalizedServiceName(service, language);
                                                    const routeCategory = getSafeString(category).toLowerCase();
                                                    const slugSource = getLocalizedServiceName(service, "en");
                                                    const serviceSlug = slugifyAscii(slugSource);
                                                    const serviceId = service && typeof service.id === "number" ? service.id : null;
                                                    const servicePath =
                                                        serviceId && routeCategory.length > 0
                                                            ? `/service/${encodeURIComponent(routeCategory)}/${serviceId}-${encodeURIComponent(serviceSlug.length > 0 ? serviceSlug : `service-${serviceId}`)}`
                                                            : "";

                                                    if (servicePath.length > 0) {
                                                        return (
                                                            <Link to={servicePath} className="hover:underline">
                                                                {localizedName}
                                                            </Link>
                                                        );
                                                    }
                                                    return localizedName;
                                                })()}
                                            </h4>
                                            {service &&
                                                service.duration &&
                                                typeof service.duration === "number" && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {service.duration}{" "}
                                                        {t("minutes", { ns: "public_landing" })}
                                                    </p>
                                                )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl font-semibold text-primary">
                                                {formatCurrency(service.price)}
                                            </span>
                                            {/* <span className="text-sm text-muted-foreground line-through">
                                                AED {service.price * 2}
                                            </span> */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Our Masters Section */}
                    {masters.length > 0 && (
                        <div className="bg-card rounded-3xl p-8 lg:p-12 mb-12 shadow-sm border border-border">
                            <h2 className="text-3xl font-bold mb-4">
                                {t("ourMasters", { ns: "public_landing" })}
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-2xl">
                                {t("mastersDescription", { ns: "public_landing" })}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {masters.slice(0, 8).map((master, index) => {
                                    const masterName = getMasterName(master);
                                    const specialization = getMasterSpecialization(master);
                                    const apiBase = import.meta.env.VITE_API_URL
                                        ? String(import.meta.env.VITE_API_URL).trim()
                                        : window.location.origin;
                                    const imageUrl = getMasterImageUrl(master, apiBase);
                                    const initial = getInitialLetter(masterName);

                                    return (
                                        <div key={index} className="text-center group">
                                            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 rounded-full overflow-hidden bg-muted border-2 border-transparent group-hover:border-primary transition-all">
                                                {imageUrl.length > 0 ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={masterName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground">
                                                        {initial}
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="font-medium mb-1">{masterName}</h4>
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {master.bio && master.bio.length > 0
                                                    ? master.bio
                                                    : (specialization.length > 0 ? specialization : t("master", { ns: "public_landing" }))
                                                }
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Portfolio Gallery */}
                    {portfolioImages.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-3xl font-bold mb-8">
                                {t("portfolioTitlePart1", { ns: "public_landing" })}{" "}
                                {t("portfolioTitlePart2", { ns: "public_landing" })}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {portfolioImages.slice(0, 8).map((img: any) => {
                                    const apiBase = getApiUrl();
                                    const imageUrl = img.image_path?.startsWith('http')
                                        ? img.image_path
                                        : `${apiBase}${img.image_path?.startsWith('/') ? '' : '/'}${img.image_path || ''}`;
                                    return (
                                        <div key={img.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden group">
                                            <img
                                                src={imageUrl}
                                                alt={img.title || `Portfolio ${img.id}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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
