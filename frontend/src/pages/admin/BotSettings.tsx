// frontend/src/pages/admin/BotSettings.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ✅ ФИКС 1: Все поля теперь корректно сохраняются
// ✅ ФИКС 2: Поле языков заменено на мультиселект с чекбоксами

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Save, Bot, MessageSquare, DollarSign, Calendar, AlertCircle, Globe, Sparkles, BookOpen, Shield } from 'lucide-react';

interface BotSettings {
  bot_name: string;
  personality_traits: string;
  greeting_message: string;
  farewell_message: string;
  price_explanation: string;
  salon_name: string;
  salon_address: string;
  salon_phone: string;
  salon_hours: string;
  booking_url: string;
  google_maps_link: string;
  communication_style: string;
  max_message_length: number;
  price_response_template: string;
  booking_redirect_message: string;
  premium_justification: string;
  fomo_messages: string;
  upsell_techniques: string;
  languages_supported: string;
  emoji_usage: string;
  objection_handling: string;
  safety_guidelines: string;
  example_good_responses: string;
  algorithm_actions: string;
  negative_handling: string;
  location_features: string;
  seasonality: string;
  emergency_situations: string;
  success_metrics: string;
}

type TabType = 'general' | 'personality' | 'pricing' | 'booking' | 'communication' | 'advanced' | 'safety';

