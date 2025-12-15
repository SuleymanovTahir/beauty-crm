
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { apiClient } from "@/api/client";
import { useTranslation } from "react-i18next";

interface PortfolioItem {
  id: number;
  category: string;
  image: string;
  title: string;
  description?: string;
}

export function Portfolio() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [selectedCategory, setSelectedCategory] = useState('face');
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  // Pre-defined categories
  const categories = [
    { id: 'face', label: t('portfolioFace', 'Лицо') },
    { id: 'hair', label: t('portfolioHair', 'Волосы') },
    { id: 'nails', label: t('portfolioNails', 'Ногти') },
    { id: 'body', label: t('portfolioBody', 'Тело') },
  ];

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await apiClient.getPublicGallery(); // Gets all images
        if (data.images && data.images.length > 0) {
          const currentLang = i18n.language;
          const mappedImages = data.images.map((img: any) => ({
            id: img.id,
            category: img.category || 'other',
            image: img.image_path,
            title: img[`title_${currentLang}`] || img.title_ru || img.title || "",
            description: img[`description_${currentLang}`] || img.description_ru || img.description || ""
          }));
          setPortfolio(mappedImages);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [i18n.language]);

  const filteredPortfolio = portfolio.filter(item => {
    if (item.category === selectedCategory) return true;

    // Fallback: Check if title/desc contains the tag
    const searchStr = (item.title + " " + item.description).toLowerCase();
    if (selectedCategory === 'face' && (searchStr.includes('face') || searchStr.includes('лиц') || searchStr.includes('чист') || searchStr.includes('уход'))) return true;
    if (selectedCategory === 'hair' && (searchStr.includes('hair') || searchStr.includes('волос') || searchStr.includes('стриж') || searchStr.includes('окраш'))) return true;
    if (selectedCategory === 'nails' && (searchStr.includes('nail') || searchStr.includes('ногт') || searchStr.includes('маник') || searchStr.includes('педик'))) return true;
    if (selectedCategory === 'body' && (searchStr.includes('body') || searchStr.includes('тел') || searchStr.includes('массаж') || searchStr.includes('spa'))) return true;

    return false;
  });

  if (loading) return null;
  if (!loading && portfolio.length === 0) return null;

  return (
    <section className="py-20 bg-background" id="portfolio">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('portfolioTag') || 'Наши работы'}
          </p>
          <h2 className="text-3xl sm:text-5xl mb-6 text-[var(--heading)]">
            {t('portfolioTitle') || 'Примеры преображения'}
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            {t('portfolioDesc') || 'Вдохновитесь результатами наших мастеров'}
          </p>
        </div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-full transition-all ${selectedCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {category.label}
            </button>
          ))}
        </motion.div>

        {/* Portfolio Grid */}
        <motion.div
          layout
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {filteredPortfolio.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-muted"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-primary-foreground text-xl font-semibold">{item.title}</h3>
                    {item.description && <p className="text-primary-foreground/80 text-sm mt-1">{item.description}</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredPortfolio.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            {t('noWorksFound', 'Работы в этой категории пока не добавлены')}
          </div>
        )}
      </div>
    </section>
  );
}
