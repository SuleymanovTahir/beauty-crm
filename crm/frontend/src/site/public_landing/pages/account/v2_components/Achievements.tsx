import { useState, useEffect } from 'react';
import { Star, Heart, Award, Flame, Crown, Gem, Trophy, Lock, Loader2, Share2, PartyPopper, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@crm/api/client';
import { toast } from 'sonner';

const iconMap: Record<string, any> = {
  Star,
  Heart,
  Award,
  Flame,
  Crown,
  Gem,
  Trophy,
  'party-popper': PartyPopper,
  search: Search,
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
              t('achievements.unlocked_new', 'Разблокировано новое достижение!'),
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

  const getDaysLeft = (deadline: string | null | undefined) => {
    if (!deadline) {
      return null;
    }

    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const shareAchievement = async (achievement: any) => {
    const shareText = `${t('achievements.share_text', 'Я разблокировал достижение')}: "${achievement.title}"!\n\n${achievement.description}\n\n#BeautySalon #Achievement`;

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
    <div className="max-w-4xl pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('achievements.title', 'Achievements')}</h1>
        <p className="text-sm text-gray-500">
          {t('achievements.progress', 'Your progress')}: {unlockedCount} {t('achievements.of', 'from')} {totalCount} {t('achievements.achievements', 'achievements')}
        </p>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="text-gray-700" size={20} />
          <h2 className="font-semibold">{t('achievements.overall_progress', 'Overall progress')}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          {unlockedCount > 0
            ? t('achievements.keep_going', 'Great work! Keep going')
            : t('achievements.get_started', 'Start collecting achievements today!')
          }
        </p>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">{t('achievements.unlocked_achievements', 'Achievements unlocked')}</span>
          <span className="text-lg font-bold">{unlockedCount} / {totalCount}</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 mb-1">{unlockedCount}</div>
            <div className="text-xs text-gray-500">{t('achievements.received', 'Received')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 mb-1">{totalCount - unlockedCount}</div>
            <div className="text-xs text-gray-500">{t('achievements.remaining', 'Left')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500">{t('achievements.completed', 'Completed')}</div>
          </div>
        </div>
      </div>

      {/* All achievements */}
      <div className="mb-4">
        <h2 className="font-semibold mb-4">{t('achievements.all_achievements', 'All achievements')}</h2>
        {achievements.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Trophy className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">{t('achievements.no_achievements', 'No achievements yet')}</p>
          </div>
        ) : (
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
                  className={`${achievement.unlocked
                    ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50'
                    : 'opacity-60 border-gray-200'
                    } ${isNewlyUnlocked ? 'animate-pulse border-4 border-yellow-400' : ''
                    }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-full ${achievement.unlocked
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
                            <div className="text-sm text-gray-600">
                              {achievement.description}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {achievement.unlocked && (
                              <>
                                <Badge className="bg-yellow-500">
                                  {t('achievements.unlocked', 'Unlocked')}
                                </Badge>
                                <button
                                  onClick={() => shareAchievement(achievement)}
                                  className="p-1 hover:bg-yellow-100 rounded transition-colors"
                                  title={t('achievements.share', 'Share')}
                                >
                                  <Share2 className="w-4 h-4 text-yellow-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {hasProgress && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{t('achievements.progress_label', 'Progress')}</span>
                              <span>
                                {achievement.progress} / {achievement.maxProgress}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}

                        {achievement.unlocked && achievement.unlockedDate && (
                          <div className="text-xs text-gray-500">
                            {t('achievements.unlocked_date', 'Unlocked')}:{' '}
                            {new Date(achievement.unlockedDate).toLocaleDateString(undefined, {
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
        )}
      </div>

      {/* Active challenges */}
      <div className="mb-4">
        <h2 className="font-semibold mb-4">{t('achievements.active_challenges', 'Active challenges')}</h2>
        {challenges.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Award className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">{t('achievements.no_challenges', 'No active challenges')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge: any) => {
              const daysLeft = getDaysLeft(challenge.deadline);
              const maxProgress = Number(challenge.maxProgress || 0);
              const progress = maxProgress > 0
                ? (Number(challenge.progress || 0) / maxProgress) * 100
                : 0;

              return (
                <Card
                  key={challenge.id}
                  className="border-gray-200"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <Badge
                        variant={daysLeft !== null && daysLeft <= 3 ? 'destructive' : 'default'}
                        className="ml-2"
                      >
                        {daysLeft === null
                          ? '-'
                          : `${Math.max(daysLeft, 0)}${t('achievements.days_short', 'd')}`}
                      </Badge>
                    </div>
                    <CardDescription>{challenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('achievements.progress_label', 'Progress')}</span>
                        <span className="font-semibold">
                          {challenge.progress} / {challenge.maxProgress}
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">{t('achievements.reward', 'Reward')}</div>
                      <Badge className="bg-purple-500">{challenge.reward}</Badge>
                    </div>

                    <div className="text-xs text-gray-500">
                      {challenge.deadline
                        ? `${t('achievements.until', 'Until')} ${new Date(challenge.deadline).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'long',
                        })}`
                        : `${t('achievements.until', 'Until')} -`}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
