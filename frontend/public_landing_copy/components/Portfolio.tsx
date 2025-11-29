import { useState, useEffect } from "react";
import { apiClient } from "../../../src/api/client";
import { useLanguage } from "../LanguageContext";
import { Button } from "../../../components/ui/button";
import { Calendar } from "lucide-react";

interface PortfolioImage {
  id: number;
  image_path: string;
  title: string;
  category: string;
}

export function Portfolio() {
  const { t, language } = useLanguage();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const data = await apiClient.getPublicGallery('portfolio');
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) return null;
  if (images.length === 0) return null;

  return (
    <section id="portfolio" className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('portfolioTag', { defaultValue: 'Портфолио' })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('portfolioTitle', { defaultValue: 'Наши работы' })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70">
            {t('portfolioDesc', { defaultValue: 'Каждая работа – это произведение искусства, созданное с любовью и профессионализмом' })}
          </p>
        </div>

        {/* Optimized Grid - Not too large images */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {images.map((item: any, index) => {
            const localizedTitle = item[`title_${language}`] || item.title_ru || item.title;

            return (
              <div
                key={item.id || index}
                className="group relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-muted shadow-md hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={item.image_path}
                  alt={localizedTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <p className="text-white text-xs sm:text-sm">{localizedTitle}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-8 sm:mt-12 space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('portfolioCallToAction', { defaultValue: 'Хотите такой же результат? Запишитесь к нашим мастерам!' })}
          </p>
          <Button
            onClick={() => {
              document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 sm:px-12 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            size="lg"
          >
            <Calendar className="w-5 h-5" />
            {t('bookNow', { defaultValue: "Записаться сейчас" })}
          </Button>
        </div>
      </div>
    </section>
  );
}
