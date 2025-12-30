// /frontend/src/pages/adminPanel/Challenges.tsx
import { useState, useEffect } from 'react';
import { Plus, Target, Calendar, Trophy, Users, Edit, Trash2 } from 'lucide-react';
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
      // TODO: API call
      // Mock data
      setChallenges([
        {
          id: '1',
          title: 'Summer Glow Challenge',
          description: 'Visit the salon 3 times this month',
          type: 'visits',
          target_value: 3,
          reward_points: 1000,
          start_date: '2025-06-01',
          end_date: '2025-06-30',
          status: 'active',
          participants: 45,
          completions: 12,
        },
        {
          id: '2',
          title: 'Refer a Friend',
          description: 'Refer 2 friends and earn bonus points',
          type: 'referrals',
          target_value: 2,
          reward_points: 1500,
          start_date: '2025-06-01',
          end_date: '2025-12-31',
          status: 'active',
          participants: 28,
          completions: 5,
        },
      ]);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    try {
      // TODO: API call
      toast.success('Challenge created successfully');
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
      loadChallenges();
    } catch (error) {
      toast.error('Failed to create challenge');
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;

    try {
      // TODO: API call
      toast.success('Challenge deleted successfully');
      loadChallenges();
    } catch (error) {
      toast.error('Failed to delete challenge');
    }
  };

  const stats = [
    {
      title: 'Active Challenges',
      value: challenges.filter(c => c.status === 'active').length.toString(),
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Participants',
      value: challenges.reduce((sum, c) => sum + c.participants, 0).toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Completions',
      value: challenges.reduce((sum, c) => sum + c.completions, 0).toString(),
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const typeLabels: Record<Challenge['type'], string> = {
    visits: 'Visits',
    spending: 'Spending',
    referrals: 'Referrals',
    services: 'Services',
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
          <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
          <p className="text-gray-500 mt-1">Create and manage engagement challenges</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Challenge
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
                        {challenge.status}
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
                    <div className="text-sm text-gray-500">Target</div>
                    <div className="text-lg font-semibold">{challenge.target_value} {typeLabels[challenge.type].toLowerCase()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Reward</div>
                    <div className="text-lg font-semibold text-purple-600">{challenge.reward_points} pts</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium">{challenge.completions}/{challenge.participants} completed</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>

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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Challenge Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}</DialogTitle>
            <DialogDescription>Define challenge parameters and rewards</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Summer Glow Challenge"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Visit the salon 3 times this month"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Challenge Type</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Challenge['type'] })}
                >
                  <option value="visits">Visits</option>
                  <option value="spending">Spending</option>
                  <option value="referrals">Referrals</option>
                  <option value="services">Services</option>
                </select>
              </div>
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  placeholder="3"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Reward Points</Label>
              <Input
                type="number"
                placeholder="1000"
                value={formData.reward_points}
                onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
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
              Cancel
            </Button>
            <Button onClick={handleCreateChallenge}>
              {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
