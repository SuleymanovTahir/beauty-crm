import { useState, useEffect } from "react";
import { apiClient } from "../../app/api/client";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";

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
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

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
    <section id="portfolio" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('portfolioTitle') || 'Наши работы'}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
            {t('portfolioDesc') || 'Каждая работа – это произведение искусства, созданное с любовью и профессионализмом'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-6xl mx-auto">
          {images.map((item: any, index) => {
            const localizedTitle = item[`title_${language}`] || item.title_ru || item.title;

            return (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-muted shadow-md hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={item.image_path}
                  alt={localizedTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6">
                    <p className="text-xs sm:text-sm lg:text-base text-primary-foreground font-medium">{localizedTitle}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
