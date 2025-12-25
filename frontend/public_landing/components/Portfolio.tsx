import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";

interface PortfolioItem {
  id: number;
  category: string;
  image_path: string;
  title: string;
  description?: string;
}

export function Portfolio() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [selectedCategory, setSelectedCategory] = useState('face');
  const [displayCount, setDisplayCount] = useState(12);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-defined categories with translations
  const categories = [
    { id: 'face', label: t('portfolioFace', { defaultValue: 'Лицо' }) },
    { id: 'hair', label: t('portfolioHair', { defaultValue: 'Волосы' }) },
    { id: 'nails', label: t('portfolioNails', { defaultValue: 'Ногти' }) },
    { id: 'body', label: t('portfolioBody', { defaultValue: 'Тело' }) },
  ];

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        // Adjust endpoint if needed. Reference used apiClient.getPublicGallery().
        // Assuming endpoint is /api/public/gallery or similar.
        const res = await fetch(`${API_URL}/api/public/gallery?language=${i18n.language}`);
        const data = await res.json();

        if (data.images && data.images.length > 0) {
          const currentLang = i18n.language;
          const mappedImages = data.images.map((img: any) => ({
            id: img.id,
            category: img.category || 'other',
            image_path: img.image_path, // Note: reference used 'image' prop in interface but mapped 'image_path'. new uses 'image_path'. I'll stick to 'image_path'.
            title: img[`title_${currentLang}`] || img.title_ru || img.title || "",
            description: img[`description_${currentLang}`] || img.description_ru || img.description || ""
          }));
          setPortfolio(mappedImages);
        } else {
          setPortfolio([]);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [i18n.language]);

  const filteredPortfolio = portfolio.filter(item => {
    // Exact match for category
    if (item.category === selectedCategory) return true;

    // Fallback: Check if title/desc contains the tag (copied from Ref)
    const searchStr = (item.title + " " + item.description).toLowerCase();
    if (selectedCategory === 'face' && (searchStr.includes('face') || searchStr.includes('лиц') || searchStr.includes('чист') || searchStr.includes('уход'))) return true;
    if (selectedCategory === 'hair' && (searchStr.includes('hair') || searchStr.includes('волос') || searchStr.includes('стриж') || searchStr.includes('окраш'))) return true;
    if (selectedCategory === 'nails' && (searchStr.includes('nail') || searchStr.includes('ногт') || searchStr.includes('маник') || searchStr.includes('педик'))) return true;
    if (selectedCategory === 'body' && (searchStr.includes('body') || searchStr.includes('тел') || searchStr.includes('массаж') || searchStr.includes('spa'))) return true;

    return false;
  });

  const displayedItems = filteredPortfolio.slice(0, displayCount);

  if (loading) {
    return null; // Or loading spinner
  }

  // If no items, maybe show empty state or just null. Ref shows 'noWorksFound'.
  // But since we have categories, we might have items in OTHER categories. 
  // If TOTAL portfolio is 0, return null.
  if (portfolio.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background" id="portfolio">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('portfolioTag', { defaultValue: 'Наши работы' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('portfolioTitle', { defaultValue: 'Примеры преображения' })}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('portfolioDesc', { defaultValue: 'Вдохновитесь результатами наших мастеров' })}
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
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all text-sm sm:text-base ${selectedCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-background border border-primary/20 text-primary hover:bg-primary/10'
                }`}
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
                className="group relative aspect-square rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden cursor-pointer bg-muted"
              >
                <img
                  src={item.image_path}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
            {t('noWorksFound', { defaultValue: 'Работы в этой категории пока не добавлены' })}
          </div>
        )}

        {displayCount < filteredPortfolio.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 12, filteredPortfolio.length))}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              {t('loading', { defaultValue: 'Показать еще' })} ({filteredPortfolio.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
