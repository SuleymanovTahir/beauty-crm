import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Calendar, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@crm/api/client';

export function Masters() {
  const { t, i18n } = useTranslation(['account', 'common']);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mastersData, setMastersData] = useState<any>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const language = i18n.language?.slice(0, 2) || 'ru';

  useEffect(() => {
    loadMasters();
  }, [language]);

  const loadMasters = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getFavoriteMasters(language);
      if (data.success) {
        setMastersData(data);
      }
    } catch (error) {
      console.error('Error loading masters:', error);
      toast.error(t('common:error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (masterId: number) => {
    try {
      const result = await apiClient.toggleFavoriteMaster({ master_id: masterId, is_favorite: false });
      if (result.success) {
        await loadMasters(); // Reload data
        toast.success(t('masters.favorite_updated', 'Избранное обновлено'));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const masters = mastersData?.masters || [];
  const favoriteMasters = masters.filter((m: any) => m.is_favorite);

  const filteredMasters = showFavoritesOnly
    ? favoriteMasters
    : masters;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1>{t('masters.title', 'Наши мастера')}</h1>
          <p className="text-muted-foreground">
            {masters.length} {t('masters.specialists', 'специалистов')} • {favoriteMasters.length} {t('masters.in_favorites', 'в избранном')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="favorites-only"
            checked={showFavoritesOnly}
            onCheckedChange={setShowFavoritesOnly}
          />
          <Label htmlFor="favorites-only">{t('masters.favorites_only', 'Только избранные')}</Label>
        </div>
      </div>

      {filteredMasters.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            {showFavoritesOnly ? (
              <>
                <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">{t('masters.no_favorites', 'Нет избранных мастеров')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('masters.add_favorites_hint', 'Добавьте мастеров в избранное, нажав на иконку сердца')}
                </p>
                <Button onClick={() => setShowFavoritesOnly(false)}>
                  {t('masters.show_all', 'Показать всех мастеров')}
                </Button>
              </>
            ) : (
              <>
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">{t('masters.no_masters', 'Мастера пока не добавлены')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('masters.no_masters_hint', 'Скоро здесь появится список наших специалистов')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMasters.map((master: any) => {
            const isFavorite = master.is_favorite;

            return (
              <Card
                key={master.id}
                className={`overflow-hidden ${isFavorite ? 'border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : ''
                  }`}
              >
                <CardHeader className="p-0">
                  <div className="aspect-square relative">
                    <Avatar className="w-full h-full rounded-none">
                      <AvatarImage
                        src={master.photo}
                        alt={master.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-4xl rounded-none">
                        {master.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className={`absolute top-4 right-4 ${isFavorite
                        ? 'bg-pink-500 hover:bg-pink-600 text-white'
                        : 'bg-white/90 hover:bg-white'
                        }`}
                      onClick={() => toggleFavorite(master.id)}
                    >
                      <Heart
                        className={`w-5 h-5 ${isFavorite ? 'fill-white' : ''}`}
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <CardTitle className="mb-2">{master.name}</CardTitle>
                    <CardDescription>{master.specialty}</CardDescription>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-bold text-yellow-700">{master.rating || '5.0'}</span>
                    </div>
                    {master.reviews_count > 0 && (
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        ({master.reviews_count} {t('masters.reviews', 'отзывов')})
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => navigate('/new-booking', { state: { prefillMaster: master.id } })}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('masters.book', 'Записаться')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Дополнительная информация */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle>{t('masters.choosing_master', 'Выбор мастера')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <div className="font-semibold">{t('masters.step1_title', 'Просматривайте профили')}</div>
              <p className="text-sm text-muted-foreground">
                {t('masters.step1_text', 'Изучите специализацию и рейтинг каждого мастера')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <div className="font-semibold">{t('masters.step2_title', 'Добавляйте в избранное')}</div>
              <p className="text-sm text-muted-foreground">
                {t('masters.step2_text', 'Сохраните понравившихся мастеров для быстрой записи')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div>
              <div className="font-semibold">{t('masters.step3_title', 'Записывайтесь онлайн')}</div>
              <p className="text-sm text-muted-foreground">
                {t('masters.step3_text', 'Выбирайте удобное время и подтверждайте запись')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
