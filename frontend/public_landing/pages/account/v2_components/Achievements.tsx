import { Star, Heart, Award, Flame, Crown, Gem, Trophy, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
// import { achievements as initialAchievements } from '../data/mockData';

const iconMap: Record<string, any> = {
  Star,
  Heart,
  Award,
  Flame,
  Crown,
  Gem,
  Trophy,
  Lock,
};

export function Achievements({ achievements }: any) {
  // achievements prop is array of { id, title, description, icon, is_unlocked, ... }
  const challenges: any[] = []; // Placeholder for future implementation
  const unlockedCount = achievements?.filter((a: any) => a.is_unlocked || a.unlocked)?.length || 0;
  const totalCount = achievements?.length || 0;

  const getDaysLeft = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent inline-block">
            Достижения
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Ваш путь к совершенству
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-yellow-600">{unlockedCount}</span>
          <span className="text-muted-foreground ml-1">из {totalCount}</span>
        </div>
      </div>

      {/* Общий прогресс */}
      <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/20 blur-3xl opacity-50" />
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  className="text-white/20"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="58"
                  cx="64"
                  cy="64"
                />
                <circle
                  className="text-white transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={365}
                  strokeDashoffset={365 - (365 * (totalCount > 0 ? unlockedCount / totalCount : 0))}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="58"
                  cx="64"
                  cy="64"
                />
              </svg>
              <Trophy className="w-12 h-12 text-white animate-bounce-slow" />
            </div>

            <div className="flex-1 w-full text-center md:text-left space-y-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">Уровень искателя красоты</h3>
                <p className="text-orange-100">Вы открыли {Math.round((unlockedCount / totalCount) * 100) || 0}% всех достижений</p>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{unlockedCount}</div>
                  <div className="text-xs text-orange-100 uppercase tracking-wider">Открыто</div>
                </div>
                <div className="text-center border-l border-white/20">
                  <div className="text-2xl font-bold text-white">{totalCount - unlockedCount}</div>
                  <div className="text-xs text-orange-100 uppercase tracking-wider">Закрыто</div>
                </div>
                <div className="text-center border-l border-white/20">
                  <div className="text-2xl font-bold text-white">{challenges.length}</div>
                  <div className="text-xs text-orange-100 uppercase tracking-wider">Задания</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список достижений */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Коллекция наград</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements?.map((achievement: any, index: number) => {
            const Icon = iconMap[achievement.icon] || Star;
            const isUnlocked = achievement.unlocked || achievement.is_unlocked;
            const hasProgress = achievement.progress !== undefined && achievement.maxProgress !== undefined;
            const progress = hasProgress ? Math.min(100, (achievement.progress / achievement.maxProgress) * 100) : 0;

            return (
              <Card
                key={achievement.id || index}
                className={`transition-all duration-300 hover:scale-[1.02] border ${isUnlocked
                  ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md hover:shadow-yellow-100'
                  : 'border-gray-100 bg-gray-50 opacity-80 hover:opacity-100'
                  }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-2xl shadow-sm ${isUnlocked
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-orange-200'
                        : 'bg-white text-gray-300 border border-gray-100'
                        }`}
                    >
                      {isUnlocked ? (
                        <Icon className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{achievement.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {achievement.description}
                          </div>
                        </div>
                        {achievement.unlocked && (
                          <Badge className="bg-yellow-500">
                            Получено
                          </Badge>
                        )}
                      </div>

                      {hasProgress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Прогресс</span>
                            <span>
                              {achievement.progress} / {achievement.maxProgress}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      {achievement.unlocked && achievement.unlockedDate && (
                        <div className="text-xs text-muted-foreground">
                          Получено:{' '}
                          {new Date(achievement.unlockedDate).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Челленджи */}
      <div className="space-y-4">
        <h2>Активные челленджи</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((challenge) => {
            const daysLeft = getDaysLeft(challenge.deadline);
            const progress = (challenge.progress / challenge.maxProgress) * 100;

            return (
              <Card
                key={challenge.id}
                className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    <Badge
                      variant={daysLeft <= 3 ? 'destructive' : 'default'}
                      className="ml-2"
                    >
                      {daysLeft}д
                    </Badge>
                  </div>
                  <CardDescription>{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="font-semibold">
                        {challenge.progress} / {challenge.maxProgress}
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Награда</div>
                    <Badge className="bg-purple-500">{challenge.reward}</Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    До {new Date(challenge.deadline).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
