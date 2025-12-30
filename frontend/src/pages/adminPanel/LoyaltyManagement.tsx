// /frontend/src/pages/adminPanel/LoyaltyManagement.tsx
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, TrendingUp, Gift, DollarSign } from 'lucide-react';
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

interface LoyaltyTier {
  id: string;
  name: string;
  min_points: number;
  discount: number;
  color: string;
}

interface LoyaltyTransaction {
  id: string;
  client_name: string;
  client_email: string;
  points: number;
  type: 'earn' | 'redeem' | 'adjust';
  reason: string;
  created_at: string;
}

export default function LoyaltyManagement() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([
    { id: '1', name: 'Bronze', min_points: 0, discount: 0, color: '#CD7F32' },
    { id: '2', name: 'Silver', min_points: 1000, discount: 5, color: '#C0C0C0' },
    { id: '3', name: 'Gold', min_points: 5000, discount: 10, color: '#FFD700' },
    { id: '4', name: 'Platinum', min_points: 10000, discount: 15, color: '#E5E4E2' },
  ]);

  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);

  const [adjustForm, setAdjustForm] = useState({
    client_email: '',
    points: 0,
    reason: '',
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // TODO: API call
      // Mock data
      setTransactions([
        {
          id: '1',
          client_name: 'John Doe',
          client_email: 'john@example.com',
          points: 500,
          type: 'earn',
          reason: 'Purchase',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          client_name: 'Jane Smith',
          client_email: 'jane@example.com',
          points: -200,
          type: 'redeem',
          reason: 'Discount applied',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTier = () => {
    if (editingTier) {
      setTiers(tiers.map(t => t.id === editingTier.id ? editingTier : t));
      toast.success('Tier updated successfully');
    }
    setShowTierDialog(false);
    setEditingTier(null);
  };

  const handleAdjustPoints = async () => {
    try {
      // TODO: API call to adjust points
      toast.success(`${adjustForm.points} points ${adjustForm.points > 0 ? 'added to' : 'deducted from'} ${adjustForm.client_email}`);
      setShowAdjustDialog(false);
      setAdjustForm({ client_email: '', points: 0, reason: '' });
      loadTransactions();
    } catch (error) {
      toast.error('Failed to adjust points');
    }
  };

  const stats = [
    {
      title: 'Total Points Issued',
      value: '125,000',
      change: '+12%',
      icon: Gift,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Points Redeemed',
      value: '45,000',
      change: '+8%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Members',
      value: '1,234',
      change: '+15%',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loyalty Management</h1>
          <p className="text-gray-500 mt-1">Manage loyalty tiers, points, and transactions</p>
        </div>
        <Button onClick={() => setShowAdjustDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adjust Points
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

      {/* Loyalty Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Tiers</CardTitle>
          <CardDescription>Configure tier levels and benefits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tiers.map((tier) => (
              <div key={tier.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: tier.color }}
                  >
                    {tier.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{tier.name}</div>
                    <div className="text-sm text-gray-500">
                      {tier.min_points === 0 ? 'Starting level' : `From ${tier.min_points.toLocaleString()} points`} • {tier.discount}% discount
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTier(tier);
                    setShowTierDialog(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest loyalty point transactions</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
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
                <TableHead>Client</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.client_name}</div>
                      <div className="text-sm text-gray-500">{transaction.client_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={transaction.points > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {transaction.points > 0 ? '+' : ''}{transaction.points}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'earn' ? 'default' : 'secondary'}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.reason}</TableCell>
                  <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Tier Dialog */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tier</DialogTitle>
            <DialogDescription>Update tier configuration</DialogDescription>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4">
              <div>
                <Label>Tier Name</Label>
                <Input
                  value={editingTier.name}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Minimum Points</Label>
                <Input
                  type="number"
                  value={editingTier.min_points}
                  onChange={(e) => setEditingTier({ ...editingTier, min_points: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  value={editingTier.discount}
                  onChange={(e) => setEditingTier({ ...editingTier, discount: parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
            <DialogDescription>Add or deduct points from a client's account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client Email</Label>
              <Input
                placeholder="client@example.com"
                value={adjustForm.client_email}
                onChange={(e) => setAdjustForm({ ...adjustForm, client_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Points (use negative for deduction)</Label>
              <Input
                type="number"
                placeholder="100"
                value={adjustForm.points}
                onChange={(e) => setAdjustForm({ ...adjustForm, points: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                placeholder="Manual adjustment"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustPoints}>Adjust Points</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