// Список доступных языков
const AVAILABLE_LANGUAGES = [
  { code: 'ru', name: 'Русский', englishName: 'Russian', flag: '🇷🇺', note: 'основной' },
  { code: 'en', name: 'English', englishName: 'English', flag: '🇬🇧', note: 'international' },
  { code: 'ar', name: 'العربية', englishName: 'Arabic', flag: '🇸🇦', note: 'местный' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳', note: 'индийцы' },
  { code: 'ur', name: 'اردو', englishName: 'Urdu', flag: '🇵🇰', note: 'пакистанцы' },
  { code: 'tl', name: 'Filipino', englishName: 'Filipino/Tagalog', flag: '🇵🇭', note: 'филиппинцы' },
  { code: 'kk', name: 'Қазақша', englishName: 'Kazakh', flag: '🇰🇿', note: 'казахи' },
  { code: 'es', name: 'Español', englishName: 'Spanish', flag: '🇪🇸', note: 'испанцы' },
  { code: 'uk', name: 'Українська', englishName: 'Ukrainian', flag: '🇺🇦', note: 'украинцы' },
  { code: 'pt', name: 'Português', englishName: 'Portuguese', flag: '🇵🇹', note: 'португальцы' },
];

export default function BotSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BotSettings>({
    bot_name: '',
    personality_traits: '',
    greeting_message: '',
    farewell_message: '',
    price_explanation: '',
    salon_name: '',
    salon_address: '',
    salon_phone: '',
    salon_hours: '',
    booking_url: '',
    google_maps_link: '',
    communication_style: '',
    max_message_length: 4,
    price_response_template: '',
    booking_redirect_message: '',
    premium_justification: '',
    fomo_messages: '',
    upsell_techniques: '',
    languages_supported: 'ru,en,ar',
    emoji_usage: '',
    objection_handling: '',
    safety_guidelines: '',
    example_good_responses: '',
    algorithm_actions: '',
    negative_handling: '',
    location_features: '',
    seasonality: '',
    emergency_situations: '',
    success_metrics: ''
  });

  // Состояние для выбранных языков
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['ru', 'en', 'ar']);

  useEffect(() => {
    loadSettings();
  }, []);

  // Синхронизация selectedLanguages с settings.languages_supported
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      languages_supported: selectedLanguages.join(',')
    }));
  }, [selectedLanguages]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getBotSettings();
      
      // Парсим languages_supported
      const langs = data.languages_supported ? data.languages_supported.split(',') : ['ru', 'en', 'ar'];
      setSelectedLanguages(langs);
      
      setSettings({
        bot_name: data.bot_name || 'M.Le Diamant Assistant',
        personality_traits: data.personality_traits || 'Обаятельная, уверенная, харизматичная',
        greeting_message: data.greeting_message || 'Привет! 😊 Добро пожаловать в M.Le Diamant!',
        farewell_message: data.farewell_message || 'Спасибо за визит! Ждём вас снова! 💖',
        price_explanation: data.price_explanation || 'Мы в премиум-сегменте 💎',
        salon_name: data.salon_name || 'M.Le Diamant Beauty Lounge',
        salon_address: data.salon_address || 'Shop 13, Amwaj 3 Plaza, JBR, Dubai',
        salon_phone: data.salon_phone || '+971 XX XXX XXXX',
        salon_hours: data.salon_hours || 'Ежедневно 10:30 - 21:00',
        booking_url: data.booking_url || '',
        google_maps_link: data.google_maps_link || 'https://maps.app.goo.gl/Puh5X1bNEjWPiToz6',
        communication_style: data.communication_style || 'Дружелюбный, экспертный, вдохновляющий',
        max_message_length: data.max_message_length || 4,
        price_response_template: data.price_response_template || '{SERVICE} - {PRICE} {CURRENCY}. Это включает {BENEFITS} и результат на {DURATION}! {EMOTIONAL_HOOK}',
        booking_redirect_message: data.booking_redirect_message || 'Я AI-ассистент и не могу записать вас напрямую, но это легко сделать онлайн! 🎯\n\n📱 Запишитесь за 2 минуты: {BOOKING_URL}',
        premium_justification: data.premium_justification || 'Да, мы в премиум-сегменте 💎 Зато наши мастера - лучшие в JBR!',
        fomo_messages: data.fomo_messages || 'Кстати, на эту неделю уже мало свободных окон...|Сегодня особенно много запросов!',
        upsell_techniques: data.upsell_techniques || 'Многие клиенты берут брови + ресницы со скидкой!|После маникюра рекомендую педикюр!',
        languages_supported: langs.join(','),
        emoji_usage: data.emoji_usage || 'Умеренное (2-3 на сообщение), уместное',
        objection_handling: data.objection_handling || '"Дорого" → Подчеркни качество\n"Нет времени" → Запись за 2 минуты онлайн',
        safety_guidelines: data.safety_guidelines || 'Не разглашай личную информацию\nНе делай медицинских рекомендаций',
        example_good_responses: data.example_good_responses || '✅ "Gelish маникюр - 130 AED 💅"\n❌ "Маникюр 130 AED"',
        algorithm_actions: data.algorithm_actions || 'ЭТАП 1: Поприветствуй\nЭТАП 2: Консультация\nЭТАП 3: Направь на запись',
        negative_handling: data.negative_handling || 'При жалобе: извинись искренне, предложи решение',
        location_features: data.location_features || 'JBR - престижный район, рядом с пляжем',
        seasonality: data.seasonality || 'Лето: indoor процедуры\nЗима: можно прогулку после',
        emergency_situations: data.emergency_situations || 'При агрессии: оставайся спокойной',
        success_metrics: data.success_metrics || 'Клиент перешел на запись\nПолучил полную информацию'
      });
    } catch (err) {
      console.error('Load error:', err);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Сохранение настроек:', settings);
      await api.updateBotSettings(settings);
      toast.success('✅ Настройки бота успешно сохранены!');
    } catch (err: any) {
      console.error('❌ Save error:', err);
      toast.error('❌ Ошибка сохранения: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (langCode: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(langCode)) {
        // Не позволяем убрать последний язык
        if (prev.length === 1) {
          toast.error('Должен быть выбран хотя бы один язык');
          return prev;
        }
        return prev.filter(l => l !== langCode);
      } else {
        return [...prev, langCode];
      }
    });
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'Основное', icon: <Bot size={18} /> },
    { id: 'personality', label: 'Личность', icon: <Sparkles size={18} /> },
    { id: 'pricing', label: 'Цены', icon: <DollarSign size={18} /> },
    { id: 'booking', label: 'Запись', icon: <Calendar size={18} /> },
    { id: 'communication', label: 'Общение', icon: <MessageSquare size={18} /> },
    { id: 'advanced', label: 'Продвинутое', icon: <BookOpen size={18} /> },
    { id: 'safety', label: 'Безопасность', icon: <Shield size={18} /> }
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="inline-block animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
            🤖 Настройки бота
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Настройте поведение AI-ассистента салона красоты
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: saving ? '#9ca3af' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s'
          }}
        >
          <Save size={18} />
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
        padding: '0.5rem',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.625rem 1rem',
              backgroundColor: activeTab === tab.id ? '#ede9fe' : 'transparent',
              border: activeTab === tab.id ? '2px solid #a78bfa' : '2px solid transparent',
              borderRadius: '0.5rem',
              color: activeTab === tab.id ? '#6b21a8' : '#6b7280',
              fontWeight: activeTab === tab.id ? '600' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '2rem'
      }}>
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              🏢 Основная информация
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Имя бота
              </label>
              <input
                type="text"
                value={settings.bot_name}
                onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
                placeholder="M.Le Diamant Assistant"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Название салона
              </label>
              <input
                type="text"
                value={settings.salon_name}
                onChange={(e) => setSettings({ ...settings, salon_name: e.target.value })}
                placeholder="M.Le Diamant Beauty Lounge"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Адрес салона
              </label>
              <input
                type="text"
                value={settings.salon_address}
                onChange={(e) => setSettings({ ...settings, salon_address: e.target.value })}
                placeholder="Shop 13, Amwaj 3 Plaza, JBR, Dubai"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Телефон
                </label>
                <input
                  type="text"
                  value={settings.salon_phone}
                  onChange={(e) => setSettings({ ...settings, salon_phone: e.target.value })}
                  placeholder="+971 XX XXX XXXX"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Часы работы
                </label>
                <input
                  type="text"
                  value={settings.salon_hours}
                  onChange={(e) => setSettings({ ...settings, salon_hours: e.target.value })}
                  placeholder="Ежедневно 10:30 - 21:00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📍 Ссылка на Google Maps
              </label>
              <input
                type="url"
                value={settings.google_maps_link}
                onChange={(e) => setSettings({ ...settings, google_maps_link: e.target.value })}
                placeholder="https://maps.app.goo.gl/..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🔗 Ссылка на онлайн-запись (YClients)
              </label>
              <input
                type="url"
                value={settings.booking_url}
                onChange={(e) => setSettings({ ...settings, booking_url: e.target.value })}
                placeholder="https://n1234567.yclients.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                ⚠️ Эта ссылка используется для направления клиентов на запись
              </p>
            </div>
          </div>
        )}

        {/* PERSONALITY TAB */}
        {activeTab === 'personality' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              ✨ Личность бота
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Черты характера
              </label>
              <textarea
                value={settings.personality_traits}
                onChange={(e) => setSettings({ ...settings, personality_traits: e.target.value })}
                placeholder="Обаятельная, уверенная, харизматичная"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                👋 Приветственное сообщение
              </label>
              <textarea
                value={settings.greeting_message}
                onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
                placeholder="Привет! 😊 Добро пожаловать в M.Le Diamant!"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                👋 Прощальное сообщение
              </label>
              <textarea
                value={settings.farewell_message}
                onChange={(e) => setSettings({ ...settings, farewell_message: e.target.value })}
                placeholder="Спасибо за визит! Ждём вас снова! 💖"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🎨 Стиль общения
              </label>
              <input
                type="text"
                value={settings.communication_style}
                onChange={(e) => setSettings({ ...settings, communication_style: e.target.value })}
                placeholder="Дружелюбный, экспертный, вдохновляющий"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📏 Максимальная длина сообщения (предложений)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.max_message_length}
                onChange={(e) => setSettings({ ...settings, max_message_length: parseInt(e.target.value) || 4 })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Рекомендуется 2-4 предложения для краткости
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                😊 Использование эмодзи
              </label>
              <textarea
                value={settings.emoji_usage}
                onChange={(e) => setSettings({ ...settings, emoji_usage: e.target.value })}
                placeholder="Умеренное (2-3 на сообщение), уместное"
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* ✅ НОВЫЙ МУЛЬТИСЕЛЕКТ ЯЗЫКОВ */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.75rem', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={18} />
                🌍 Поддерживаемые языки
              </label>
              <div style={{
                border: '2px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb'
              }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Выберите языки, на которых бот может общаться с клиентами:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <label
                      key={lang.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: selectedLanguages.includes(lang.code) ? '2px solid #a78bfa' : '2px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        backgroundColor: selectedLanguages.includes(lang.code) ? '#f3e8ff' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedLanguages.includes(lang.code)) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedLanguages.includes(lang.code)) {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang.code)}
                        onChange={() => toggleLanguage(lang.code)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#a78bfa'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{lang.flag}</span>
                          <span>{lang.englishName}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {lang.name} • {lang.note}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.75rem' }}>
                  ✅ Выбрано языков: <strong>{selectedLanguages.length}</strong> из {AVAILABLE_LANGUAGES.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              💰 Работа с ценами
            </h2>

            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '0.5rem',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <AlertCircle size={20} color="#92400e" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Важно о ценах:
                </p>
                <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                  Бот должен не просто называть цену, а оправдывать её ценностью: качество, материалы, долговременность
                </p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                💎 Объяснение премиум-цен
              </label>
              <textarea
                value={settings.price_explanation}
                onChange={(e) => setSettings({ ...settings, price_explanation: e.target.value })}
                placeholder="Мы в премиум-сегменте 💎"
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📝 Шаблон ответа на вопрос о цене
              </label>
              <textarea
                value={settings.price_response_template}
                onChange={(e) => setSettings({ ...settings, price_response_template: e.target.value })}
                placeholder="{SERVICE} - {PRICE} {CURRENCY}. Это включает {BENEFITS}!"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🛡️ Обоснование высоких цен
              </label>
              <textarea
                value={settings.premium_justification}
                onChange={(e) => setSettings({ ...settings, premium_justification: e.target.value })}
                placeholder="Да, мы в премиум-сегменте 💎"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                ⚡ FOMO сообщения
              </label>
              <textarea
                value={settings.fomo_messages}
                onChange={(e) => setSettings({ ...settings, fomo_messages: e.target.value })}
                placeholder="Кстати, на эту неделю уже мало свободных окон...|Сегодня особенно много запросов!"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Разделяйте варианты символом "|"
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🚀 Техники дополнительных продаж
              </label>
              <textarea
                value={settings.upsell_techniques}
                onChange={(e) => setSettings({ ...settings, upsell_techniques: e.target.value })}
                placeholder="Многие клиенты берут брови + ресницы со скидкой!"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {/* BOOKING TAB */}
        {activeTab === 'booking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              📅 Настройки записи
            </h2>

            <div style={{
              backgroundColor: '#fecaca',
              border: '1px solid #fca5a5',
              borderRadius: '0.5rem',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <AlertCircle size={20} color="#991b1b" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Критически важно:
                </p>
                <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                  Бот НЕ МОЖЕТ записывать клиентов напрямую! Он только направляет на онлайн-запись.
                </p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📱 Сообщение для перенаправления на запись
              </label>
              <textarea
                value={settings.booking_redirect_message}
                onChange={(e) => setSettings({ ...settings, booking_redirect_message: e.target.value })}
                placeholder="Я AI-ассистент и не могу записать вас напрямую..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Используйте {'{BOOKING_URL}'} для подстановки ссылки
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📋 Алгоритм действий
              </label>
              <textarea
                value={settings.algorithm_actions}
                onChange={(e) => setSettings({ ...settings, algorithm_actions: e.target.value })}
                placeholder="ЭТАП 1: Поприветствуй&#10;ЭТАП 2: Консультация"
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {/* COMMUNICATION TAB */}
        {activeTab === 'communication' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              💬 Общение и работа с возражениями
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🛡️ Обработка возражений
              </label>
              <textarea
                value={settings.objection_handling}
                onChange={(e) => setSettings({ ...settings, objection_handling: e.target.value })}
                placeholder={`"Дорого" → Подчеркни качество`}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                😔 Обработка негатива
              </label>
              <textarea
                value={settings.negative_handling}
                onChange={(e) => setSettings({ ...settings, negative_handling: e.target.value })}
                placeholder="При жалобе: извинись искренне"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                ✅ Примеры хороших ответов
              </label>
              <textarea
                value={settings.example_good_responses}
                onChange={(e) => setSettings({ ...settings, example_good_responses: e.target.value })}
                placeholder={`✅ ХОРОШО: "Gelish маникюр - 130 AED"`}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🚨 Экстренные ситуации
              </label>
              <textarea
                value={settings.emergency_situations}
                onChange={(e) => setSettings({ ...settings, emergency_situations: e.target.value })}
                placeholder="При агрессии → Оставайся спокойной"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {/* ADVANCED TAB */}
        {activeTab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              🎓 Продвинутые настройки
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📍 Особенности локации
              </label>
              <textarea
                value={settings.location_features}
                onChange={(e) => setSettings({ ...settings, location_features: e.target.value })}
                placeholder="JBR - престижный район Dubai"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🌡️ Сезонность
              </label>
              <textarea
                value={settings.seasonality}
                onChange={(e) => setSettings({ ...settings, seasonality: e.target.value })}
                placeholder="Лето: indoor процедуры"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📊 Метрики успеха
              </label>
              <textarea
                value={settings.success_metrics}
                onChange={(e) => setSettings({ ...settings, success_metrics: e.target.value })}
                placeholder="Клиент перешел на запись"
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {/* SAFETY TAB */}
        {activeTab === 'safety' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              🛡️ Безопасность и этика
            </h2>

            <div style={{
              backgroundColor: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: '0.5rem',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <Shield size={20} color="#1e40af" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Важно для безопасности:
                </p>
                <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                  Эти правила защищают клиентов и репутацию салона
                </p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🔒 Правила безопасности
              </label>
              <textarea
                value={settings.safety_guidelines}
                onChange={(e) => setSettings({ ...settings, safety_guidelines: e.target.value })}
                placeholder={`Не разглашай личную информацию\nНе делай медицинских рекомендаций`}
                rows={8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}