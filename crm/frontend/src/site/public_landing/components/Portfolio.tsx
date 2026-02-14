import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { getApiUrl } from "../utils/apiUtils";
import { safeFetch } from "../utils/errorHandler";
import { buildApiUrl } from "@crm/api/client";

interface PortfolioItem {
  id: number;
  category: string;
  image_path: string;
  title: string;
  description?: string;
}

export function Portfolio() {
  const { t, i18n } = useTranslation(['public_landing', 'common', 'dynamic']);
  const [selectedCategory, setSelectedCategory] = useState('all'); // Показываем все
  const [displayCount, setDisplayCount] = useState(12);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Временно: показываем все портфолио без подкатегорий
  // TODO: Добавить subcategory в gallery_images для фильтрации по типу работ
  const categories = [
    { id: 'all', label: t('portfolioAll') },
  ];

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        // Используем относительный путь для работы через Vite proxy
        const API_URL = getApiUrl();
        const res = await safeFetch(buildApiUrl(`/api/public/gallery?category=portfolio&language=${i18n.language}&t=${Date.now()}`, API_URL));
        const data = await res.json();

        if (data.images && data.images.length > 0) {
          const mappedImages = data.images.map((img: any) => ({
            id: img.id,
            category: 'portfolio', // Все изображения из portfolio
            image_path: img.image_path,
            title: t(`dynamic:public_gallery.${img.id}.title`, { defaultValue: img.title || "" }),
            description: t(`dynamic:public_gallery.${img.id}.description`, { defaultValue: img.description || "" })
          }));
          setPortfolio(mappedImages);
        } else {
          setPortfolio([]);
        }
      } catch (error) {
        console.error('❌ [Portfolio] Error loading portfolio:', error);
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [i18n.language]);

  // Показываем все портфолио (без фильтрации по подкатегориям)
  const filteredPortfolio = selectedCategory === 'all' ? portfolio : portfolio.filter(item => item.category === selectedCategory);

  const displayedItems = filteredPortfolio.slice(0, displayCount);

  if (loading) {
    return null; // Or loading spinner
  }

  // If no items, maybe show empty state or just null. Ref shows 'noWorksFound'.
  // But since we have categories, we might have items in OTHER categories.
  // If TOTAL portfolio is 0, show empty message instead of hiding section
  if (portfolio.length === 0) {
    return (
      <section className="py-12 sm:py-16 lg:py-20 bg-background" id="portfolio">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
              {t('portfolioTag')}
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
              {t('portfolioTitlePart1')} <span className="text-primary">{t('portfolioTitlePart2')}</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
              {t('noWorksFound')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background" id="portfolio">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('portfolioTag')}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('portfolioTitlePart1')} <span className="text-primary">{t('portfolioTitlePart2')}</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('portfolioDesc')}
          </p>
        </div>

        <motion.div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setDisplayCount(12);
              }}
              className={`portfolio-filter-button ${selectedCategory === category.id ? 'portfolio-filter-button-active' : ''}`}
            >
              {category.label}
            </button>
          ))}
        </motion.div>

        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          <AnimatePresence>
            {displayedItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
                className="portfolio-item"
              >
                <img
                  src={item.image_path && !item.image_path.startsWith('http') ? `${getApiUrl()}${item.image_path.startsWith('/') ? '' : '/'}${item.image_path}` : item.image_path}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onLoad={(e) => console.log(`[Portfolio] Image loaded successfully: ${(e.target as HTMLImageElement).src}`)}
                  onError={(e) => console.error(`[Portfolio] Image failed to load: ${(e.target as HTMLImageElement).src}`)}
                />
                <div className="portfolio-overlay">
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 lg:p-4">
                    <h3 className="text-primary-foreground text-xs sm:text-sm lg:text-base line-clamp-2">{item.title}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {displayedItems.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            {t('noWorksFound')}
          </div>
        )}

        {displayCount < filteredPortfolio.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 12, filteredPortfolio.length))}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              {t('showMore')} ({filteredPortfolio.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
