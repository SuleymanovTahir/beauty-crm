import { useState, useEffect } from 'react';
import { Star, Heart, Award, Flame, Crown, Gem, Trophy, Lock, Loader2, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../../src/api/client';
import { toast } from 'sonner';

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
  const { t } = useTranslation(['account', 'common']);
  const [loading, setLoading] = useState(true);
  const [achievementsData, setAchievementsData] = useState<any>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<number[]>([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientAchievements();
      if (data.success) {
        // Check for newly unlocked achievements
        if (achievementsData?.achievements) {
          const previouslyUnlocked = achievementsData.achievements
            .filter((a: any) => a.unlocked)
            .map((a: any) => a.id);
          const currentlyUnlocked = data.achievements
            .filter((a: any) => a.unlocked)
            .map((a: any) => a.id);

          const newUnlocks = currentlyUnlocked.filter(
            (id: number) => !previouslyUnlocked.includes(id)
          );

          if (newUnlocks.length > 0) {
            setNewlyUnlocked(newUnlocks);
            // Show celebration toast
            toast.success(
              `🎉 ${t('achievements.unlocked_new', 'Разблокировано новое достижение!')}`,
              {
                duration: 5000,
              }
            );

            // Remove animation after 3 seconds
            setTimeout(() => {
              setNewlyUnlocked([]);
            }, 3000);

            // Dispatch event for notifications
            window.dispatchEvent(new CustomEvent('notification-received'));
          }
        }

        setAchievementsData(data);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
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

  const achievements = achievementsData?.achievements || [];
  const challenges = achievementsData?.challenges || [];

  const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
  const totalCount = achievements.length;

  const getDaysLeft = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const shareAchievement = async (achievement: any) => {
    const shareText = `🏆 ${t('achievements.share_text', 'Я разблокировал достижение')}: "${achievement.title}"!\n\n${achievement.description}\n\n#BeautySalon #Achievement`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('achievements.share_title', 'Мое достижение'),
          text: shareText,
        });
        toast.success(t('achievements.shared', 'Успешно поделились!'));
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText);
          toast.success(t('achievements.copied', 'Текст скопирован в буфер обмена'));
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success(t('achievements.copied', 'Текст скопирован в буфер обмена'));
      } catch (error) {
        toast.error(t('common:error_occurred', 'Произошла ошибка'));
      }
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>{t('achievements.title', 'Достижения')}</h1>
        <p className="text-muted-foreground">
          {t('achievements.progress', 'Ваш прогресс')}: {unlockedCount} {t('achievements.of', 'из')} {totalCount} {t('achievements.achievements', 'достижений')}
        </p>
      </div>

      {/* Общий прогресс */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-600" />
            {t('achievements.overall_progress', 'Общий прогресс')}
          </CardTitle>
          <CardDescription>
            {unlockedCount > 0
              ? t('achievements.keep_going', 'Отличная работа! Продолжайте в том же духе')
              : t('achievements.get_started', 'Начните собирать достижения уже сегодня!')
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">{t('achievements.unlocked_achievements', 'Разблокировано достижений')}</span>
              <span className="text-2xl font-bold text-purple-600">{unlockedCount} / {totalCount}</span>
            </div>
            <Progress value={(unlockedCount / totalCount) * 100} className="h-4 bg-purple-100" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 text-center border border-purple-100">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {unlockedCount}
              </div>
              <div className="text-sm font-medium text-gray-600 mt-1">{t('achievements.received', 'Получено')}</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 text-center border border-blue-100">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {totalCount - unlockedCount}
              </div>
              <div className="text-sm font-medium text-gray-600 mt-1">{t('achievements.remaining', 'Осталось')}</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 text-center border border-green-100">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {Math.round((unlockedCount / totalCount) * 100)}%
              </div>
              <div className="text-sm font-medium text-gray-600 mt-1">{t('achievements.completed', 'Завершено')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список достижений */}
      <div className="space-y-4">
        <h2>{t('achievements.all_achievements', 'Все достижения')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement: any) => {
            const Icon = iconMap[achievement.icon] || Star;
            const hasProgress = achievement.maxProgress !== undefined;
            const progress = hasProgress && achievement.progress
              ? (achievement.progress / achievement.maxProgress!) * 100
              : 0;

            const isNewlyUnlocked = newlyUnlocked.includes(achievement.id);

            return (
              <Card
                key={achievement.id}
                className={`${
                  achievement.unlocked
                    ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50'
                    : 'opacity-60'
                } ${
                  isNewlyUnlocked ? 'animate-pulse border-4 border-yellow-400' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-full ${
                        achievement.unlocked
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isNewlyUnlocked ? 'animate-bounce' : ''}`}
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
                        <div className="flex gap-2">
                          {achievement.unlocked && (
                            <>
                              <Badge className="bg-yellow-500">
                                {t('achievements.unlocked', 'Получено')}
                              </Badge>
                              <button
                                onClick={() => shareAchievement(achievement)}
                                className="p-1 hover:bg-yellow-100 rounded transition-colors"
                                title={t('achievements.share', 'Поделиться')}
                              >
                                <Share2 className="w-4 h-4 text-yellow-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {hasProgress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t('achievements.progress_label', 'Прогресс')}</span>
                            <span>
                              {achievement.progress} / {achievement.maxProgress}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      {achievement.unlocked && achievement.unlockedDate && (
                        <div className="text-xs text-muted-foreground">
                          {t('achievements.unlocked_date', 'Получено')}:{' '}
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
        <h2>{t('achievements.active_challenges', 'Активные челленджи')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((challenge: any) => {
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
                      {daysLeft}{t('achievements.days_short', 'д')}
                    </Badge>
                  </div>
                  <CardDescription>{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('achievements.progress_label', 'Прогресс')}</span>
                      <span className="font-semibold">
                        {challenge.progress} / {challenge.maxProgress}
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{t('achievements.reward', 'Награда')}</div>
                    <Badge className="bg-purple-500">{challenge.reward}</Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t('achievements.until', 'До')} {new Date(challenge.deadline).toLocaleDateString('ru-RU', {
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
