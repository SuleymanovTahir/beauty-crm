import { Header } from "../components/Header";
import "../styles/public_landing_globals.css";
import "../public_landing.css";
import { Footer } from "../components/Footer";
import { useState, useEffect } from "react";
import { apiClient } from "../../src/api/client";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function ServiceDetail() {
    const { t, i18n } = useTranslation(['public_landing', 'common']);
    const language = i18n.language;
    const { category } = useParams();
    const navigate = useNavigate();
    const [salonInfo, setSalonInfo] = useState<any>({});
    const [services, setServices] = useState<any[]>([]);
    const [masters, setMasters] = useState<any[]>([]);

    useEffect(() => {
        apiClient.getSalonInfo()
            .then(setSalonInfo)
            .catch(err => console.error('Error loading salon info:', err));

        apiClient.getPublicServices()
            .then(setServices)
            .catch(err => console.error('Error loading services:', err));

        // Load masters/employees
        fetch('/api/employees')
            .then(res => res.json())
            .then(data => setMasters(data.filter((m: any) => m.role === 'master')))
            .catch(err => console.error('Error loading masters:', err));
    }, []);

    // Filter services by category
    const categoryServices = Array.isArray(services) ? services.filter(s => {
        const cat = s.category?.toLowerCase() || '';
        if (category === 'nails') return cat.includes('маникюр') || cat.includes('педикюр') || cat.includes('manicure') || cat.includes('pedicure');
        if (category === 'hair') return cat.includes('волос') || cat.includes('hair');
        if (category === 'makeup') return cat.includes('макияж') || cat.includes('makeup') || cat.includes('косметолог');
        return false;
    }) : [];

    const getCategoryInfo = () => {
        switch (category) {
            case 'nails':
                return {
                    title: t('manicurePedicure'),
                    description: t('service1Desc'),
                    image: "https://images.unsplash.com/photo-1727199433272-70fdb94c8430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
                };
            case 'hair':
                return {
                    title: t('haircutsStyling'),
                    description: t('service2Desc'),
                    image: "https://images.unsplash.com/photo-1659036354224-48dd0a9a6b86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
                };
            case 'makeup':
                return {
                    title: t('service3Title'),
                    description: t('service3Desc'),
                    image: "https://images.unsplash.com/photo-1617035305886-59c560e07ce4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
                };
            default:
                return {
                    title: '',
                    description: '',
                    image: ''
                };
        }
    };

    const categoryInfo = getCategoryInfo();

    const scrollToBooking = () => {
        navigate('/#booking-section');
    };

    return (
        <div className="min-h-screen bg-[#f5f3f0]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <Header salonInfo={salonInfo} />

            <main className="pt-32 pb-24 px-6 lg:px-12">
                <div className="container mx-auto max-w-6xl">
                    {/* Hero Section */}
                    <div className="grid lg:grid-cols-2 gap-12 mb-16">
                        <div>
                            <h1 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-6">
                                {categoryInfo.title}
                            </h1>
                            <p className="text-[#6b6b6b] text-lg mb-8 leading-relaxed">
                                {categoryInfo.description}
                            </p>
                            <button
                                onClick={scrollToBooking}
                                className="px-12 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors"
                            >
                                {t('bookNow')}
                            </button>
                        </div>
                        <div className="relative h-[500px] rounded-3xl overflow-hidden">
                            <img
                                src={categoryInfo.image}
                                alt={categoryInfo.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Services & Pricing */}
                    {categoryServices.length > 0 && (
                        <div className="bg-white rounded-3xl p-8 lg:p-12 mb-12">
                            <h2 className="text-3xl text-[#2d2d2d] mb-8">{t('ourServices')}</h2>
                            <div className="space-y-6">
                                {categoryServices.map((service, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-4 border-b border-[#f5f3f0] last:border-0 hover:bg-[#f5f3f0] hover:px-4 hover:rounded-lg transition-all"
                                    >
                                        <div className="flex-1">
                                            <h4 className="text-[#2d2d2d] mb-1">{service.name}</h4>
                                            <p className="text-sm text-[#6b6b6b]">{service.duration || 60} {t('minutes', { defaultValue: 'мин' })}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-2xl text-[#b8a574] font-semibold">
                                                AED {service.price}
                                            </span>
                                            <span className="text-sm text-[#6b6b6b] line-through">
                                                AED {service.price * 2}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Our Masters Section */}
                    {masters.length > 0 && (
                        <div className="bg-white rounded-3xl p-8 lg:p-12 mb-12">
                            <h2 className="text-3xl text-[#2d2d2d] mb-4">{t('ourMasters', { defaultValue: 'Наши мастера' })}</h2>
                            <p className="text-[#6b6b6b] mb-8">
                                {t('mastersDescription', { defaultValue: 'Наши профессиональные мастера с многолетним опытом работы готовы предоставить вам услуги высочайшего качества' })}
                            </p>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {masters.slice(0, 6).map((master, index) => (
                                    <div key={index} className="text-center">
                                        <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-[#f5f3f0]">
                                            {master.photo_url ? (
                                                <img src={master.photo_url} alt={master.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl text-[#b8a574]">
                                                    {master.name?.charAt(0) || 'M'}
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="text-[#2d2d2d] mb-1">{master.name}</h4>
                                        <p className="text-sm text-[#6b6b6b]">{master.specialization || t('master', { defaultValue: 'Мастер' })}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Portfolio Gallery */}
                    <div>
                        <h2 className="text-3xl text-[#2d2d2d] mb-8">{t('portfolioTitle')}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden">
                                    <img
                                        src={`${categoryInfo.image}&sig=${i}`}
                                        alt={`Portfolio ${i}`}
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <Footer salonInfo={salonInfo} />
        </div>
    );
}
