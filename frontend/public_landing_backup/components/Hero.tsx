import { Button } from "@/components/ui/button";
import { PromoTimer } from "./PromoTimer";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";



export function Hero() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [heroBanner, setHeroBanner] = useState<any>(null);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
    fetch(`${API_URL}/api/public/banners`)
      .then(res => res.json())
      .then(data => {
        if (data.banners && data.banners.length > 0) {
          // Use the first banner (sorted by display_order in backend)
          setHeroBanner(data.banners[0]);
        }
      })
      .catch(err => console.error('Error loading hero banner:', err));
  }, []);

  const getTranslatedText = (banner: any, field: 'title' | 'subtitle') => {
    if (!banner) return '';
    // Try specific language field first (e.g. title_es)
    // Fallback to English (title_en)
    // Fallback to Russian (title_ru)
    return banner[`${field}_${language}`] || banner[`${field}_en`] || banner[`${field}_ru`] || '';
  };

  const backgroundImage = heroBanner?.image_url;

  // Invert coordinates when image is flipped
  const isFlippedH = heroBanner?.is_flipped_horizontal === 1 || heroBanner?.is_flipped_horizontal === true;
  const isFlippedV = heroBanner?.is_flipped_vertical === 1 || heroBanner?.is_flipped_vertical === true;

  const desktopX = isFlippedH ? (100 - (Number(heroBanner?.bg_pos_desktop_x) ?? 50)) : (Number(heroBanner?.bg_pos_desktop_x) ?? 50);
  const desktopY = isFlippedV ? (100 - (Number(heroBanner?.bg_pos_desktop_y) ?? 50)) : (Number(heroBanner?.bg_pos_desktop_y) ?? 50);
  const mobileX = isFlippedH ? (100 - (Number(heroBanner?.bg_pos_mobile_x) ?? 50)) : (Number(heroBanner?.bg_pos_mobile_x) ?? 50);
  const mobileY = isFlippedV ? (100 - (Number(heroBanner?.bg_pos_mobile_y) ?? 50)) : (Number(heroBanner?.bg_pos_mobile_y) ?? 50);

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
        {/* <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/40" /> */}
      </div>


      <div className="relative max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-24 sm:py-32 w-full flex-grow flex flex-col justify-center">
        <div className="w-full max-w-2xl pt-16 sm:pt-32 space-y-8">
          {/* Title and Description */}
          <div className="space-y-6">
            {/* 
            <h1 className="text-5xl sm:text-6xl lg:text-7xl text-[var(--heading)] animate-fade-in-up leading-tight">
              {getTranslatedText(heroBanner, 'title')}
              <br />
              <span className="text-accent-foreground">
                {getTranslatedText(heroBanner, 'subtitle')}
              </span>
            </h1>
            */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl text-primary animate-fade-in-up leading-tight">
              {getTranslatedText(heroBanner, 'title')}
              <br />
              <span className="text-primary/80">
                {getTranslatedText(heroBanner, 'subtitle')}
              </span>
            </h1>

            {/* 
            <p className="text-lg text-foreground/80 animate-fade-in-up leading-relaxed">
              {t('heroDescription', { ns: 'public_landing' }) || "Discover the world of exquisite beauty in an atmosphere of luxury and comfort."}
            </p>
            */}
            <p className="text-lg text-[oklch(0.145_0_0)] opacity-80 animate-fade-in-up leading-relaxed font-medium">
              {t('heroDescription', { ns: 'public_landing' }) || "Discover the world of exquisite beauty in an atmosphere of luxury and comfort."}
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
              <span className="text-xs sm:text-base">{t('bookNow', { ns: 'public_landing' }) || "Записаться"}</span>
            </Button>
            <Button
              onClick={() => {
                document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
              }}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-4 sm:px-8 py-5 sm:py-6 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
              size="lg"
            >
              <span className="text-xs sm:text-base">{t('ourServices', { ns: 'public_landing' }) || "Услуги"}</span>
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
    </section >
  );
}
