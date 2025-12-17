import { useState, useMemo } from 'react';
import { Search, Clock, Hand, Scissors, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { mockServices } from '../../utils/mockData';

export function Services() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [displayCount, setDisplayCount] = useState(12);

  const categories = useMemo(() => {
    const cats = new Set(mockServices.map(s => s.category));
    return Array.from(cats).sort();
  }, []);

  const filteredServices = useMemo(() => {
    return mockServices.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const displayedServices = filteredServices.slice(0, displayCount);

  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + 12, filteredServices.length));
  };

  return (
    <section id="services" className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 max-w-7xl">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3 text-primary">
            Наши услуги
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Выберите свою услугу
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">
            Мы предлагаем широкий спектр премиальных услуг красоты.
          </p>
        </div>

        <Card className="p-3 sm:p-4 lg:p-6 border-pink-100 shadow-lg mb-8 sm:mb-12">
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Поиск услуги..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-pink-200 focus:border-primary w-full rounded-full text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === '' ? "default" : "outline"}
              onClick={() => setSelectedCategory('')}
              className={`whitespace-nowrap flex-shrink-0 text-xs h-8 ${
                selectedCategory === ''
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "border-pink-200 text-gray-700 hover:bg-pink-50"
              }`}
            >
              Все
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap flex-shrink-0 text-xs h-8 ${
                  selectedCategory === category
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "border-pink-200 text-gray-700 hover:bg-pink-50"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="mt-3 text-xs sm:text-sm text-gray-600 text-center">
            Найдено услуг: <span className="font-semibold text-primary">{filteredServices.length}</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {displayedServices.map((service) => (
            <div
              key={service.id}
              className="p-3 sm:p-4 rounded-xl border border-pink-100 hover:border-pink-300 hover:shadow-lg transition-all bg-white group flex flex-col"
            >
              <h4 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-2 mb-2">
                {service.name}
              </h4>
              {service.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 mb-2 flex-grow">{service.description}</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-2">
                {service.duration && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{service.duration} мин</span>
                  </div>
                )}
                <div className="text-base sm:text-lg font-bold text-primary whitespace-nowrap">
                  {service.min_price && service.max_price ?
                    `${service.min_price}-${service.max_price}` :
                    service.price} {service.currency}
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayCount < filteredServices.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={handleLoadMore}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              Показать еще ({filteredServices.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
