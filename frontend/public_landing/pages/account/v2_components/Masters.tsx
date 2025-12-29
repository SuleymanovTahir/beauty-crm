import { useState } from 'react';
import { Star, Heart, Search, Users } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent inline-block">
            Наши мастера
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Профессионалы, готовые подчеркнуть вашу красоту</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-gray-50/50 p-2 rounded-2xl border border-gray-100 w-full md:w-fit">
        <Button
          variant={showFavoritesOnly ? "ghost" : "default"}
          onClick={() => setShowFavoritesOnly(false)}
          className={`rounded-xl flex-1 md:flex-none ${!showFavoritesOnly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
        >
          Все мастера
        </Button>
        <Button
          variant={showFavoritesOnly ? "default" : "ghost"}
          onClick={() => setShowFavoritesOnly(true)}
          className={`rounded-xl flex-1 md:flex-none ${showFavoritesOnly ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' : 'text-gray-500 hover:bg-white/50'}`}
        >
          <Heart className={`w-4 h-4 mr-2 ${showFavoritesOnly ? 'fill-pink-600' : ''}`} />
          Избранные
        </Button>
      </div>

      {filteredMasters.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
          <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900">Мастера не найдены</h3>
          <p className="text-gray-500 mt-2">Попробуйте изменить параметры поиска</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMasters.map((master: any) => {
            return (
              <div
                key={master.id}
                className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-pink-50 text-gray-400 hover:text-pink-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(master.id);
                    }}
                  >
                    <Heart className={`w-5 h-5 ${favoriteMasters.includes(master.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </Button>
                </div>

                <div className="mb-4 relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner">
                    <img
                      src={master.photo || master.avatar_url}
                      alt={master.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-0.5 shadow-sm border border-gray-100 flex items-center gap-1 text-xs font-bold text-gray-900">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {master.rating || '5.0'}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900">{master.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{master.specialty}</p>

                <div className="w-full mt-auto space-y-3">
                  <Button className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-xl py-6 shadow-lg shadow-gray-200 group-hover:shadow-xl transition-all">
                    Записаться
                  </Button>
                  <Button variant="ghost" className="w-full text-gray-500 hover:bg-gray-50 rounded-xl">
                    Подробнее
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
