import { motion } from 'motion/react';
import { useState } from 'react';
import { mockPortfolioImages } from '../../utils/mockData';

const categories = [
  { id: 'face', label: 'Лицо' },
  { id: 'hair', label: 'Волосы' },
  { id: 'nails', label: 'Ногти' },
  { id: 'body', label: 'Тело' },
];

export function Portfolio() {
  const [selectedCategory, setSelectedCategory] = useState('face');
  const [displayCount, setDisplayCount] = useState(12);

  const filteredPortfolio = mockPortfolioImages.filter(item => item.category === selectedCategory);
  const displayedItems = filteredPortfolio.slice(0, displayCount);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background" id="portfolio">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Наши работы
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Примеры преображения
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            Вдохновитесь результатами наших мастеров
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
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all text-sm sm:text-base ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {category.label}
            </button>
          ))}
        </motion.div>

        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {displayedItems.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
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
        </motion.div>

        {displayCount < filteredPortfolio.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 12, filteredPortfolio.length))}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              Показать еще ({filteredPortfolio.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
