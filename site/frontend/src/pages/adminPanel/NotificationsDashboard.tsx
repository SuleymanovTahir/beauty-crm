// /frontend/src/pages/adminpanel/notificationsdashboard.tsx
import { useState, useEffect } from 'react';
import { Plus, Send, Mail, Smartphone, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@site/components/ui/card';
import { Button } from '@site/components/ui/button';
import { Input } from '@site/components/ui/input';
import { Badge } from '@site/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@site/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@site/components/ui/dialog';
import { Label } from '@site/components/ui/label';
import { Textarea } from '@site/components/ui/textarea';
import { toast } from 'sonner';
import { buildApiUrl } from '@site/api/client';

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
  const { t, i18n } = useTranslation(['adminpanel/notificationsdashboard', 'common']);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'email' | 'push' | 'sms'>('all');

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'push' as Notification['type'],
    target_segment: 'all', // all, active, inactive, tier-specific, appointment-based, service-based
    tier_filter: '', // bronze, silver, gold, platinum
    // Новые поля для расширенной фильтрации
    appointment_filter: '', // tomorrow, date_range, specific_date
    appointment_date: '', // для specific_date
    appointment_start_date: '', // для date_range
    appointment_end_date: '', // для date_range
    service_filter: '', // ID услуги для фильтрации по процедурам
    // Поля для планирования
    scheduled: false,
    schedule_date: '',
    schedule_time: '',
    repeat_enabled: false,
    repeat_interval: 'daily', // daily, weekly, monthly
    repeat_end_date: '',
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    title: '',
    message: '',
    type: 'push' as NotificationTemplate['type'],
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [i18n.language]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/notifications'), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.notifications) {
          setNotifications(data.notifications);
        }
      } else {
        throw new Error('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error(t('toasts.failed_load'));
    }
  };

  const loadTemplates = async () => {
    try {
      const templateLanguage = encodeURIComponent(i18n.language);
      const response = await fetch(buildApiUrl(`/api/admin/notifications/templates?lang=${templateLanguage}`), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.templates) {
          setTemplates(data.templates);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSendNotification = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/notifications/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(t('toasts.sent'));
        setShowCreateDialog(false);
        setFormData({
          title: '',
          message: '',
          type: 'push',
          target_segment: 'all',
          tier_filter: '',
          appointment_filter: '',
          appointment_date: '',
          appointment_start_date: '',
          appointment_end_date: '',
          service_filter: '',
          scheduled: false,
          schedule_date: '',
          schedule_time: '',
          repeat_enabled: false,
          repeat_interval: 'daily',
          repeat_end_date: '',
        });
        loadNotifications();
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      toast.error(t('toasts.failed_send'));
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/notifications/templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(templateForm),
      });

      if (response.ok) {
        toast.success(t('toasts.template_saved'));
        setShowTemplateDialog(false);
        setTemplateForm({
          name: '',
          title: '',
          message: '',
          type: 'push',
        });
        loadTemplates();
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      toast.error(t('toasts.failed_save_template'));
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
      title: t('stats.total_sent'),
      value: notifications.reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('stats.email_sent'),
      value: notifications.filter(n => n.type === 'email').reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('stats.push_sent'),
      value: notifications.filter(n => n.type === 'push').reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: Smartphone,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('stats.sms_sent'),
      value: notifications.filter(n => n.type === 'sms').reduce((sum, n) => sum + n.sent_count, 0).toString(),
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const typeColors: Record<Notification['type'], string> = {
    email: 'bg-blue-100 text-blue-700',
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
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
            {t('save_template')}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('send_notification')}
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
          <CardTitle>{t('templates.title')}</CardTitle>
          <CardDescription>{t('templates.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <Badge className={typeColors[template.type]}>{t(`types.${template.type}`)}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.title}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUseTemplate(template)}
                >
                  {t('templates.use_template')}
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
              <CardTitle>{t('history.title')}</CardTitle>
              <CardDescription>{t('history.description')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                {t('history.filters.all')}
              </Button>
              <Button
                variant={selectedType === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('email')}
              >
                <Mail className="w-4 h-4 mr-1" />
                {t('history.filters.email')}
              </Button>
              <Button
                variant={selectedType === 'push' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('push')}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                {t('history.filters.push')}
              </Button>
              <Button
                variant={selectedType === 'sms' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('sms')}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {t('history.filters.sms')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('history.table.status')}</TableHead>
                <TableHead>{t('history.table.title')}</TableHead>
                <TableHead>{t('history.table.type')}</TableHead>
                <TableHead>{t('history.table.recipients')}</TableHead>
                <TableHead>{t('history.table.sent_failed')}</TableHead>
                <TableHead>{t('history.table.date')}</TableHead>
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
                        <span className="text-sm capitalize">{t(`history.statuses.${notification.status}`)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-gray-500">{notification.message.substring(0, 50)}...</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[notification.type]}>{t(`types.${notification.type}`)}</Badge>
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
                          : t('history.scheduled')}
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
            <DialogTitle>{t('dialogs.send.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.send.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('dialogs.send.form.notification_type')}</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  type="button"
                  variant={formData.type === 'push' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'push' })}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  {t('types.push')}
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'email' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'email' })}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t('types.email')}
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'sms' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'sms' })}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('types.sms')}
                </Button>
              </div>
            </div>
            <div>
              <Label>{t('dialogs.send.form.title')}</Label>
              <Input
                placeholder={t('dialogs.send.form.title_placeholder')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('dialogs.send.form.message')}</Label>
              <Textarea
                placeholder={t('dialogs.send.form.message_placeholder')}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('dialogs.send.form.target_segment')}</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.target_segment}
                  onChange={(e) => setFormData({ ...formData, target_segment: e.target.value })}
                >
                  <option value="all">{t('dialogs.send.form.segments.all')}</option>
                  <option value="active">{t('dialogs.send.form.segments.active')}</option>
                  <option value="inactive">{t('dialogs.send.form.segments.inactive')}</option>
                  <option value="tier">{t('dialogs.send.form.segments.tier')}</option>
                  <option value="appointment-based">{t('dialogs.send.form.segments.appointment_based', { defaultValue: 'By Appointment' })}</option>
                  <option value="service-based">{t('dialogs.send.form.segments.service_based', { defaultValue: 'By Service' })}</option>
                </select>
              </div>
              {formData.target_segment === 'tier' && (
                <div>
                  <Label>{t('dialogs.send.form.loyalty_tier')}</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.tier_filter}
                    onChange={(e) => setFormData({ ...formData, tier_filter: e.target.value })}
                  >
                    <option value="">{t('dialogs.send.form.select_tier')}</option>
                    <option value="bronze">{t('dialogs.send.form.tiers.bronze')}</option>
                    <option value="silver">{t('dialogs.send.form.tiers.silver')}</option>
                    <option value="gold">{t('dialogs.send.form.tiers.gold')}</option>
                    <option value="platinum">{t('dialogs.send.form.tiers.platinum')}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Appointment-based filtering */}
            {formData.target_segment === 'appointment-based' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>{t('dialogs.send.form.appointment_filter', { defaultValue: 'Appointment Filter' })}</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.appointment_filter}
                    onChange={(e) => setFormData({ ...formData, appointment_filter: e.target.value })}
                  >
                    <option value="">{t('dialogs.send.form.select_filter', { defaultValue: 'Select filter' })}</option>
                    <option value="tomorrow">{t('dialogs.send.form.appointment_filters.tomorrow', { defaultValue: 'Tomorrow' })}</option>
                    <option value="specific_date">{t('dialogs.send.form.appointment_filters.specific_date', { defaultValue: 'Specific Date' })}</option>
                    <option value="date_range">{t('dialogs.send.form.appointment_filters.date_range', { defaultValue: 'Date Range' })}</option>
                  </select>
                </div>

                {formData.appointment_filter === 'specific_date' && (
                  <div>
                    <Label>{t('dialogs.send.form.appointment_date', { defaultValue: 'Appointment Date' })}</Label>
                    <Input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    />
                  </div>
                )}

                {formData.appointment_filter === 'date_range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('dialogs.send.form.start_date', { defaultValue: 'Start Date' })}</Label>
                      <Input
                        type="date"
                        value={formData.appointment_start_date}
                        onChange={(e) => setFormData({ ...formData, appointment_start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('dialogs.send.form.end_date', { defaultValue: 'End Date' })}</Label>
                      <Input
                        type="date"
                        value={formData.appointment_end_date}
                        onChange={(e) => setFormData({ ...formData, appointment_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Service-based filtering */}
            {formData.target_segment === 'service-based' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>{t('dialogs.send.form.service_filter', { defaultValue: 'Service/Procedure' })}</Label>
                  <Input
                    placeholder={t('dialogs.send.form.service_placeholder', { defaultValue: 'Enter service name or ID' })}
                    value={formData.service_filter}
                    onChange={(e) => setFormData({ ...formData, service_filter: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('dialogs.send.form.service_hint', { defaultValue: 'Clients who booked this service will receive the notification' })}
                  </p>
                </div>
              </div>
            )}

            {/* Scheduling section */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scheduled"
                  checked={formData.scheduled}
                  onChange={(e) => setFormData({ ...formData, scheduled: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="scheduled" className="cursor-pointer">
                  {t('dialogs.send.form.schedule_notification', { defaultValue: 'Schedule Notification' })}
                </Label>
              </div>

              {formData.scheduled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('dialogs.send.form.schedule_date', { defaultValue: 'Send Date' })}</Label>
                      <Input
                        type="date"
                        value={formData.schedule_date}
                        onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('dialogs.send.form.schedule_time', { defaultValue: 'Send Time' })}</Label>
                      <Input
                        type="time"
                        value={formData.schedule_time}
                        onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="repeat_enabled"
                      checked={formData.repeat_enabled}
                      onChange={(e) => setFormData({ ...formData, repeat_enabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="repeat_enabled" className="cursor-pointer">
                      {t('dialogs.send.form.repeat_notification', { defaultValue: 'Repeat Notification' })}
                    </Label>
                  </div>

                  {formData.repeat_enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('dialogs.send.form.repeat_interval', { defaultValue: 'Repeat Interval' })}</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={formData.repeat_interval}
                          onChange={(e) => setFormData({ ...formData, repeat_interval: e.target.value })}
                        >
                          <option value="daily">{t('dialogs.send.form.repeat_intervals.daily', { defaultValue: 'Daily' })}</option>
                          <option value="weekly">{t('dialogs.send.form.repeat_intervals.weekly', { defaultValue: 'Weekly' })}</option>
                          <option value="monthly">{t('dialogs.send.form.repeat_intervals.monthly', { defaultValue: 'Monthly' })}</option>
                        </select>
                      </div>
                      <div>
                        <Label>{t('dialogs.send.form.repeat_end_date', { defaultValue: 'End Repeat On' })}</Label>
                        <Input
                          type="date"
                          value={formData.repeat_end_date}
                          onChange={(e) => setFormData({ ...formData, repeat_end_date: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSendNotification}>
              <Send className="w-4 h-4 mr-2" />
              {t('buttons.send_notification')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.template.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.template.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('dialogs.template.form.template_name')}</Label>
              <Input
                placeholder={t('dialogs.template.form.template_name_placeholder')}
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('dialogs.template.form.title')}</Label>
              <Input
                placeholder={t('dialogs.template.form.title_placeholder')}
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('dialogs.template.form.message')}</Label>
              <Textarea
                placeholder={t('dialogs.template.form.message_placeholder')}
                value={templateForm.message}
                onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>{t('dialogs.template.form.type')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value as NotificationTemplate['type'] })}
              >
                <option value="push">{t('dialogs.template.form.types.push')}</option>
                <option value="email">{t('dialogs.template.form.types.email')}</option>
                <option value="sms">{t('dialogs.template.form.types.sms')}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSaveTemplate}>{t('buttons.save_template')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
