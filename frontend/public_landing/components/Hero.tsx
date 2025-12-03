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
  title_es?: string;
  title_de?: string;
  title_fr?: string;
  title_hi?: string;
  title_kk?: string;
  title_pt?: string;
  subtitle_ru: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  subtitle_es?: string;
  subtitle_de?: string;
  subtitle_fr?: string;
  subtitle_hi?: string;
  subtitle_kk?: string;
  subtitle_pt?: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  bg_pos_desktop_x?: number;
  bg_pos_desktop_y?: number;
  bg_pos_mobile_x?: number;
  bg_pos_mobile_y?: number;
  is_flipped_horizontal?: number | boolean;
  is_flipped_vertical?: number | boolean;
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
  }, [language]); // Re-fetch when language changes

  const getTranslatedText = (
    ru: string,
    en?: string,
    ar?: string,
    es?: string,
    de?: string,
    fr?: string,
    hi?: string,
    kk?: string,
    pt?: string
  ) => {
    if (language === 'en' && en) return en;
    if (language === 'ar' && ar) return ar;
    if (language === 'es' && es) return es;
    if (language === 'de' && de) return de;
    if (language === 'fr' && fr) return fr;
    if (language === 'hi' && hi) return hi;
    if (language === 'kk' && kk) return kk;
    if (language === 'pt' && pt) return pt;
    return ru;
  };

  const backgroundImage = heroBanner?.image_url; // || defaultImage;

  // Invert coordinates when image is flipped
  const isFlippedH = heroBanner?.is_flipped_horizontal === 1 || heroBanner?.is_flipped_horizontal === true;
  const isFlippedV = heroBanner?.is_flipped_vertical === 1 || heroBanner?.is_flipped_vertical === true;

  const desktopX = isFlippedH ? (100 - (heroBanner?.bg_pos_desktop_x ?? 50)) : (heroBanner?.bg_pos_desktop_x ?? 50);
  const desktopY = isFlippedV ? (100 - (heroBanner?.bg_pos_desktop_y ?? 50)) : (heroBanner?.bg_pos_desktop_y ?? 50);
  const mobileX = isFlippedH ? (100 - (heroBanner?.bg_pos_mobile_x ?? 50)) : (heroBanner?.bg_pos_mobile_x ?? 50);
  const mobileY = isFlippedV ? (100 - (heroBanner?.bg_pos_mobile_y ?? 50)) : (heroBanner?.bg_pos_mobile_y ?? 50);

  return (
    <section id="home" className="relative min-h-screen flex flex-col overflow-hidden">
      <style>{`
        .hero-banner-img {
          --object-pos-x: ${mobileX}%;
          --object-pos-y: ${mobileY}%;
          object-position: var(--object-pos-x) var(--object-pos-y);
        }
        @media (min-width: 640px) {
          .hero-banner-img {
            --object-pos-x: ${desktopX}%;
            --object-pos-y: ${desktopY}%;
          }
        }
      `}</style>
      <div className="absolute inset-0 bg-muted/20">
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Elegant Beauty"
            className="hero-banner-img w-full h-full object-cover transition-opacity duration-700 ease-in-out"
            style={{
              transform: [
                (heroBanner?.is_flipped_horizontal === 1 || heroBanner?.is_flipped_horizontal === true) ? 'scaleX(-1)' : '',
                (heroBanner?.is_flipped_vertical === 1 || heroBanner?.is_flipped_vertical === true) ? 'scaleY(-1)' : ''
              ].filter(Boolean).join(' ')
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/40" />
      </div>


      <div className="relative max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-24 sm:py-32 w-full flex-grow flex flex-col justify-center">
        <div className="w-full max-w-2xl pt-16 sm:pt-32 space-y-8">
          {/* Title and Description */}
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl text-[var(--heading)] animate-fade-in-up leading-tight">
              {heroBanner ? getTranslatedText(
                heroBanner.title_ru,
                heroBanner.title_en,
                heroBanner.title_ar,
                heroBanner.title_es,
                heroBanner.title_de,
                heroBanner.title_fr,
                heroBanner.title_hi,
                heroBanner.title_kk,
                heroBanner.title_pt
              ) : (t('heroTitle') || "Ваша красота —")}
              <br />
              <span className="text-accent-foreground">
                {heroBanner ? getTranslatedText(
                  heroBanner.subtitle_ru,
                  heroBanner.subtitle_en,
                  heroBanner.subtitle_ar,
                  heroBanner.subtitle_es,
                  heroBanner.subtitle_de,
                  heroBanner.subtitle_fr,
                  heroBanner.subtitle_hi,
                  heroBanner.subtitle_kk,
                  heroBanner.subtitle_pt
                ) : (t('heroSubtitle') || "наша страсть")}
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
              className="hero-button-primary px-4 sm:px-8 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
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
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-4 sm:px-8 py-5 sm:py-6 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
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
