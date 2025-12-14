import { Button } from "@/components/ui/button";
import { PromoTimer } from "./PromoTimer";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Calendar, Sparkles } from "lucide-react";
import { motion } from "motion/react";

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
          setHeroBanner(data.banners[0]);
        }
      })
      .catch(err => console.error('Error loading hero banner:', err));
  }, []);

  const getTranslatedText = (banner: any, field: 'title' | 'subtitle') => {
    if (!banner) return '';
    return banner[`${field}_${language}`] || banner[`${field}_en`] || banner[`${field}_ru`] || '';
  };

  const backgroundImage = heroBanner?.image_url;
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
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32 w-full flex-grow flex flex-col justify-center">
        <div className="w-full max-w-2xl lg:max-w-3xl pt-8 sm:pt-16 lg:pt-32 space-y-6 sm:space-y-8">
          {/* Title and Description */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-primary leading-[1.1] sm:leading-tight">
              {getTranslatedText(heroBanner, 'title')}
              <br />
              <span className="text-primary/80 mt-2 block">
                {getTranslatedText(heroBanner, 'subtitle')}
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-[oklch(0.145_0_0)] opacity-80 leading-relaxed font-medium max-w-xl">
              {t('heroDescription', { ns: 'public_landing' }) || "Discover the world of exquisite beauty in an atmosphere of luxury and comfort."}
            </p>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hero-button-primary px-6 sm:px-8 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto text-base sm:text-lg group"
              size="lg"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              <span>{t('bookNow', { ns: 'public_landing' }) || "Записаться"}</span>
            </Button>
            <Button
              onClick={() => {
                document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
              }}
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 sm:px-8 py-5 sm:py-6 shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-base sm:text-lg group"
              size="lg"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" />
              <span>{t('ourServices', { ns: 'public_landing' }) || "Услуги"}</span>
            </Button>
          </motion.div>

          {/* Promo Timer */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <PromoTimer />
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-4 sm:gap-8 lg:gap-12 pt-6 sm:pt-8 border-t border-border/30"
          >
            <div className="flex flex-col items-start">
              <span className="text-2xl sm:text-3xl lg:text-4xl text-primary mb-1 font-bold">10+</span>
              <span className="text-xs sm:text-sm text-muted-foreground leading-tight">{t('common:yearsExperience') || 'лет опыта'}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl sm:text-3xl lg:text-4xl text-primary mb-1 font-bold">5000+</span>
              <span className="text-xs sm:text-sm text-muted-foreground leading-tight">{t('common:happyClients') || 'довольных клиентов'}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl sm:text-3xl lg:text-4xl text-primary mb-1 font-bold">100%</span>
              <span className="text-xs sm:text-sm text-muted-foreground leading-tight">{t('common:qualityGuarantee') || 'гарантия качества'}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
