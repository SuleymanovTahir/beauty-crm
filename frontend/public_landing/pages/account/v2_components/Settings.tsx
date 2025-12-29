import { useState } from 'react';
import { User, Lock, Bell, Eye, Download, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

export function Settings({ user }: any) {

  // Use user prop for default values
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    birthday: user?.birthday || '',
  });
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    appointments: true,
    promotions: true,
    achievements: true,
  });
  const [privacy, setPrivacy] = useState({
    allowPhotos: true,
    shareWithMasters: true,
    publicProfile: false,
  });

  const handleSaveProfile = () => {
    toast.success('Профиль обновлен');
  };

  const handleChangePassword = () => {
    toast.info('Функция смены пароля будет доступна в следующей версии');
  };

  const handleEnable2FA = () => {
    toast.info('Двухфакторная аутентификация будет доступна в следующей версии');
  };

  const handleExportData = () => {
    toast.success('Экспорт данных начат. Вы получите файл на email');
  };

  const handleDeleteAccount = () => {
    toast.error('Для удаления аккаунта свяжитесь с поддержкой');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent inline-block">
          Настройки
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Управление профилем и приватностью</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Профиль</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
            <Lock className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Безопасность</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
            <Bell className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Уведомления</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
            <Eye className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Приватность</span>
          </TabsTrigger>
        </TabsList>

        {/* Профиль */}
        <TabsContent value="profile" className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
          <Card className="border-gray-100 shadow-sm overflow-hidden">

            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle>Личная информация</CardTitle>
              <CardDescription>Обновите ваши данные</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                <div className="relative group cursor-pointer">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                    <AvatarImage src={user?.avatar_url} alt={formData.name} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-pink-100 to-purple-100 text-pink-600">
                      {formData.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold">Изменить</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Имя</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-gray-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Телефон</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-gray-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-gray-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Дата рождения</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className="bg-gray-50/50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveProfile} className="bg-gray-900 text-white hover:bg-gray-800">
                      Сохранить изменения
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Безопасность */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Пароль</CardTitle>
              <CardDescription>Измените ваш пароль</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Текущий пароль</Label>
                <Input id="current-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input id="new-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                <Input id="confirm-password" type="password" />
              </div>

              <Button onClick={handleChangePassword}>Изменить пароль</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Двухфакторная аутентификация (2FA)</CardTitle>
              <CardDescription>
                Дополнительный уровень защиты вашего аккаунта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">SMS-код</div>
                  <p className="text-sm text-muted-foreground">
                    Получайте код подтверждения на телефон
                  </p>
                </div>
                <Button variant="outline" onClick={handleEnable2FA}>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Включить
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Экспорт данных</CardTitle>
              <CardDescription>Скачайте копию ваших данных</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Экспортировать данные
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Опасная зона</CardTitle>
              <CardDescription>Необратимые действия</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Удалить аккаунт
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Уведомления */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Каналы уведомлений</CardTitle>
              <CardDescription>Выберите способы получения уведомлений</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Push-уведомления</div>
                  <p className="text-sm text-muted-foreground">
                    Получайте уведомления в приложении
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Email</div>
                  <p className="text-sm text-muted-foreground">
                    Отправлять уведомления на почту
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">SMS</div>
                  <p className="text-sm text-muted-foreground">
                    Получайте SMS-уведомления
                  </p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, sms: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Типы уведомлений</CardTitle>
              <CardDescription>Что вы хотите получать</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Записи</div>
                  <p className="text-sm text-muted-foreground">
                    Напоминания о предстоящих визитах
                  </p>
                </div>
                <Switch
                  checked={notifications.appointments}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, appointments: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Акции и предложения</div>
                  <p className="text-sm text-muted-foreground">
                    Специальные предложения и скидки
                  </p>
                </div>
                <Switch
                  checked={notifications.promotions}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, promotions: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Достижения</div>
                  <p className="text-sm text-muted-foreground">
                    Новые награды и челленджи
                  </p>
                </div>
                <Switch
                  checked={notifications.achievements}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, achievements: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Приватность */}
        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки приватности</CardTitle>
              <CardDescription>Контролируйте ваши данные</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Разрешение на фото</div>
                  <p className="text-sm text-muted-foreground">
                    Разрешить мастерам делать фото до/после
                  </p>
                </div>
                <Switch
                  checked={privacy.allowPhotos}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, allowPhotos: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Доступ мастеров</div>
                  <p className="text-sm text-muted-foreground">
                    Делиться историей визитов с мастерами
                  </p>
                </div>
                <Switch
                  checked={privacy.shareWithMasters}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, shareWithMasters: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Публичный профиль</div>
                  <p className="text-sm text-muted-foreground">
                    Показывать ваши достижения другим клиентам
                  </p>
                </div>
                <Switch
                  checked={privacy.publicProfile}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, publicProfile: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Использование данных</CardTitle>
              <CardDescription>
                Как мы используем ваши данные для улучшения сервиса
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                • Ваши данные используются только для персонализации услуг
              </p>
              <p>
                • Мы не передаем информацию третьим лицам без вашего согласия
              </p>
              <p>
                • Фотографии используются только в личной галерее и для анализа
              </p>
              <p>
                • Вы можете запросить удаление всех данных в любое время
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs >
    </div >
  );
}
