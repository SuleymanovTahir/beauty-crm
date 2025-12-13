// /frontend/public_landing/components/Portfolio.tsx
import { useState, useEffect } from "react";
import { apiClient } from "../../src/api/client";
import { useTranslation } from "react-i18next";

interface PortfolioImage {
  id: number;
  image_path: string;
  title: string;
  category: string;
}

export function Portfolio() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        console.log('🎨 Portfolio: Fetching portfolio images...');
        const data = await apiClient.getPublicGallery('portfolio');
        console.log('🎨 Portfolio: API response:', data);
        if (data.images && data.images.length > 0) {
          console.log(`🎨 Portfolio: Found ${data.images.length} images`);
          setImages(data.images);
        } else {
          console.log('🎨 Portfolio: No images found or empty array');
        }
      } catch (error) {
        console.error('❌ Portfolio: Error loading portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    console.log('🎨 Portfolio: Still loading...');
    return null;
  }
  if (images.length === 0) {
    console.log('🎨 Portfolio: No images to display, returning null');
    return null;
  }
  console.log(`🎨 Portfolio: Rendering ${images.length} images`);

  return (
    <section id="portfolio" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl mb-6 text-[var(--heading)]">
            {t('portfolioTitle') || 'Наши работы'}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('portfolioDesc') || 'Каждая работа – это произведение искусства, созданное с любовью и профессионализмом'}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 max-w-6xl mx-auto">
          {images.map((item: any, index) => {
            // Get localized title
            const localizedTitle = item[`title_${language}`] || item.title_ru || item.title;

            return (
              <div
                key={item.id || index}
                className="group relative aspect-square overflow-hidden rounded-xl md:rounded-2xl bg-muted"
              >
                <img
                  src={item.image_path}
                  alt={localizedTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
                    <p className="text-xs sm:text-base text-primary-foreground">{localizedTitle}</p>
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
