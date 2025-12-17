import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Heart, Scissors, Droplet, Zap, Eye, ShoppingBag, Star } from 'lucide-react';

export function ServicesSection() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Все услуги', icon: Sparkles },
    { id: 'face', label: 'Лицо', icon: Heart },
    { id: 'body', label: 'Тело', icon: Droplet },
    { id: 'hair', label: 'Волосы', icon: Scissors },
    { id: 'nails', label: 'Ногти', icon: Star },
    { id: 'cosmetology', label: 'Косметология', icon: Zap },
  ];

  const services = [
    // Face
    { id: 1, name: 'Чистка лица', category: 'face', price: 'от 3500', duration: '60 мин', popular: true },
    { id: 2, name: 'Пилинг', category: 'face', price: 'от 4000', duration: '45 мин', popular: false },
    { id: 3, name: 'Массаж лица', category: 'face', price: 'от 2500', duration: '40 мин', popular: true },
    { id: 4, name: 'Маски для лица', category: 'face', price: 'от 2000', duration: '30 мин', popular: false },
    { id: 5, name: 'Уход за кожей', category: 'face', price: 'от 3000', duration: '50 мин', popular: false },
    { id: 6, name: 'Лифтинг', category: 'face', price: 'от 5000', duration: '60 мин', popular: false },
    
    // Body
    { id: 7, name: 'Массаж тела', category: 'body', price: 'от 4000', duration: '90 мин', popular: true },
    { id: 8, name: 'Обертывание', category: 'body', price: 'от 3500', duration: '60 мин', popular: false },
    { id: 9, name: 'SPA-программы', category: 'body', price: 'от 6000', duration: '120 мин', popular: true },
    { id: 10, name: 'Антицеллюлитный массаж', category: 'body', price: 'от 4500', duration: '60 мин', popular: false },
    { id: 11, name: 'Скрабирование', category: 'body', price: 'от 2500', duration: '40 мин', popular: false },
    
    // Hair
    { id: 12, name: 'Стрижка', category: 'hair', price: 'от 2000', duration: '45 мин', popular: true },
    { id: 13, name: 'Окрашивание', category: 'hair', price: 'от 5000', duration: '120 мин', popular: true },
    { id: 14, name: 'Укладка', category: 'hair', price: 'от 1500', duration: '30 мин', popular: false },
    { id: 15, name: 'Ламинирование', category: 'hair', price: 'от 4000', duration: '90 мин', popular: false },
    { id: 16, name: 'Ботокс для волос', category: 'hair', price: 'от 4500', duration: '90 мин', popular: false },
    
    // Nails
    { id: 17, name: 'Маникюр', category: 'nails', price: 'от 1500', duration: '60 мин', popular: true },
    { id: 18, name: 'Педикюр', category: 'nails', price: 'от 2000', duration: '75 мин', popular: true },
    { id: 19, name: 'Наращивание ногтей', category: 'nails', price: 'от 3000', duration: '120 мин', popular: false },
    { id: 20, name: 'Гель-лак', category: 'nails', price: 'от 1800', duration: '60 мин', popular: true },
    { id: 21, name: 'Дизайн ногтей', category: 'nails', price: 'от 500', duration: '30 мин', popular: false },
    
    // Cosmetology
    { id: 22, name: 'Мезотерапия', category: 'cosmetology', price: 'от 5000', duration: '60 мин', popular: true },
    { id: 23, name: 'Биоревитализация', category: 'cosmetology', price: 'от 6000', duration: '45 мин', popular: true },
    { id: 24, name: 'Контурная пластика', category: 'cosmetology', price: 'от 8000', duration: '60 мин', popular: false },
    { id: 25, name: 'Ботокс', category: 'cosmetology', price: 'от 7000', duration: '45 мин', popular: false },
    { id: 26, name: 'Лазерное омоложение', category: 'cosmetology', price: 'от 6500', duration: '60 мин', popular: false },
  ];

  const filteredServices = services.filter((service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.icon : Sparkles;
  };

  return (
    <section className="py-20 bg-background" id="services">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl mb-4 text-foreground">
            Наши <span className="text-primary">Услуги</span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Широкий спектр профессиональных услуг для вашей красоты
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск услуг..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-muted border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all transform hover:scale-105 ${
                    selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Services Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory + searchQuery}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredServices.map((service, index) => {
              const Icon = getCategoryIcon(service.category);
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-card rounded-2xl border border-border p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {service.popular && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                      Популярно
                    </div>
                  )}

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary transition-all">
                      <Icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">{service.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-semibold text-primary">
                      {service.price}
                    </div>
                    <button className="px-4 py-2 bg-muted text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors">
                      Записаться
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filteredServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground/70">Услуги не найдены. Попробуйте изменить параметры поиска.</p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-foreground/70 mb-4">Не нашли нужную услугу?</p>
          <button className="px-8 py-4 bg-primary text-primary-foreground rounded-full hover:shadow-xl transition-all transform hover:scale-105">
            Связаться с нами
          </button>
        </motion.div>
      </div>
    </section>
  );
}