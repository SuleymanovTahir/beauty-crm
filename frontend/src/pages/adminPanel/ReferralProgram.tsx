// /frontend/src/pages/adminPanel/ReferralProgram.tsx
import { useState, useEffect } from 'react';
import { Users, Gift, TrendingUp, Search, ExternalLink, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
  status: 'pending' | 'completed' | 'cancelled';
  points_awarded: number;
  created_at: string;
}

export default function ReferralProgram() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const [settings, setSettings] = useState({
    referrer_bonus: 500,
    referred_bonus: 200,
    min_purchase_amount: 0,
  });

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      // TODO: API call
      // Mock data
      setReferrals([
        {
          id: '1',
          referrer_name: 'John Doe',
          referrer_email: 'john@example.com',
          referred_name: 'Jane Smith',
          referred_email: 'jane@example.com',
          status: 'completed',
          points_awarded: 500,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          referrer_name: 'Alice Johnson',
          referrer_email: 'alice@example.com',
          referred_name: 'Bob Williams',
          referred_email: 'bob@example.com',
          status: 'pending',
          points_awarded: 0,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    // TODO: API call to save settings
    toast.success('Settings saved successfully');
    setShowSettingsDialog(false);
  };

  const stats = [
    {
      title: 'Total Referrals',
      value: '89',
      change: '+15%',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Completed Referrals',
      value: '67',
      change: '+12%',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Points Distributed',
      value: '33,500',
      change: '+18%',
      icon: Gift,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const filteredReferrals = referrals.filter(r =>
    r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referrer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referred_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Referral Program</h1>
          <p className="text-gray-500 mt-1">Manage referrals and track program performance</p>
        </div>
        <Button onClick={() => setShowSettingsDialog(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
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
                    <p className="text-xs text-green-600 font-medium mt-1">{stat.change} from last month</p>
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

      {/* Current Settings Info */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Bonus Configuration</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-600" />
                  <span>Referrer receives <strong>{settings.referrer_bonus} points</strong> when friend completes first purchase</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-600" />
                  <span>Referred friend receives <strong>{settings.referred_bonus} points</strong> upon registration</span>
                </div>
                {settings.min_purchase_amount > 0 && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <span>Minimum purchase amount: <strong>{settings.min_purchase_amount} AED</strong></span>
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Referrals</CardTitle>
              <CardDescription>Track referral status and points distribution</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search referrals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Referred Friend</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Points Awarded</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{referral.referrer_name}</div>
                      <div className="text-sm text-gray-500">{referral.referrer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{referral.referred_name}</div>
                      <div className="text-sm text-gray-500">{referral.referred_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        referral.status === 'completed' ? 'default' :
                        referral.status === 'pending' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {referral.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={referral.points_awarded > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {referral.points_awarded > 0 ? `+${referral.points_awarded}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Referral Program Settings</DialogTitle>
            <DialogDescription>Configure bonus points and requirements</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Referrer Bonus Points</Label>
              <Input
                type="number"
                value={settings.referrer_bonus}
                onChange={(e) => setSettings({ ...settings, referrer_bonus: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Points awarded to the referrer when friend makes first purchase</p>
            </div>
            <div>
              <Label>Referred Friend Bonus Points</Label>
              <Input
                type="number"
                value={settings.referred_bonus}
                onChange={(e) => setSettings({ ...settings, referred_bonus: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Points awarded to the friend upon registration</p>
            </div>
            <div>
              <Label>Minimum Purchase Amount (AED)</Label>
              <Input
                type="number"
                value={settings.min_purchase_amount}
                onChange={(e) => setSettings({ ...settings, min_purchase_amount: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum amount friend must spend to activate referral bonus (0 = no minimum)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
