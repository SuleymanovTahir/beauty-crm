// /frontend/public_landing/components/Gallery.tsx
import { useState, useEffect } from "react";
import { apiClient } from "../../src/api/client";
import { useTranslation } from "react-i18next";

interface GalleryImage {
  id: number;
  image_path: string;
  title: string;
}

export function Gallery() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const data = await apiClient.getPublicGallery('salon');
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        }
      } catch (error) {
        console.error('Error loading gallery:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) return null;
  if (images.length === 0) return null;

  return (
    <section id="gallery" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('galleryTag') || 'Наш салон'}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('galleryTitle') || 'Атмосфера роскоши и комфорта'}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('galleryDesc') || 'Современный интерьер в светлых тонах создает атмосферу спокойствия и элегантности'}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6 max-w-5xl mx-auto">
          {images.map((item: any, index) => {
            // Get localized title
            const localizedTitle = item[`title_${language}`] || item.title_ru || item.title;

            return (
              <div
                key={item.id || index}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"
              >
                <img
                  src={item.image_path}
                  alt={localizedTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
                    <p className="text-xs sm:text-lg text-primary-foreground">{localizedTitle}</p>
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
