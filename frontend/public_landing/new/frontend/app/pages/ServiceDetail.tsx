import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";

export function ServiceDetail() {
    const { t, i18n } = useTranslation(['public_landing/services', 'public_landing', 'common']);
    const language = i18n.language;
    const { category } = useParams();
    const navigate = useNavigate();
    const [masters, setMasters] = useState<any[]>([]);

    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

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
                                                {service[`name_${language}`] || service.name_ru || service.name}
                                            </h4>
                                            {service.duration && (
                                                <p className="text-sm text-muted-foreground">
                                                    {service.duration} {t('minutes', { defaultValue: 'мин' })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl font-semibold text-primary">
                                                {service.price} {t('currency', { defaultValue: 'AED' })}
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
