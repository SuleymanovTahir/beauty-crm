import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { getApiUrl } from "../utils/apiUtils";
import { safeFetch } from "../utils/errorHandler";
import { buildApiUrl } from "@crm/api/client";

interface GalleryImage {
  id: number;
  image_path: string;
  title: string;
}

export function Gallery() {
  const { t, i18n } = useTranslation(['public_landing', 'common', 'dynamic']);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [displayCount, setDisplayCount] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const API_URL = getApiUrl();
        // Fetch salon category images
        const res = await safeFetch(buildApiUrl(`/api/public/gallery?category=salon&language=${i18n.language}`, API_URL));
        const data = await res.json();

        if (data.images && data.images.length > 0) {
          const mapped = data.images.map((item: any) => ({
            id: item.id,
            image_path: item.image_path,
            title: t(`dynamic:public_gallery.${item.id}.title`, { defaultValue: item.title || "" })
          }));
          setImages(mapped);
        } else {
          setImages([]);
        }
      } catch (error) {
        console.error('Error loading gallery:', error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [i18n.language]);

  const displayedImages = images.slice(0, displayCount);

  if (loading) return null;
  if (images.length === 0) return null;

  return (
    <section id="gallery" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('galleryTag')}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('galleryTitlePart1')} <span className="text-primary">{t('galleryTitlePart2')}</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('galleryDesc')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-w-6xl mx-auto">
          {displayedImages.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-lg sm:rounded-xl bg-muted"
            >
              <img
                src={item.image_path && !item.image_path.startsWith('http') ? `${getApiUrl()}${item.image_path.startsWith('/') ? '' : '/'}${item.image_path}` : item.image_path}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => console.error(`[Gallery] Image failed to load: ${(e.target as HTMLImageElement).src}`)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-primary-foreground line-clamp-2">{item.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayCount < images.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 12, images.length))}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              {t('showMore')} ({images.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
