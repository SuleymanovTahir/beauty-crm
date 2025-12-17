import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Calendar, Clock, User, LogOut, Settings } from 'lucide-react';

const upcomingBookings = [
  { id: 1, service: 'Маникюр', master: 'Елена Смирнова', date: '2024-12-20', time: '14:00', status: 'confirmed' },
  { id: 2, service: 'Стрижка', master: 'Anna Ivanova', date: '2024-12-22', time: '16:30', status: 'confirmed' },
];

const pastBookings = [
  { id: 3, service: 'Окрашивание', master: 'Maria Santos', date: '2024-12-10', time: '11:00', status: 'completed' },
  { id: 4, service: 'Педикюр', master: 'Sofia Rodriguez', date: '2024-12-05', time: '15:00', status: 'completed' },
];

const availableSlots = [
  { master: 'Елена Смирнова', date: '2024-12-19', slots: ['10:00', '12:00', '14:00', '16:00'] },
  { master: 'Anna Ivanova', date: '2024-12-19', slots: ['11:00', '13:00', '15:00', '17:00'] },
  { master: 'Maria Santos', date: '2024-12-20', slots: ['10:30', '12:30', '14:30', '16:30'] },
];

export function AccountPage() {
  const [activeTab, setActiveTab] = useState('bookings');

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Добро пожаловать!</h1>
                <p className="text-sm opacity-90">client@example.com</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'bookings'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            Мои записи
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-6 py-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'available'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            Доступные окна
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            Настройки
          </button>
        </div>

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Предстоящие записи</h2>
              <div className="grid gap-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="bg-card rounded-lg p-4 border border-border shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{booking.service}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Мастер: {booking.master}
                          </p>
                          <p className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.date).toLocaleDateString('ru-RU')}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {booking.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Подтверждено
                        </span>
                        <Button variant="outline" size="sm" className="text-xs">
                          Отменить
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">История записей</h2>
              <div className="grid gap-4">
                {pastBookings.map((booking) => (
                  <div key={booking.id} className="bg-card rounded-lg p-4 border border-border shadow-sm opacity-75">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{booking.service}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Мастер: {booking.master}</p>
                          <p>{new Date(booking.date).toLocaleDateString('ru-RU')} в {booking.time}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        Завершено
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'available' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Свободные окна мастеров</h2>
            {availableSlots.map((slot, index) => (
              <div key={index} className="bg-card rounded-lg p-4 sm:p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{slot.master}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(slot.date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {slot.slots.map((time) => (
                    <button
                      key={time}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-6">Настройки профиля</h2>
            <div className="bg-card rounded-lg p-6 border border-border shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Имя</label>
                <input
                  type="text"
                  defaultValue="Client Name"
                  className="w-full px-3 py-2 border border-input rounded-md bg-input-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue="client@example.com"
                  className="w-full px-3 py-2 border border-input rounded-md bg-input-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Телефон</label>
                <input
                  type="tel"
                  defaultValue="+971 XX XXX XXXX"
                  className="w-full px-3 py-2 border border-input rounded-md bg-input-background"
                />
              </div>
              <div className="pt-4">
                <Button className="hero-button-primary">
                  <Settings className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </Button>
              </div>
            </div>

            <div className="mt-6 bg-card rounded-lg p-6 border border-border shadow-sm">
              <h3 className="font-semibold mb-4">Уведомления</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Email уведомления о записях</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">SMS напоминания за день до визита</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Новости и специальные предложения</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="text-primary hover:underline">
            ← Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
}
