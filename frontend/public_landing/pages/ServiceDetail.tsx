//new/pages/ServiceDetail.tsx
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { useCurrency } from '../../src/hooks/useSalonSettings';
import { getApiUrl } from "../utils/apiUtils";

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

function slugifyAscii(text: string) {
    const t = (text || '').toLowerCase();
    const cleaned = t.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return cleaned;
}

export function ServiceDetail() {
    const { t, i18n } = useTranslation(['public_landing/services', 'public_landing', 'common']);
    const language = i18n.language;
    const { category } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useCurrency();
    const [masters, setMasters] = useState<any[]>([]);

    const [services, setServices] = useState<any[]>([]);
    const [seo, setSeo] = useState<SeoMetadata | null>(null);

    useEffect(() => {
        const API_URL = getApiUrl();

        // Try to load cached SEO metadata (fast) + refresh from API (best-effort)
        try {
            const cached = localStorage.getItem('seo_metadata');
            if (cached) setSeo(JSON.parse(cached));
        } catch { }
        fetch(`${API_URL}/api/public/seo-metadata`)
            .then(res => res.json())
            .then((data) => {
                if (data && typeof data === 'object') {
                    setSeo(data);
                    try { localStorage.setItem('seo_metadata', JSON.stringify({ ...data, _timestamp: Date.now() })); } catch { }
                }
            })
            .catch(() => { });

        // Load masters
        fetch(`${API_URL}/api/public/employees?language=${language}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setMasters(data.filter((m: any) => m.role === 'master' || m.position === 'master' || m.job_title === 'master'));
                }
            })
            .catch(err => console.error('Error loading masters:', err));

        // Load services dynamically
        fetch(`${API_URL}/api/public/services?language=${language}`)
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
    }, [language]);

    // Filter services by category
    const categoryServices = services.filter(s => {
        // Universal match: check if service category matches param
        const serviceCat = String(s.category || '').toLowerCase();
        const paramCat = String(category || '').toLowerCase();

        // Exact match or includes (for looser matching like 'nails' vs 'nail')
        return serviceCat === paramCat || serviceCat.includes(paramCat) || paramCat.includes(serviceCat);
    });

    const getCategoryInfo = () => {
        switch (category) {
            case 'nails':
                return {
                    title: t('manicurePedicure', { defaultValue: 'Manicure & Pedicure' }),
                    description: t('service1Desc', { defaultValue: 'Professional nail care services.' }),
                    image: "https://images.unsplash.com/photo-1727199433272-70fdb94c8430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
                };
            case 'hair':
                return {
                    title: t('haircutsStyling', { defaultValue: 'Haircuts & Styling' }),
                    description: t('service2Desc', { defaultValue: 'Expert hair styling and treatments.' }),
                    image: "https://images.unsplash.com/photo-1659036354224-48dd0a9a6b86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
                };
            case 'makeup':
                return {
                    title: t('service3Title', { defaultValue: 'Makeup & Brows' }),
                    description: t('service3Desc', { defaultValue: 'Professional makeup and brow styling.' }),
                    image: "https://images.unsplash.com/photo-1617035305886-59c560e07ce4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
                };
            default:
                return {
                    title: category || 'Service',
                    description: '',
                    image: ''
                };
        }
    };

    const categoryInfo = getCategoryInfo();

    // SEO for category page: title/description/canonical/open graph/schema.
    useEffect(() => {
        const baseUrl = (seo?.base_url || window.location.origin).replace(/\/$/, '');
        const slug = encodeURIComponent(String(category || '').toLowerCase());
        const canonicalUrl = slug ? `${baseUrl}/service/${slug}` : `${baseUrl}/`;

        // Build a unique-ish title & description for this category page.
        const salonName = seo?.salon_name || 'Beauty Salon';
        const city = seo?.city || '';
        const serviceNames = categoryServices
            .slice(0, 6)
            .map((s) => (s[`name_${language}`] || s.name_en || s.name_ru || s.name || '').trim())
            .filter(Boolean);

        const title = categoryInfo?.title
            ? `${categoryInfo.title}${city ? ` — ${city}` : ''} | ${salonName}`
            : `${salonName}`;

        const descriptionParts = [
            categoryInfo?.description || '',
            serviceNames.length ? `${t('ourServices', { ns: 'public_landing', defaultValue: 'Услуги' })}: ${serviceNames.join(', ')}` : '',
        ].filter(Boolean);
        const description = descriptionParts.join(' ').slice(0, 300);

        document.title = title;
        upsertMeta('meta[name="description"]', 'content', description || (seo?.seo_description || ''));
        upsertLink('canonical', canonicalUrl);

        // Basic OG/Twitter for sharing & consistency
        upsertMeta('meta[property="og:title"]', 'content', title);
        upsertMeta('meta[property="og:description"]', 'content', description || (seo?.seo_description || ''));
        upsertMeta('meta[property="og:url"]', 'content', canonicalUrl);
        if (seo?.logo_url) upsertMeta('meta[property="og:image"]', 'content', seo.logo_url);
        upsertMeta('meta[name="twitter:title"]', 'content', title);
        upsertMeta('meta[name="twitter:description"]', 'content', description || (seo?.seo_description || ''));
        if (seo?.logo_url) upsertMeta('meta[name="twitter:image"]', 'content', seo.logo_url);

        // Schema.org: Service + Breadcrumbs (minimal, safe)
        const serviceSchema = {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": categoryInfo?.title || String(category || 'Service'),
            "description": description || undefined,
            "serviceType": categoryInfo?.title || undefined,
            "provider": {
                "@type": "BeautySalon",
                "name": salonName,
                "url": baseUrl,
                "image": seo?.logo_url,
            }
        };
        const breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": `${baseUrl}/`
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": categoryInfo?.title || String(category || 'Service'),
                    "item": canonicalUrl
                }
            ]
        };
        upsertJsonLd('service', serviceSchema);
        upsertJsonLd('breadcrumbs', breadcrumbSchema);

        return () => {
            // Leave tags in place; next route will overwrite.
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, language, seo, categoryInfo.title, categoryInfo.description, categoryServices.length]);

    const scrollToBooking = () => {
        navigate('/#booking');
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
                                {t('bookNow', { ns: 'public_landing', defaultValue: 'Записаться' })}
                            </Button>
                        </div>
                        <div className="order-1 lg:order-2 relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden shadow-xl">
                            <img
                                src={categoryInfo.image}
                                alt={categoryInfo.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Services & Pricing */}
                    {categoryServices.length > 0 && (
                        <div className="bg-card rounded-3xl p-8 lg:p-12 mb-12 shadow-sm border border-border">
                            <h2 className="text-3xl font-bold mb-8">{t('ourServices', { ns: 'public_landing', defaultValue: 'Наши услуги' })}</h2>
                            <div className="space-y-6">
                                {categoryServices.map((service, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-border last:border-0 hover:bg-muted/50 hover:px-4 hover:rounded-lg transition-all"
                                    >
                                        <div className="flex-1 mb-2 sm:mb-0">
                                            <h4 className="font-medium text-lg mb-1">
                                                <Link
                                                    to={`/service/${encodeURIComponent(String(category || 'other').toLowerCase())}/${service.id}-${encodeURIComponent(slugifyAscii(service.name_en || service.name || service.name_ru || 'service'))}`}
                                                    className="hover:underline"
                                                >
                                                    {service[`name_${language}`] || service.name_ru || service.name}
                                                </Link>
                                            </h4>
                                            {service.duration && (
                                                <p className="text-sm text-muted-foreground">
                                                    {service.duration} {t('minutes', { defaultValue: 'мин' })}
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
                            <h2 className="text-3xl font-bold mb-4">{t('ourMasters', { defaultValue: 'Наши мастера' })}</h2>
                            <p className="text-muted-foreground mb-8 max-w-2xl">
                                {t('mastersDescription', { defaultValue: 'Наши профессиональные мастера с многолетним опытом работы готовы предоставить вам услуги высочайшего качества' })}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {masters.slice(0, 8).map((master, index) => (
                                    <div key={index} className="text-center group">
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 rounded-full overflow-hidden bg-muted border-2 border-transparent group-hover:border-primary transition-all">
                                            {master.image ? (
                                                <img
                                                    src={master.image.startsWith('http') ? master.image :
                                                        master.image.startsWith('/') ? `${import.meta.env.VITE_API_URL || window.location.origin}${master.image}` :
                                                            `${import.meta.env.VITE_API_URL || window.location.origin}/uploads/${master.image}`}
                                                    alt={master.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground">
                                                    {master.name?.charAt(0) || 'M'}
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="font-medium mb-1">{master.name}</h4>
                                        <p className="text-sm text-muted-foreground">{master.specialization || master.job_title || t('master', { defaultValue: 'Мастер' })}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Portfolio Gallery */}
                    <div>
                        <h2 className="text-3xl font-bold mb-8">{t('portfolioTitle', { defaultValue: 'Портфолио' })}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden group">
                                    <img
                                        src={`${categoryInfo.image}&sig=${i}`}
                                        alt={`Portfolio ${i}`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
