import { Star, Heart, Award, Flame, Crown, Gem, Trophy, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { achievements, challenges } from '../../../data/mockData';

const iconMap: Record<string, any> = {
  Star,
  Heart,
  Award,
  Flame,
  Crown,
  Gem,
  Trophy,
};

export function Achievements() {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  const getDaysLeft = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>Достижения</h1>
        <p className="text-muted-foreground">
          Ваш прогресс: {unlockedCount} из {totalCount} достижений
        </p>
      </div>

      {/* Общий прогресс */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            Общий прогресс
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Разблокировано достижений</span>
              <span className="font-semibold">{unlockedCount} / {totalCount}</span>
            </div>
            <Progress value={(unlockedCount / totalCount) * 100} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{unlockedCount}</div>
              <div className="text-xs text-muted-foreground">Получено</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalCount - unlockedCount}</div>
              <div className="text-xs text-muted-foreground">Осталось</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((unlockedCount / totalCount) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Завершено</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список достижений */}
      <div className="space-y-4">
        <h2>Все достижения</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const Icon = iconMap[achievement.icon] || Star;
            const hasProgress = achievement.maxProgress !== undefined;
            const progress = hasProgress && achievement.progress
              ? (achievement.progress / achievement.maxProgress!) * 100
              : 0;

            return (
              <Card
                key={achievement.id}
                className={`${
                  achievement.unlocked
                    ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50'
                    : 'opacity-60'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-full ${
                        achievement.unlocked
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {achievement.unlocked ? (
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
