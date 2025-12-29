import { useState } from 'react';
import { Star, Heart, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
// import { masters } from '../data/mockData';
import { toast } from 'sonner';

export function Masters({ masters = [] }: any) {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteMasters, setFavoriteMasters] = useState<string[]>([]);

  // Initialize favorites from masters if needed, or manage separately. 
  // For now assuming isFavorite property exists on masters.
  // Using useEffect to sync if masters change or simply rendering.

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Наши мастера</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {masters.length} лучших специалистов • {favoriteMasters.length} в избранном
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <Switch
            id="favorites-only"
            checked={showFavoritesOnly}
            onCheckedChange={setShowFavoritesOnly}
          />
          <Label htmlFor="favorites-only" className="cursor-pointer font-medium text-gray-700">Только избранные</Label>
        </div>
      </div>

      {filteredMasters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Heart className="w-16 h-16 text-pink-200 mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Нет избранных мастеров</h3>
          <p className="text-gray-500 mb-6 text-center max-w-md">
            Отмечайте мастеров сердечком, чтобы они появились в этом списке для быстрой записи
          </p>
          <Button onClick={() => setShowFavoritesOnly(false)} variant="outline" className="border-pink-200 text-pink-600 hover:bg-pink-50">
            Показать всех
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMasters.map((master) => {
            const isFavorite = favoriteMasters.includes(master.id);

            return (
              <div
                key={master.id}
                className="group relative bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image & Favorite Button */}
                <div className="h-64 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <img
                    src={master.avatar}
                    alt={master.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <Button
                    size="icon"
                    className={`absolute top-4 right-4 z-20 rounded-full w-10 h-10 shadow-lg transition-transform active:scale-95 ${isFavorite
                      ? 'bg-pink-500 hover:bg-pink-600 text-white'
                      : 'bg-white/90 hover:bg-white text-gray-500 hover:text-pink-500'
                      }`}
                    onClick={() => toggleFavorite(master.id)}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </Button>

                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <h3 className="text-xl font-bold text-white">{master.name}</h3>
                    <p className="text-white/80">{master.job_title || 'Специалист'}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center text-yellow-500 font-bold bg-yellow-50 px-2 py-1 rounded-md">
                      <Star className="w-4 h-4 fill-current mr-1" />
                      {master.rating || '5.0'}
                    </div>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500">{master.reviews_count || 120} отзывов</span>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl">Записаться</Button>
                    <Button variant="outline" className="rounded-xl border-gray-200">Профиль</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
