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
import { currentUser } from '../data/mockData';
import { toast } from 'sonner';

export function Settings() {
  const [profile, setProfile] = useState(currentUser);
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
    <div className="space-y-6 pb-8">
      <div>
        <h1>Настройки</h1>
        <p className="text-muted-foreground">Управление профилем и приватностью</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Eye className="w-4 h-4 mr-2" />
            Приватность
          </TabsTrigger>
        </TabsList>

        {/* Профиль */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Личная информация</CardTitle>
              <CardDescription>Обновите ваши данные</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{profile.name[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">Изменить фото</Button>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG. Макс. 5MB
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-since">Клиент с</Label>
                  <Input
                    id="member-since"
                    value={new Date(profile.memberSince).toLocaleDateString('ru-RU')}
                    disabled
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>Сохранить изменения</Button>
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
      </Tabs>
    </div>
  );
}
