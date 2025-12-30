import { useState } from 'react';
import { Star, Heart, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { masters } from '../../../data/mockData';
import { toast } from 'sonner';

export function Masters() {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteMasters, setFavoriteMasters] = useState(
    masters.filter(m => m.isFavorite).map(m => m.id)
  );

  const toggleFavorite = (masterId: string) => {
    setFavoriteMasters(prev => 
      prev.includes(masterId) 
        ? prev.filter(id => id !== masterId)
        : [...prev, masterId]
    );
    toast.success('Избранное обновлено');
  };

  const filteredMasters = showFavoritesOnly
    ? masters.filter(m => favoriteMasters.includes(m.id))
    : masters;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1>Наши мастера</h1>
          <p className="text-muted-foreground">
            {masters.length} специалистов • {favoriteMasters.length} в избранном
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="favorites-only"
            checked={showFavoritesOnly}
            onCheckedChange={setShowFavoritesOnly}
          />
          <Label htmlFor="favorites-only">Только избранные</Label>
        </div>
      </div>

      {filteredMasters.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="mb-2">Нет избранных мастеров</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Добавьте мастеров в избранное, нажав на иконку сердца
            </p>
            <Button onClick={() => setShowFavoritesOnly(false)}>
              Показать всех мастеров
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMasters.map((master) => {
            const isFavorite = favoriteMasters.includes(master.id);

            return (
              <Card
                key={master.id}
                className={`overflow-hidden ${
                  isFavorite ? 'border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : ''
                }`}
              >
                <CardHeader className="p-0">
                  <div className="aspect-square relative">
                    <img
                      src={master.avatar}
                      alt={master.name}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className={`absolute top-4 right-4 ${
                        isFavorite
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
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{master.rating}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {master.reviews} отзывов
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      Записаться
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
          <CardTitle>Выбор мастера</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <div className="font-semibold">��росматривайте профили</div>
              <p className="text-sm text-muted-foreground">
                Изучите специализацию и рейтинг каждого мастера
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <div className="font-semibold">Добавляйте в избранное</div>
              <p className="text-sm text-muted-foreground">
                Сохраните понравившихся мастеров для быстрой записи
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div>
              <div className="font-semibold">Записывайтесь онлайн</div>
              <p className="text-sm text-muted-foreground">
                Выбирайте удобное время и подтверждайте запись
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
