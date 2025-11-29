import { useState, useEffect } from "react";
import { apiClient } from "../../../src/api/client";
import { useLanguage } from "../LanguageContext";
import { Button } from "../../../components/ui/button";
import { Calendar } from "lucide-react";

interface GalleryImage {
  id: number;
  image_path: string;
  title: string;
}

export function Gallery() {
  const { t, language } = useLanguage();
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
    <section id="gallery" className="py-16 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('galleryTag', { defaultValue: 'Наш салон' })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('galleryTitle', { defaultValue: 'Атмосфера роскоши и комфорта' })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70">
            {t('galleryDesc', { defaultValue: 'Современный интерьер в светлых тонах создает атмосферу спокойствия и элегантности' })}
          </p>
        </div>

        {/* Optimized Grid - Smaller images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {images.map((item: any, index) => {
            const localizedTitle = item[`title_${language}`] || item.title_ru || item.title;

            return (
              <div
                key={item.id || index}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl sm:rounded-2xl bg-muted shadow-md hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={item.image_path}
                  alt={localizedTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <p className="text-base sm:text-lg text-primary-foreground">{localizedTitle}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-8 sm:mt-12 space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('galleryCallToAction', { defaultValue: 'Приходите и убедитесь сами в нашем комфорте и качестве!' })}
          </p>
          <Button
            onClick={() => {
              document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 sm:px-12 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            size="lg"
          >
            <Calendar className="w-5 h-5" />
            {t('bookNow', { defaultValue: "Забронировать визит" })}
          </Button>
        </div>
      </div>
    </section>
  );
}
