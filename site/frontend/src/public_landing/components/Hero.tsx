import { Button } from "./ui/button";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PromoTimer } from "./PromoTimer";
import { fetchPublicApi, getApiUrl } from "../utils/apiUtils";
import { useCurrency } from "@crm/hooks/useSalonSettings";

interface HeroProps {
  initialBanner?: any;
  salonInfo?: any;
}

export function Hero({ initialBanner, salonInfo }: HeroProps) {
  const { t } = useTranslation(['public_landing', 'common', 'dynamic']);
  const { currency } = useCurrency();
  const [heroBanner, setHeroBanner] = useState<any>(initialBanner || null);

  useEffect(() => {
    if (initialBanner) {
      setHeroBanner(initialBanner);
      return;
    }
    const fetchBanner = async () => {
      try {
        const data = await fetchPublicApi('banners');
        if (data.banners && data.banners.length > 0) {
          setHeroBanner(data.banners[0]);
        }
      } catch (err) {
        console.error('Error loading hero banner:', err);
      }
    };
    fetchBanner();
  }, [initialBanner]);


  const getTranslatedText = (banner: any, field: 'title' | 'subtitle'): string => {
    if (!banner) return '';
    const translation = t(`dynamic:public_banners.${banner.id}.${field}`, {
      defaultValue: banner[field] || '',
      // Pass interpolation variables for placeholders
      percent: banner.percent,
      max: banner.max,
      currency: currency
    });
    return typeof translation === 'string' ? translation : (banner[field] || '');
  };

  const API_URL_VAR = getApiUrl();
  const getFullImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const separator = path.startsWith('/') ? '' : '/';
    return `${API_URL_VAR}${separator}${path}`;
  };

  const backgroundImage = heroBanner?.image_url ? getFullImageUrl(heroBanner.image_url) : '';

  // Invert coordinates when image is flipped

  const desktopX = heroBanner?.bg_pos_desktop_x ?? 50;
  const desktopY = heroBanner?.bg_pos_desktop_y ?? 50;
  const mobileX = heroBanner?.bg_pos_mobile_x ?? 50;
  const mobileY = heroBanner?.bg_pos_mobile_y ?? 50;

  // Stats from custom_settings
  const stats = salonInfo?.custom_settings?.stats;

  return (
    <section id="home" className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-muted/20">
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Elegant Beauty"
            className="hero-banner-img w-full h-full object-cover transition-opacity duration-700 ease-in-out"
            loading="eager"
            fetchPriority="high"
            style={{
              objectPosition: `${window.innerWidth < 640 ? mobileX : desktopX}% ${window.innerWidth < 640 ? mobileY : desktopY}%`,
              transform: [
                (heroBanner?.is_flipped_horizontal === 1 || heroBanner?.is_flipped_horizontal === true) ? 'scaleX(-1)' : '',
                (heroBanner?.is_flipped_vertical === 1 || heroBanner?.is_flipped_vertical === true) ? 'scaleY(-1)' : ''
              ].filter(Boolean).join(' ')
            }}
            onError={() => console.error(`[Hero] Banner image failed to load: ${backgroundImage}`)}
          />

        )}
        {/* Overlay - pure white to match production */}
        <div className="hero-overlay" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full flex-grow flex flex-col justify-center">
        <div className="w-full max-w-2xl pt-8 sm:pt-12 lg:pt-16 space-y-6 sm:space-y-8">
          <div className="space-y-4 sm:space-y-6">
            <h1 className="hero-title">
              {getTranslatedText(heroBanner, 'title')}
              <br />
              <span className="hero-subtitle">
                {getTranslatedText(heroBanner, 'subtitle')}
              </span>
            </h1>

            <p className="hero-description">
              {t('heroDescription', { ns: 'public_landing' })}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-4 animate-fade-in-up max-w-md">
            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hero-button-primary px-4 sm:px-6 py-4 sm:py-5 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              size="lg"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm sm:text-base">{t('bookNow', { ns: 'public_landing' })}</span>
            </Button>
            <Button
              onClick={() => {
                document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
              }}
              variant="outline"
              className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground px-4 sm:px-6 py-4 sm:py-5 shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              <span className="text-sm sm:text-base">{t('ourServices', { ns: 'public_landing' })}</span>
            </Button>
          </div>

          {/* Promo Timer */}
          <PromoTimer />

          {stats && (
            <div className="flex flex-wrap justify-start gap-6 sm:gap-8 lg:gap-12 pt-4 sm:pt-6 border-t border-border/30 animate-fade-in">
              {stats.years_experience && (
                <div className="flex flex-col items-start">
                  <span className="hero-stat-value">{stats.years_experience}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('common:yearsExperience')}</span>
                </div>
              )}
              {stats.happy_clients && (
                <div className="flex flex-col items-start">
                  <span className="hero-stat-value">{stats.happy_clients}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('common:happyClients')}</span>
                </div>
              )}
              {stats.quality_guarantee && (
                <div className="flex flex-col items-start">
                  <span className="hero-stat-value">{stats.quality_guarantee}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('common:qualityGuarantee')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
