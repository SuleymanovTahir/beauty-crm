import { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Banner {
    id: number;
    title_ru: string;
    title_en?: string;
    title_ar?: string;
    subtitle_ru: string;
    subtitle_en?: string;
    subtitle_ar?: string;
    image_url: string;
    link_url?: string;
    is_active: boolean;
}

export function Banners() {
    const { language } = useLanguage();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        fetch(`${API_URL}/public/banners`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch banners');
                return res.json();
            })
            .then(data => {
                setBanners(data.banners || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading banners:', err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (banners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000); // Auto-rotate every 5 seconds

        return () => clearInterval(interval);
    }, [banners.length]);

    const nextBanner = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    };

    const prevBanner = () => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    const getTranslatedText = (ru: string, en?: string, ar?: string) => {
        if (language === 'en' && en) return en;
        if (language === 'ar' && ar) return ar;
        return ru;
    };

    if (loading || banners.length === 0) return null;

    const currentBanner = banners[currentIndex];

    return (
        <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50">
            {/* Banner Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                style={{
                    backgroundImage: `url(${currentBanner.image_url})`,
                    filter: 'brightness(0.7)'
                }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Content */}
            <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="text-center text-white z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg animate-fade-in">
                        {getTranslatedText(
                            currentBanner.title_ru,
                            currentBanner.title_en,
                            currentBanner.title_ar
                        )}
                    </h2>
                    <p className="text-xl md:text-2xl mb-8 drop-shadow-md animate-fade-in-delay">
                        {getTranslatedText(
                            currentBanner.subtitle_ru,
                            currentBanner.subtitle_en,
                            currentBanner.subtitle_ar
                        )}
                    </p>
                    {currentBanner.link_url && (
                        <a
                            href={currentBanner.link_url}
                            className="inline-block bg-pink-600 hover:bg-pink-700 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            {language === 'en' ? 'Learn More' : language === 'ar' ? 'اعرف المزيد' : 'Узнать больше'}
                        </a>
                    )}
                </div>
            </div>

            {/* Navigation Arrows */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prevBanner}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-300 z-20"
                        aria-label="Previous banner"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={nextBanner}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-300 z-20"
                        aria-label="Next banner"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Dots Indicator */}
            {banners.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex
                                ? 'bg-white w-8'
                                : 'bg-white/50 hover:bg-white/75'
                                }`}
                            aria-label={`Go to banner ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
