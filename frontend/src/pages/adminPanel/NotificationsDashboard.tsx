// /frontend/src/pages/adminPanel/NotificationsDashboard.tsx
import { useState, useEffect } from 'react';
import { Plus, Send, Mail, Smartphone, MessageSquare, Filter, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
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
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'email' | 'push' | 'sms';
  recipients: number;
  sent_count: number;
  failed_count: number;
  status: 'sent' | 'pending' | 'failed';
  created_at: string;
  sent_at: string | null;
}

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'email' | 'push' | 'sms';
}

export default function NotificationsDashboard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'email' | 'push' | 'sms'>('all');

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'push' as Notification['type'],
    target_segment: 'all', // all, active, inactive, tier-specific
    tier_filter: '', // bronze, silver, gold, platinum
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    title: '',
    message: '',
    type: 'push' as NotificationTemplate['type'],
  });

  useEffect(() => {
    loadNotifications();
    loadTemplates();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // TODO: API call
      // Mock data
      setNotifications([
        {
          id: '1',
          title: 'Summer Sale Announcement',
          message: 'Get 20% off all services this week!',
          type: 'push',
          recipients: 1234,
          sent_count: 1200,
          failed_count: 34,
          status: 'sent',
          created_at: '2025-06-15T10:00:00Z',
          sent_at: '2025-06-15T10:05:00Z',
        },
        {
          id: '2',
          title: 'Appointment Reminder',
          message: 'You have an appointment tomorrow at 2 PM',
          type: 'email',
          recipients: 45,
          sent_count: 45,
          failed_count: 0,
          status: 'sent',
          created_at: '2025-06-14T15:00:00Z',
          sent_at: '2025-06-14T15:02:00Z',
        },
        {
          id: '3',
          title: 'New Challenge Available',
          message: 'Complete 3 visits this month and earn 1000 points!',
          type: 'push',
          recipients: 800,
          sent_count: 0,
          failed_count: 0,
          status: 'pending',
          created_at: '2025-06-16T09:00:00Z',
          sent_at: null,
        },
      ]);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      // TODO: API call
      // Mock data
      setTemplates([
        {
          id: '1',
          name: 'Welcome Message',
          title: 'Welcome to our salon!',
          message: 'Thank you for joining. Enjoy 10% off your first visit!',
          type: 'email',
        },
        {
          id: '2',
          name: 'Appointment Reminder',
          title: 'Upcoming Appointment',
          message: 'You have an appointment on {date} at {time}',
          type: 'sms',
        },
        {
          id: '3',
          name: 'Points Earned',
          title: 'You earned points!',
          message: 'Congratulations! You earned {points} loyalty points.',
          type: 'push',
        },
      ]);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSendNotification = async () => {
    try {
      // TODO: API call
      toast.success('Notification sent successfully');
      setShowCreateDialog(false);
      setFormData({
        title: '',
        message: '',
        type: 'push',
        target_segment: 'all',
        tier_filter: '',
      });
      loadNotifications();
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const handleSaveTemplate = async () => {
    try {
      // TODO: API call
      toast.success('Template saved successfully');
      setShowTemplateDialog(false);
      setTemplateForm({
        name: '',
        title: '',
        message: '',
        type: 'push',
      });
      loadTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleUseTemplate = (template: NotificationTemplate) => {
    setFormData({
      ...formData,
      title: template.title,
      message: template.message,
      type: template.type,
    });
    setShowCreateDialog(true);
  };

  const stats = [
    {
      title: 'Total Sent',
      value: notifications.reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Email Sent',
      value: notifications.filter(n => n.type === 'email').reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: Mail,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Push Sent',
      value: notifications.filter(n => n.type === 'push').reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: Smartphone,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'SMS Sent',
      value: notifications.filter(n => n.type === 'sms').reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const typeColors: Record<Notification['type'], string> = {
    email: 'bg-purple-100 text-purple-700',
    push: 'bg-green-100 text-green-700',
    sms: 'bg-orange-100 text-orange-700',
  };

  const statusIcons: Record<Notification['status'], any> = {
    sent: CheckCircle,
    pending: Clock,
    failed: XCircle,
  };

  const statusColors: Record<Notification['status'], string> = {
    sent: 'text-green-600',
    pending: 'text-yellow-600',
    failed: 'text-red-600',
  };

  const filteredNotifications = selectedType === 'all'
    ? notifications
    : notifications.filter(n => n.type === selectedType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage and send notifications to clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
            Save Template
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Send Notification
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription>Quick templates for common notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <Badge className={typeColors[template.type]}>{template.type}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.title}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUseTemplate(template)}
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>All sent and scheduled notifications</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                All
              </Button>
              <Button
                variant={selectedType === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('email')}
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
              <Button
                variant={selectedType === 'push' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('push')}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Push
              </Button>
              <Button
                variant={selectedType === 'sms' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('sms')}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                SMS
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Sent/Failed</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.map((notification) => {
                const StatusIcon = statusIcons[notification.status];
                return (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-5 h-5 ${statusColors[notification.status]}`} />
                        <span className="text-sm capitalize">{notification.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-gray-500">{notification.message.substring(0, 50)}...</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[notification.type]}>{notification.type}</Badge>
                    </TableCell>
                    <TableCell>{notification.recipients}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-green-600">{notification.sent_count}</span>
                        {notification.failed_count > 0 && (
                          <>
                            {' / '}
                            <span className="text-red-600">{notification.failed_count}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {notification.sent_at
                          ? new Date(notification.sent_at).toLocaleString()
                          : 'Scheduled'}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send New Notification</DialogTitle>
            <DialogDescription>Create and send a notification to your clients</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notification Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  type="button"
                  variant={formData.type === 'push' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'push' })}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Push
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'email' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'email' })}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'sms' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'sms' })}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS
                </Button>
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Notification title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Notification message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Segment</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.target_segment}
                  onChange={(e) => setFormData({ ...formData, target_segment: e.target.value })}
                >
                  <option value="all">All Clients</option>
                  <option value="active">Active Clients</option>
                  <option value="inactive">Inactive Clients</option>
                  <option value="tier">By Loyalty Tier</option>
                </select>
              </div>
              {formData.target_segment === 'tier' && (
                <div>
                  <Label>Loyalty Tier</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.tier_filter}
                    onChange={(e) => setFormData({ ...formData, tier_filter: e.target.value })}
                  >
                    <option value="">Select tier</option>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendNotification}>
              <Send className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Create a reusable notification template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., Welcome Message"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Notification title"
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Use {variable} for dynamic content"
                value={templateForm.message}
                onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value as NotificationTemplate['type'] })}
              >
                <option value="push">Push Notification</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
