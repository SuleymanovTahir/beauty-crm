// /frontend/public_landing/components/Hero.tsx
import { Button } from "@/components/ui/button";
import { PromoTimer } from "./PromoTimer";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [heroBanner, setHeroBanner] = useState<Banner | null>(null);

  // const defaultImage = "https://images.unsplash.com/photo-1664549761426-6a1cb1032854?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHNwYSUyMHRyZWF0bWVudHxlbnwxfHx8fDE3NjQzOTc3MDd8MA&ixlib=rb-4.1.0&q=80&w=1920";

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

  const backgroundImage = heroBanner?.image_url; // || defaultImage;

  return (
    <section id="home" className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-muted/20">
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Elegant Beauty"
            className="w-full h-full object-cover transition-opacity duration-700 ease-in-out"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/40" />
      </div>


      <div className="relative max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-24 sm:py-32 w-full flex-grow flex flex-col justify-center">
        <div className="w-full max-w-2xl pt-16 sm:pt-32 space-y-8">
          {/* Title and Description */}
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl text-primary animate-fade-in-up leading-tight">
              {heroBanner ? getTranslatedText(heroBanner.title_ru, heroBanner.title_en, heroBanner.title_ar) : (t('heroTitle') || "Ваша красота —")}
              <br />
              <span className="text-accent-foreground">
                {heroBanner ? getTranslatedText(heroBanner.subtitle_ru, heroBanner.subtitle_en, heroBanner.subtitle_ar) : (t('heroSubtitle') || "наша страсть")}
              </span>
            </h1>

            <p className="text-lg text-foreground/80 animate-fade-in-up leading-relaxed">
              {t('heroDescription') || "Откройте для себя мир изысканной красоты в атмосфере роскоши и комфорта. Профессиональный уход и безупречный сервис."}
            </p>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-4 animate-fade-in-up">
            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 sm:px-8 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              size="lg"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-base">{t('bookNow') || "Записаться"}</span>
            </Button>
            <Button
              onClick={() => {
                document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
              }}
              variant="outline"
              className="text-primary hover:bg-primary hover:text-primary-foreground px-4 sm:px-8 py-5 sm:py-6 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
              size="lg"
            >
              <span className="text-xs sm:text-base">{t('ourServices') || "Услуги"}</span>
            </Button>
          </div>

          {/* Promo Timer */}
          <PromoTimer />

          {/* Trust Indicators */}
          <div className="flex justify-start gap-8 sm:gap-12 pt-6 border-t border-border/30 animate-fade-in">
            <div className="flex flex-col items-start">
              <span className="text-3xl sm:text-4xl text-primary mb-1">10+</span>
              <span className="text-sm text-muted-foreground">{t('common:yearsExperience') || 'лет опыта'}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-3xl sm:text-4xl text-primary mb-1">5000+</span>
              <span className="text-sm text-muted-foreground">{t('common:happyClients') || 'довольных клиентов'}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-3xl sm:text-4xl text-primary mb-1">100%</span>
              <span className="text-sm text-muted-foreground">{t('common:qualityGuarantee') || 'гарантия качества'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
