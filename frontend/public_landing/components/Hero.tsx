// /frontend/public_landing/components/Hero.tsx
import { Button } from "@/components/ui/button";
import { PromoTimer } from "./PromoTimer";
import { useLanguage } from "../LanguageContext";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

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

export function Hero() {
  const { t, language } = useLanguage();
  const [heroBanner, setHeroBanner] = useState<Banner | null>(null);

  const defaultImage = "https://images.unsplash.com/photo-1664549761426-6a1cb1032854?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHNwYSUyMHRyZWF0bWVudHxlbnwxfHx8fDE3NjQzOTc3MDd8MA&ixlib=rb-4.1.0&q=80&w=1920";

  useEffect(() => {
    const getApiUrl = () => {
      try {
        return import.meta?.env?.VITE_API_URL || window.location.origin;
      } catch {
        return window.location.origin;
      }
    };
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/public/banners`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch banners');
        return res.json();
      })
      .then(data => {
        if (data.banners && data.banners.length > 0) {
          setHeroBanner(data.banners[0]);
        }
      })
      .catch(err => {
        console.error('Error loading hero banner:', err);
      });
  }, []);

  const getTranslatedText = (ru: string, en?: string, ar?: string) => {
    if (language === 'en' && en) return en;
    if (language === 'ar' && ar) return ar;
    return ru;
  };

  const backgroundImage = heroBanner?.image_url || defaultImage;

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={backgroundImage}
          alt="Elegant Beauty"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 w-full">
        <div className="max-w-3xl">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4">
              {/* <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground animate-fade-in">
                {t('heroTag') || "Премиальный салон красоты"}
              </p> */}
              <h1 className="text-4xl sm:text-5xl lg:text-7xl tracking-tight text-primary animate-fade-in-up font-sans font-medium">
                {heroBanner ? getTranslatedText(heroBanner.title_ru, heroBanner.title_en, heroBanner.title_ar) : (t('heroTitle') || "Ваша красота —")}
                <br />
                <span className="text-accent-foreground">
                  {heroBanner ? getTranslatedText(heroBanner.subtitle_ru, heroBanner.subtitle_en, heroBanner.subtitle_ar) : (t('heroSubtitle') || "наша страсть")}
                </span>
              </h1>
            </div>

            <p className="text-base sm:text-lg text-foreground/70 max-w-xl animate-fade-in-up">
              {t('heroDescription') || "Откройте для себя мир изысканной красоты в атмосфере роскоши и комфорта. Профессиональный уход и безупречный сервис."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up">
              <Button
                onClick={() => {
                  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 sm:px-8 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                size="lg"
              >
                <Calendar className="w-5 h-5" />
                {t('bookNow') || "Записаться на прием"}
              </Button>
              <Button
                onClick={() => {
                  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                }}
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 sm:px-8 py-5 sm:py-6 shadow-md hover:shadow-lg transition-all"
                size="lg"
              >
                {t('ourServices') || "Наши услуги"}
              </Button>
            </div>

            <PromoTimer />

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 sm:gap-8 pt-4 sm:pt-8 border-t border-border/50 animate-fade-in">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl text-primary">10+</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{t('yearsExperience') || 'лет опыта'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl text-primary">5000+</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{t('happyClients') || 'довольных клиентов'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl text-primary">100%</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{t('qualityGuarantee') || 'гарантия качества'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
