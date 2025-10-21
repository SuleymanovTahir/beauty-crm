import React, { useState } from 'react';
import { Settings as SettingsIcon, Globe, Bell, Bot, Shield, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner@2.0.3';

export default function Settings() {
  const [generalSettings, setGeneralSettings] = useState({
    salonName: 'Luxury Beauty Salon',
    city: 'Dubai',
    address: 'Dubai Marina, Marina Plaza, Office 2301',
    phone: '+971 50 123 4567',
    email: 'info@luxurybeauty.ae',
    instagram: '@luxurybeauty_dubai',
    language: 'ru'
  });

  const [botSettings, setBotSettings] = useState({
    enabled: true,
    autoReply: true,
    welcomeMessage: 'Здравствуйте! Спасибо, что обратились в Luxury Beauty Salon. Чем могу помочь?',
    bookingConfirmation: 'Ваша запись подтверждена! Мы ждем вас {date} в {time}.',
    reminderMessage: 'Напоминаем о вашей записи завтра в {time}. Ждем вас!',
    workingHours: '9:00 - 21:00',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    bookingNotifications: true,
    marketingEmails: true,
    birthdayReminders: true,
    birthdayDaysAdvance: 7,
  });

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Основные настройки сохранены');
  };

  const handleSaveBot = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Настройки бота сохранены');
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Настройки уведомлений сохранены');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-pink-600" />
          Настройки системы
        </h1>
        <p className="text-gray-600">Управление параметрами CRM</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Общие</span>
          </TabsTrigger>
          <TabsTrigger value="bot" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Бот</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Уведомления</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Безопасность</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Основные настройки</h2>
            
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="salonName">Название салона *</Label>
                  <Input
                    id="salonName"
                    value={generalSettings.salonName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, salonName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="language">Язык системы</Label>
                  <Select value={generalSettings.language} onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="city">Город</Label>
                  <Input
                    id="city"
                    value={generalSettings.city}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, city: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={generalSettings.phone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={generalSettings.address}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={generalSettings.email}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={generalSettings.instagram}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, instagram: e.target.value })}
                    placeholder="@username"
                  />
                </div>
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                Сохранить изменения
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Bot Settings */}
        <TabsContent value="bot">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Настройки бота и автоответов</h2>
            
            <form onSubmit={handleSaveBot} className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bot className="w-6 h-6 text-pink-600" />
                  <div>
                    <p className="text-sm text-gray-900">Включить бота</p>
                    <p className="text-xs text-gray-600">Автоматические ответы на сообщения</p>
                  </div>
                </div>
                <Switch
                  checked={botSettings.enabled}
                  onCheckedChange={(checked) => setBotSettings({ ...botSettings, enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-900">Автоответы</p>
                    <p className="text-xs text-gray-600">Мгновенный ответ на первое сообщение</p>
                  </div>
                </div>
                <Switch
                  checked={botSettings.autoReply}
                  onCheckedChange={(checked) => setBotSettings({ ...botSettings, autoReply: checked })}
                  disabled={!botSettings.enabled}
                />
              </div>

              <div>
                <Label htmlFor="welcomeMessage">Приветственное сообщение</Label>
                <Textarea
                  id="welcomeMessage"
                  value={botSettings.welcomeMessage}
                  onChange={(e) => setBotSettings({ ...botSettings, welcomeMessage: e.target.value })}
                  className="min-h-[100px]"
                  disabled={!botSettings.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Это сообщение будет отправлено клиенту при первом обращении
                </p>
              </div>

              <div>
                <Label htmlFor="bookingConfirmation">Подтверждение записи</Label>
                <Textarea
                  id="bookingConfirmation"
                  value={botSettings.bookingConfirmation}
                  onChange={(e) => setBotSettings({ ...botSettings, bookingConfirmation: e.target.value })}
                  className="min-h-[80px]"
                  disabled={!botSettings.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Доступные переменные: {'{date}'}, {'{time}'}, {'{service}'}
                </p>
              </div>

              <div>
                <Label htmlFor="reminderMessage">Напоминание о записи</Label>
                <Textarea
                  id="reminderMessage"
                  value={botSettings.reminderMessage}
                  onChange={(e) => setBotSettings({ ...botSettings, reminderMessage: e.target.value })}
                  className="min-h-[80px]"
                  disabled={!botSettings.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Отправляется за 24 часа до визита
                </p>
              </div>

              <div>
                <Label htmlFor="workingHours">Часы работы</Label>
                <Input
                  id="workingHours"
                  value={botSettings.workingHours}
                  onChange={(e) => setBotSettings({ ...botSettings, workingHours: e.target.value })}
                  placeholder="9:00 - 21:00"
                  disabled={!botSettings.enabled}
                />
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                Сохранить настройки бота
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Настройки уведомлений</h2>
            
            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">Каналы уведомлений</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-900">Email уведомления</p>
                      <p className="text-xs text-gray-600">Получать уведомления на почту</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-900">SMS уведомления</p>
                      <p className="text-xs text-gray-600">Получать SMS на телефон</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, smsNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-900">Push уведомления</p>
                      <p className="text-xs text-gray-600">Уведомления в браузере</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, pushNotifications: checked })}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">Типы уведомлений</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">Уведомления о записях</p>
                    <p className="text-xs text-gray-600">Новые записи, изменения, отмены</p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, bookingNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">Маркетинговые рассылки</p>
                    <p className="text-xs text-gray-600">Акции, специальные предложения</p>
                  </div>
                  <Switch
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, marketingEmails: checked })}
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">Напоминания о днях рождения</p>
                      <p className="text-xs text-gray-600">Уведомления сотрудников о ДР клиентов</p>
                    </div>
                    <Switch
                      checked={notificationSettings.birthdayReminders}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, birthdayReminders: checked })}
                    />
                  </div>
                  
                  {notificationSettings.birthdayReminders && (
                    <div>
                      <Label htmlFor="birthdayDays">Напоминать за (дней)</Label>
                      <Select 
                        value={notificationSettings.birthdayDaysAdvance.toString()} 
                        onValueChange={(value) => setNotificationSettings({ ...notificationSettings, birthdayDaysAdvance: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 дня</SelectItem>
                          <SelectItem value="7">7 дней (неделя)</SelectItem>
                          <SelectItem value="14">14 дней (2 недели)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                Сохранить настройки уведомлений
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Безопасность и доступ</h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm text-gray-900 mb-2">Рекомендации по безопасности</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• Используйте сложные пароли (минимум 8 символов)</li>
                      <li>• Регулярно меняйте пароли сотрудников</li>
                      <li>• Не передавайте учетные данные третьим лицам</li>
                      <li>• Проверяйте активные сессии пользователей</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg text-gray-900 mb-4">Управление сессиями</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Просмотрите активные сессии пользователей и завершите подозрительные соединения
                </p>
                <Button variant="outline">
                  Просмотреть активные сессии
                </Button>
              </div>

              <div>
                <h3 className="text-lg text-gray-900 mb-4">Резервное копирование</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Скачайте резервную копию всех данных системы
                </p>
                <Button variant="outline">
                  Скачать данные
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
