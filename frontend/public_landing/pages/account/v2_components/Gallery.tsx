import { useState, useEffect } from 'react';
import { Download, Share2, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../../src/api/client';

export function Gallery() {
  const { t } = useTranslation(['account', 'common']);
  const [loading, setLoading] = useState(true);
  const [galleryData, setGalleryData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showBefore, setShowBefore] = useState(true);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientGallery();
      if (data.success) {
        setGalleryData(data);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast.error(t('common:error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const galleryItems = galleryData?.gallery || [];

  const categories = [
    { id: 'hair', label: t('gallery.hair', 'Волосы'), color: 'bg-pink-500' },
    { id: 'nails', label: t('gallery.nails', 'Ногти'), color: 'bg-purple-500' },
    { id: 'face', label: t('gallery.face', 'Лицо'), color: 'bg-blue-500' },
    { id: 'body', label: t('gallery.body', 'Тело'), color: 'bg-green-500' },
  ];

  const filteredItems = selectedCategory
    ? galleryItems.filter((item: any) => item.category === selectedCategory)
    : galleryItems;

  const handleDownload = async () => {
    if (!selectedItem) return;

    try {
      const photoUrl = showBefore ? selectedItem.before_photo : selectedItem.after_photo;
      const fileName = `beauty-${selectedItem.service}-${showBefore ? 'before' : 'after'}-${Date.now()}.jpg`;

      // Fetch the image and create a blob
      const response = await fetch(photoUrl);
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('gallery.photo_saved', 'Фото сохранено в галерею'));
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error(t('common:error_occurred', 'Произошла ошибка'));
    }
  };

  const handleShare = async () => {
    if (!selectedItem) return;

    const photoUrl = showBefore ? selectedItem.before_photo : selectedItem.after_photo;
    const shareData = {
      title: `${selectedItem.service} - ${showBefore ? t('gallery.before', 'До') : t('gallery.after', 'После')}`,
      text: `Посмотрите на результат процедуры "${selectedItem.service}" от мастера ${selectedItem.master_name}`,
      url: photoUrl
    };

    // Check if Web Share API is available
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success(t('gallery.shared', 'Успешно поделились'));
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(photoUrl);
          toast.success(t('gallery.link_copied', 'Ссылка скопирована в буфер обмена'));
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(photoUrl);
        toast.success(t('gallery.link_copied', 'Ссылка скопирована в буфер обмена'));
      } catch (error) {
        toast.error(t('common:error_occurred', 'Произошла ошибка'));
      }
    }
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
    <div className="space-y-6 pb-8">
      <div>
        <h1>{t('gallery.title', 'История красоты')}</h1>
        <p className="text-muted-foreground">{t('gallery.subtitle', 'Ваши преображения')}</p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          {t('gallery.all', 'Все')}
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
          const category = categories.find(c => c.id === item.category);

          return (
            <Card
              key={item.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedItem(item)}
            >
              <div className="aspect-square relative group">
                <img
                  src={item.after_photo}
                  alt={item.service}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-lg font-semibold mb-2">{t('gallery.before_after', 'До/После')}</div>
                    <div className="text-sm">{t('gallery.click_to_view', 'Нажмите для просмотра')}</div>
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
                  {item.master_name} • {new Date(item.date).toLocaleDateString('ru-RU')}
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
                  {t('gallery.download', 'Скачать')}
                </Button>
                <Button size="sm" variant="outline" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('gallery.share', 'Поделиться')}
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
                  {t('gallery.previous', 'Предыдущее')}
                </Button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={showBefore ? 'default' : 'outline'}
                    onClick={() => setShowBefore(true)}
                  >
                    {t('gallery.before', 'До')}
                  </Button>
                  <Button
                    size="sm"
                    variant={!showBefore ? 'default' : 'outline'}
                    onClick={() => setShowBefore(false)}
                  >
                    {t('gallery.after', 'После')}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigateItem('next')}
                >
                  {t('gallery.next', 'Следующее')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Изображение */}
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <img
                  src={showBefore ? selectedItem.before_photo : selectedItem.after_photo}
                  alt={showBefore ? t('gallery.before', 'До') : t('gallery.after', 'После')}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 text-lg px-4 py-2">
                  {showBefore ? t('gallery.before', 'До') : t('gallery.after', 'После')}
                </Badge>
              </div>

              {/* Информация */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {selectedItem.master_name}
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
