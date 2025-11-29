import { useState, useEffect } from "react";
import { apiClient } from "../../src/api/client";
import { useLanguage } from "../LanguageContext";

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
    <section id="portfolio" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('portfolioTag') || 'Портфолио'}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('portfolioTitle') || 'Наши работы'}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('portfolioDesc') || 'Каждая работа – это произведение искусства, созданное с любовью и профессионализмом'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((item: any, index) => {
            // Get localized title
            const localizedTitle = item[`title_${language}`] || item.title_ru || item.title;

            return (
              <div
                key={item.id || index}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-muted"
              >
                <img
                  src={item.image_path}
                  alt={localizedTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-primary-foreground">{localizedTitle}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  );
}
