import { useState } from 'react';
import { Star, Heart, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function Masters({ masters }: any) {
  const { t } = useTranslation(['account/masters', 'common']);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Use masters prop or default empty array
  const masterList = masters || [];

  // Manage favorites locally for now (replace with actual API later)
  // Assuming 'isFavorite' might come from API or defaults to false
  const [favoriteMasters, setFavoriteMasters] = useState<string[]>(
    masterList.filter((m: any) => m.isFavorite).map((m: any) => m.id)
  );

  const toggleFavorite = (masterId: string) => {
    setFavoriteMasters(prev =>
      prev.includes(masterId)
        ? prev.filter(id => id !== masterId)
        : [...prev, masterId]
    );
    // In real app, call API here
    toast.success(t('favorites_updated'));
  };

  const filteredMasters = showFavoritesOnly
    ? masterList.filter((m: any) => favoriteMasters.includes(m.id))
    : masterList;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle', { count: masterList.length, favorites: favoriteMasters.length })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="favorites-only"
            checked={showFavoritesOnly}
            onCheckedChange={setShowFavoritesOnly}
          />
          <Label htmlFor="favorites-only">{t('favorites_only')}</Label>
        </div>
      </div>

      {filteredMasters.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="mb-2">{t('no_masters')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {showFavoritesOnly ? t('add_favorites_desc') : t('no_masters_desc')}
            </p>
            {showFavoritesOnly && (
              <Button onClick={() => setShowFavoritesOnly(false)}>
                {t('show_all')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMasters.map((master: any) => {
            const isFavorite = favoriteMasters.includes(master.id);

            return (
              <Card
                key={master.id}
                className={`overflow-hidden ${isFavorite ? 'border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : ''
                  }`}
              >
                <CardHeader className="p-0">
                  <div className="aspect-square relative">
                    <img
                      src={master.avatar || `https://ui-avatars.com/api/?name=${master.name}&background=random`}
                      alt={master.name}
                      className="w-full h-full object-cover"
                    />
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
                    <CardDescription>{master.specialty || t('master_title')}</CardDescription>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{master.rating || '5.0'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {master.reviews || 0} {t('reviews')}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('book_button')}
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
          <CardTitle>{t('choose_master_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <div className="font-semibold">{t('step_1_title')}</div>
              <p className="text-sm text-muted-foreground">
                {t('step_1_desc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <div className="font-semibold">{t('step_2_title')}</div>
              <p className="text-sm text-muted-foreground">
                {t('step_2_desc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div>
              <div className="font-semibold">{t('step_3_title')}</div>
              <p className="text-sm text-muted-foreground">
                {t('step_3_desc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
