import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Loader, Bot } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner@2.0.3';

interface BotConfig {
  bot_name: string;
  greeting_message: string;
  farewell_message: string;
  price_message: string;
  booking_url: string;
  salon_address: string;
  salon_phone: string;
  salon_hours: string;
  google_maps_link: string;
  personality: string;
}

export default function BotSettings() {
  const [config, setConfig] = useState<BotConfig>({
    bot_name: 'Diamant',
    greeting_message: 'Привет! 😊 Добро пожаловать в M.Le Diamant!',
    farewell_message: 'Спасибо за визит! Ждём вас снова! 💖',
    price_message: 'Мы в премиум-сегменте 💎',
    booking_url: 'https://n1314037.alteg.io',
    salon_address: 'Shop 13, Amwaj 3 Plaza Level, Jumeirah Beach Residence, Dubai',
    salon_phone: '+971 50 123 4567',
    salon_hours: 'Ежедневно 10:30 - 21:00',
    google_maps_link: 'https://maps.app.goo.gl/Puh5X1bNEjWPiToz6',
    personality: 'Обаятельная, уверенная, харизматичная. Эксперт в beauty-индустрии.'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBotSettings = async () => {
      try {
        const response = await fetch('/api/bot-settings', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (err) {
        console.error('Error fetching bot settings:', err);
        // Используем default значения
      } finally {
        setLoading(false);
      }
    };

    fetchBotSettings();
  }, []);

  const handleInputChange = (field: keyof BotConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/bot-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast.success('Настройки бота сохранены! 🎉');
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error('Error saving bot settings:', err);
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Вы уверены? Все изменения будут отменены.')) {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-pink-600" />
        <span className="ml-2 text-gray-600">Загрузка настроек...</span>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl text-gray-900 mb-2 flex items-center gap-3">
          <Bot className="w-10 h-10 text-pink-600" />
          Настройки AI-бота
        </h1>
        <p className="text-gray-600">Настройте параметры виртуального ассистента салона</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Bot Identity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl text-gray-900 mb-6">🤖 Личность бота</h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="bot_name">Имя бота</Label>
              <Input
                id="bot_name"
                value={config.bot_name}
                onChange={(e) => handleInputChange('bot_name', e.target.value)}
                placeholder="Diamant"
              />
              <p className="text-sm text-gray-500 mt-2">Имя, которое бот будет использовать в общении</p>
            </div>

            <div>
              <Label htmlFor="personality">Описание личности</Label>
              <Textarea
                id="personality"
                value={config.personality}
                onChange={(e) => handleInputChange('personality', e.target.value)}
                placeholder="Обаятельная, уверенная, харизматичная..."
                className="min-h-[120px]"
              />
              <p className="text-sm text-gray-500 mt-2">Как бот должен себя вести и общаться</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl text-gray-900 mb-6">💬 Сообщения бота</h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="greeting_message">Приветствие</Label>
              <Textarea
                id="greeting_message"
                value={config.greeting_message}
                onChange={(e) => handleInputChange('greeting_message', e.target.value)}
                placeholder="Привет! 😊 Добро пожаловать в M.Le Diamant!"
                className="min-h-[80px]"
              />
              <p className="text-sm text-gray-500 mt-2">Первое сообщение клиенту</p>
            </div>

            <div>
              <Label htmlFor="farewell_message">Прощание</Label>
              <Textarea
                id="farewell_message"
                value={config.farewell_message}
                onChange={(e) => handleInputChange('farewell_message', e.target.value)}
                placeholder="Спасибо за визит!"
                className="min-h-[80px]"
              />
              <p className="text-sm text-gray-500 mt-2">Сообщение при завершении диалога</p>
            </div>

            <div>
              <Label htmlFor="price_message">Фраза о ценах (премиум-сегмент)</Label>
              <Textarea
                id="price_message"
                value={config.price_message}
                onChange={(e) => handleInputChange('price_message', e.target.value)}
                placeholder="Мы в премиум-сегменте 💎"
                className="min-h-[80px]"
              />
              <p className="text-sm text-gray-500 mt-2">Как бот объясняет высокие цены и ценность услуг</p>
            </div>
          </div>
        </div>

        {/* Salon Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl text-gray-900 mb-6">🏢 Информация о салоне</h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="salon_address">Адрес</Label>
              <Input
                id="salon_address"
                value={config.salon_address}
                onChange={(e) => handleInputChange('salon_address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="salon_phone">Телефон</Label>
                <Input
                  id="salon_phone"
                  value={config.salon_phone}
                  onChange={(e) => handleInputChange('salon_phone', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="salon_hours">Часы работы</Label>
                <Input
                  id="salon_hours"
                  value={config.salon_hours}
                  onChange={(e) => handleInputChange('salon_hours', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="booking_url">Ссылка на запись</Label>
                <Input
                  id="booking_url"
                  type="url"
                  value={config.booking_url}
                  onChange={(e) => handleInputChange('booking_url', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="google_maps_link">Google Maps ссылка</Label>
                <Input
                  id="google_maps_link"
                  type="url"
                  value={config.google_maps_link}
                  onChange={(e) => handleInputChange('google_maps_link', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">💡 Совет</h3>
            <p className="text-blue-800 text-sm">
              Все изменения будут применены к ботам, которые начнут новый диалог.
              Текущие диалоги не будут затронуты. Сохраните данные перед выходом.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
            size="lg"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
