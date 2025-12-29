import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Share2, Download, ZoomIn, ArrowRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';

export function Gallery({ gallery, masters }: any) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const items = gallery || [];
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null);
  const [showBefore, setShowBefore] = useState(true);

  const categories = [
    { id: 'hair', label: 'Волосы', color: 'bg-pink-500' },
    { id: 'nails', label: 'Ногти', color: 'bg-purple-500' },
    { id: 'face', label: 'Лицо', color: 'bg-blue-500' },
    { id: 'body', label: 'Тело', color: 'bg-green-500' },
  ];

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((item: any) => item.category === selectedCategory);

  const handleDownload = () => {
    toast.success('Фото сохранено в галерею');
  };

  const handleShare = () => {
    toast.success('Ссылка скопирована в буфер обмена');
  };

  const navigateItem = (direction: 'prev' | 'next') => {
    if (!selectedItem) return;
    const currentIndex = filteredItems.findIndex(item => item.id === selectedItem.id);
    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + filteredItems.length) % filteredItems.length
      : (currentIndex + 1) % filteredItems.length;
    setSelectedItem(filteredItems[newIndex]);
    setShowBefore(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent inline-block">
            История красоты
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Ваши невероятные преображения</p>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-xl border border-white/20 shadow-sm backdrop-blur-sm">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-white'}
          >
            Все
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id
                ? `${cat.color} text-white shadow-md`
                : 'text-gray-600 hover:bg-white'}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Галерея */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item: any, index: number) => {
          const m = masters?.find((master: any) => master.id === item.masterId);
          const category = categories.find(c => c.id === item.category);

          return (
            <div
              key={item.id || index}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gray-100 aspect-square"
              onClick={() => setSelectedItem(item)}
            >
              <img
                src={item.after}
                alt={item.service}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {category && (
                    <Badge className="mb-2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-none">
                      {category.label}
                    </Badge>
                  )}
                  <h3 className="font-bold text-white text-lg">{item.service}</h3>
                  <div className="flex items-center gap-2 mt-2 text-white/80 text-sm">
                    <span>{m?.name || 'Мастер'}</span>
                    <span>•</span>
                    <span>{new Date(item.date).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white hover:text-pink-600 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно до/после */}
      < Dialog open={selectedItem !== null} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedItem?.service}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
                <Button size="sm" variant="outline" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Поделиться
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Навигация */}
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigateItem('prev')}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Предыдущее
                </Button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={showBefore ? 'default' : 'outline'}
                    onClick={() => setShowBefore(true)}
                  >
                    До
                  </Button>
                  <Button
                    size="sm"
                    variant={!showBefore ? 'default' : 'outline'}
                    onClick={() => setShowBefore(false)}
                  >
                    После
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigateItem('next')}
                >
                  Следующее
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Изображение */}
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <img
                  src={showBefore ? selectedItem.before : selectedItem.after}
                  alt={showBefore ? 'До' : 'После'}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 text-lg px-4 py-2">
                  {showBefore ? 'До' : 'После'}
                </Badge>
              </div>

              {/* Информация */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {masters.find(m => m.id === selectedItem.masterId)?.name}
                </span>
                <span>
                  {new Date(selectedItem.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog >
    </div >
  );
}
