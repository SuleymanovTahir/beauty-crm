import { useState } from 'react';
import { Download, Share2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function Gallery({ gallery, masters }: any) {
  const { t } = useTranslation(['account/gallery', 'common']);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const galleryItems = gallery || []; // Use prop or empty array
  const masterList = masters || []; // Use prop or empty array

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showBefore, setShowBefore] = useState(true);

  const categories = [
    { id: 'hair', label: t('category_hair'), color: 'bg-pink-500' },
    { id: 'nails', label: t('category_nails'), color: 'bg-purple-500' },
    { id: 'face', label: t('category_face'), color: 'bg-blue-500' },
    { id: 'body', label: t('category_body'), color: 'bg-green-500' },
  ];

  const filteredItems = selectedCategory
    ? galleryItems.filter((item: any) => item.category === selectedCategory)
    : galleryItems;

  const handleDownload = () => {
    toast.success(t('photo_saved'));
  };

  const handleShare = () => {
    toast.success(t('link_copied'));
  };

  const navigateItem = (direction: 'prev' | 'next') => {
    if (!selectedItem) return;
    const currentIndex = filteredItems.findIndex((item: any) => item.id === selectedItem.id);
    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + filteredItems.length) % filteredItems.length
      : (currentIndex + 1) % filteredItems.length;
    setSelectedItem(filteredItems[newIndex]);
    setShowBefore(true);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          {t('filter_all')}
        </Button>
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Галерея */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item: any) => {
          const master = masterList.find((m: any) => m.id === item.masterId);
          const category = categories.find(c => c.id === item.category);

          return (
            <Card
              key={item.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedItem(item)}
            >
              <div className="aspect-square relative group">
                <img
                  src={item.after}
                  alt={item.service}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-lg font-semibold mb-2">{t('before_after')}</div>
                    <div className="text-sm">{t('click_to_view')}</div>
                  </div>
                </div>
                {category && (
                  <Badge className={`absolute top-2 right-2 ${category.color}`}>
                    {category.label}
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="font-semibold">{item.service}</div>
                <div className="text-sm text-muted-foreground">
                  {master?.name} • {new Date(item.date).toLocaleDateString('ru-RU')}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Модальное окно до/после */}
      <Dialog open={selectedItem !== null} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedItem?.service}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('download')}
                </Button>
                <Button size="sm" variant="outline" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('share')}
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
                  {t('previous')}
                </Button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={showBefore ? 'default' : 'outline'}
                    onClick={() => setShowBefore(true)}
                  >
                    {t('before')}
                  </Button>
                  <Button
                    size="sm"
                    variant={!showBefore ? 'default' : 'outline'}
                    onClick={() => setShowBefore(false)}
                  >
                    {t('after')}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigateItem('next')}
                >
                  {t('next')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Изображение */}
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <img
                  src={showBefore ? selectedItem.before : selectedItem.after}
                  alt={showBefore ? t('before') : t('after')}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 text-lg px-4 py-2">
                  {showBefore ? t('before') : t('after')}
                </Badge>
              </div>

              {/* Информация */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {masterList.find((m: any) => m.id === selectedItem.masterId)?.name}
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
      </Dialog>
    </div>
  );
}
