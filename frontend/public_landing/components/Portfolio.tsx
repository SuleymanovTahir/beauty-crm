
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  // Pre-defined categories
  const categories = [
    { id: 'all', label: t('portfolioAll', 'Все работы') },
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

  const filteredPortfolio = selectedCategory === 'all'
    ? portfolio
    : portfolio.filter(item => {
      // Map backend categories to frontend tabs if slightly different, or ensure consistency
      // Backend usually stores keys like 'portfolio' - check categories.
      // Assuming backend stores 'face', 'hair', 'nails' etc in `category` column.
      // If data comes with 'portfolio' category, we might need a sub-category or tags.
      // For now, let's assume `category` field in DB matches these IDs or we need to refine.
      // Existing DB seed might assume 'portfolio' for all.
      // Let's filter loosely or by title/desc if category is generic.
      // If category is 'portfolio' for all, this filter won't work well.
      // Let's assume the user will tag them correctly in admin panel.

      // Simple match
      if (item.category === selectedCategory) return true;

      // Fallback: Check if title/desc contains the tag
      const searchStr = (item.title + " " + item.description).toLowerCase();
      if (selectedCategory === 'face' && (searchStr.includes('face') || searchStr.includes('лиц') || searchStr.includes('чист') || searchStr.includes('уход'))) return true;
      if (selectedCategory === 'hair' && (searchStr.includes('hair') || searchStr.includes('волос') || searchStr.includes('стриж') || searchStr.includes('окраш'))) return true;
      if (selectedCategory === 'nails' && (searchStr.includes('nail') || searchStr.includes('ногт') || searchStr.includes('маник') || searchStr.includes('педик'))) return true;

      return false;
    });

  if (loading) return null;
  if (!loading && portfolio.length === 0) return null;

  return (
    <section className="py-20 bg-white" id="portfolio">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl mb-4 text-gray-900">
            {t('portfolioTitle', 'Наши')}{' '}
            <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              {t('portfolioSubtitle', 'Работы')}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('portfolioDesc', 'Примеры наших работ говорят сами за себя')}
          </p>
        </motion.div>

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
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white text-xl font-semibold">{item.title}</h3>
                    {item.description && <p className="text-white/80 text-sm mt-1">{item.description}</p>}
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
