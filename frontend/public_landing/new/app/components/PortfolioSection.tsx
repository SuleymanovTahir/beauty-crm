import { motion } from 'motion/react';
import { useState } from 'react';

export function PortfolioSection() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'Все работы' },
    { id: 'face', label: 'Лицо' },
    { id: 'hair', label: 'Волосы' },
    { id: 'nails', label: 'Ногти' },
  ];

  const portfolio = [
    { id: 1, category: 'face', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600', title: 'Чистка лица' },
    { id: 2, category: 'face', image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600', title: 'Уход за кожей' },
    { id: 3, category: 'hair', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600', title: 'Окрашивание' },
    { id: 4, category: 'hair', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600', title: 'Укладка' },
    { id: 5, category: 'nails', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600', title: 'Маникюр' },
    { id: 6, category: 'nails', image: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=600', title: 'Дизайн ногтей' },
    { id: 7, category: 'face', image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600', title: 'Массаж лица' },
    { id: 8, category: 'hair', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600', title: 'Стрижка' },
  ];

  const filteredPortfolio = selectedCategory === 'all' 
    ? portfolio 
    : portfolio.filter(item => item.category === selectedCategory);

  return (
    <section className="py-20 bg-background" id="portfolio">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl mb-4 text-foreground">
            Наши{' '}
            <span className="text-primary">
              Работы
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Примеры наших работ говорят сами за себя
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
              className={`px-6 py-3 rounded-full transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
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
          {filteredPortfolio.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
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
                  <h3 className="text-primary-foreground text-xl font-semibold">{item.title}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}