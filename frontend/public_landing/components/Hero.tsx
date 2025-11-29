import { Button } from "@/components/ui/button";
import { PromoTimer } from "./PromoTimer";
import { useLanguage } from "../LanguageContext";
import { useState, useEffect } from "react";

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

  // Default fallback image
  const defaultImage = "https://images.unsplash.com/photo-1648065460033-5c59f2ef1d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwd29tYW4lMjBiZWF1dHl8ZW58MXx8fHwxNzY0MjIzNDE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
    fetch(`${API_URL}/api/public/banners`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch banners');
        return res.json();
      })
      .then(data => {
        // Use first active banner for Hero
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
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-3xl">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground">
                {t('heroTag') || "Премиальный салон красоты"}
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl tracking-tight text-primary">
                {heroBanner ? getTranslatedText(heroBanner.title_ru, heroBanner.title_en, heroBanner.title_ar) : (t('heroTitle') || "Ваша красота —")}
                <br />
                {heroBanner ? getTranslatedText(heroBanner.subtitle_ru, heroBanner.subtitle_en, heroBanner.subtitle_ar) : (t('heroSubtitle') || "наша страсть")}
              </h1>
            </div>

            <p className="text-lg text-foreground/70 max-w-xl">
              {t('heroDescription') || "Откройте для себя мир изысканной красоты в атмосфере роскоши и комфорта. Профессиональный уход и безупречный сервис."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => {
                  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6"
              >
                {t('bookNow') || "Записаться на прием"}
              </Button>
              <Button
                onClick={() => {
                  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                }}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-6"
              >
                {t('ourServices') || "Наши услуги"}
              </Button>
            </div>

            <PromoTimer />
          </div>
        </div>
      </div>
    </section>
  );
}
