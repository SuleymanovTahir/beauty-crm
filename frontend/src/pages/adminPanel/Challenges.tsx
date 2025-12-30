// /frontend/src/pages/adminPanel/Challenges.tsx
import { useState, useEffect } from 'react';
import { Plus, Target, Calendar, Trophy, Users, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'visits' | 'spending' | 'referrals' | 'services';
  target_value: number;
  reward_points: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'upcoming' | 'completed';
  participants: number;
  completions: number;
}

export default function Challenges() {
  const { t } = useTranslation(['adminPanel/Challenges', 'common']);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'visits' as Challenge['type'],
    target_value: 0,
    reward_points: 0,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/challenges', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.challenges) {
          setChallenges(data.challenges);
        }
      } else {
        throw new Error('Failed to load challenges');
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast.error(t('toasts.failed_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    try {
      const endpoint = editingChallenge
        ? `/api/admin/challenges/${editingChallenge.id}`
        : '/api/admin/challenges';

      const response = await fetch(endpoint, {
        method: editingChallenge ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(t('toasts.created'));
        setShowCreateDialog(false);
        setFormData({
          title: '',
          description: '',
          type: 'visits',
          target_value: 0,
          reward_points: 0,
          start_date: '',
          end_date: '',
        });
        setEditingChallenge(null);
        loadChallenges();
      } else {
        throw new Error('Failed to create challenge');
      }
    } catch (error) {
      toast.error(t('toasts.failed_create'));
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm(t('dialogs.delete.confirm'))) return;

    try {
      const response = await fetch(`/api/admin/challenges/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success(t('toasts.deleted'));
        loadChallenges();
      } else {
        throw new Error('Failed to delete challenge');
      }
    } catch (error) {
      toast.error(t('toasts.failed_delete'));
    }
  };

  const handleCheckProgress = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/challenges/${id}/check-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(t('toasts.progress_checked', {
            defaultValue: `Updated ${data.updated_count} clients who completed the challenge`,
            count: data.updated_count
          }));
          loadChallenges();
        }
      } else {
        throw new Error('Failed to check progress');
      }
    } catch (error) {
      toast.error(t('toasts.failed_check_progress', { defaultValue: 'Failed to check progress' }));
    }
  };

  const stats = [
    {
      title: t('stats.active_challenges'),
      value: challenges.filter(c => c.status === 'active').length.toString(),
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: t('stats.total_participants'),
      value: challenges.reduce((sum, c) => sum + c.participants, 0).toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('stats.completions'),
      value: challenges.reduce((sum, c) => sum + c.completions, 0).toString(),
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const typeLabels: Record<Challenge['type'], string> = {
    visits: t('types.visits'),
    spending: t('types.spending'),
    referrals: t('types.referrals'),
    services: t('types.services'),
  };

  const statusColors: Record<Challenge['status'], string> = {
    active: 'bg-green-100 text-green-700',
    upcoming: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('create_challenge')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {challenges.map((challenge) => {
          const completionRate = challenge.participants > 0
            ? (challenge.completions / challenge.participants) * 100
            : 0;

          return (
            <Card key={challenge.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[challenge.status]}>
                        {t(`statuses.${challenge.status}`)}
                      </Badge>
                      <Badge variant="outline">{typeLabels[challenge.type]}</Badge>
                    </div>
                    <CardTitle>{challenge.title}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingChallenge(challenge);
                        setFormData(challenge);
                        setShowCreateDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChallenge(challenge.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">{t('card.target')}</div>
                    <div className="text-lg font-semibold">{challenge.target_value} {typeLabels[challenge.type].toLowerCase()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{t('card.reward')}</div>
                    <div className="text-lg font-semibold text-purple-600">{challenge.reward_points} {t('card.pts')}</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500">{t('card.progress')}</span>
                    <span className="font-medium">{challenge.completions}/{challenge.participants} {t('card.completed')}</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(challenge.start_date).toLocaleDateString()}</span>
                    </div>
                    <span>-</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(challenge.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {challenge.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckProgress(challenge.id)}
                      className="ml-2"
                    >
                      <Trophy className="w-4 h-4 mr-1" />
                      {t('card.check_progress', { defaultValue: 'Check Progress' })}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Challenge Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingChallenge ? t('dialogs.create.title_edit') : t('dialogs.create.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.create.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('dialogs.create.form.title')}</Label>
              <Input
                placeholder={t('dialogs.create.form.title_placeholder')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('dialogs.create.form.description')}</Label>
              <Textarea
                placeholder={t('dialogs.create.form.description_placeholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('dialogs.create.form.challenge_type')}</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Challenge['type'] })}
                >
                  <option value="visits">{t('types.visits')}</option>
                  <option value="spending">{t('types.spending')}</option>
                  <option value="referrals">{t('types.referrals')}</option>
                  <option value="services">{t('types.services')}</option>
                </select>
              </div>
              <div>
                <Label>{t('dialogs.create.form.target_value')}</Label>
                <Input
                  type="number"
                  placeholder={t('dialogs.create.form.target_placeholder')}
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>{t('dialogs.create.form.reward_points')}</Label>
              <Input
                type="number"
                placeholder={t('dialogs.create.form.reward_placeholder')}
                value={formData.reward_points}
                onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('dialogs.create.form.start_date')}</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('dialogs.create.form.end_date')}</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleCreateChallenge}>
              {editingChallenge ? t('buttons.update_challenge') : t('buttons.create_challenge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
