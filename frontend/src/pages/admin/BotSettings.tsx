// frontend/src/pages/admin/BotSettings.tsx - С МУЛЬТИСЕЛЕКТОМ ЯЗЫКОВ
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
  languages_supported: string;
}

type TabType = 'general' | 'personality' | 'pricing' | 'booking' | 'communication' | 'safety';

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
    languages_supported: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getBotSettings();
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
        languages_supported: data.languages_supported || '🇷🇺 Русский - Russian (основной), 🇬🇧 English - English (international), 🇸🇦 العربية - Arabic (местный)'
      });
    } catch (err) {
      toast.error('Ошибка загрузки настроек');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateBotSettings(settings);
      toast.success('✅ Настройки бота успешно сохранены!');
    } catch (err: any) {
      toast.error('❌ Ошибка сохранения: ' + (err.message || 'Неизвестная ошибка'));
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'Основное', icon: <Bot size={18} /> },
    { id: 'personality', label: 'Личность', icon: <Sparkles size={18} /> },
    { id: 'pricing', label: 'Цены', icon: <DollarSign size={18} /> },
    { id: 'booking', label: 'Запись', icon: <Calendar size={18} /> },
    { id: 'communication', label: 'Общение', icon: <MessageSquare size={18} /> },
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
                placeholder="Обаятельная, уверенная, харизматичная, эксперт в beauty-индустрии"
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

            {/* ===== МУЛЬТИСЕЛЕКТ ЯЗЫКОВ ===== */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🌍 Поддерживаемые языки
              </label>
              <div style={{ 
                border: '1px solid #d1d5db', 
                borderRadius: '0.5rem', 
                padding: '0.75rem',
                backgroundColor: '#f9fafb'
              }}>
                {[
                  { code: 'ru', name: '🇷🇺 Русский', desc: 'Russian (основной)' },
                  { code: 'en', name: '🇬🇧 English', desc: 'English (international)' },
                  { code: 'ar', name: '🇸🇦 العربية', desc: 'Arabic (местный)' },
                  { code: 'hi', name: '🇮🇳 हिन्दी', desc: 'Hindi (индийцы)' },
                  { code: 'ur', name: '🇵🇰 اردو', desc: 'Urdu (пакистанцы)' },
                  { code: 'tl', name: '🇵🇭 Filipino', desc: 'Filipino/Tagalog' }
                ].map(lang => {
                  const selectedLangs = settings.languages_supported.split(',').map(l => l.trim().toLowerCase());
                  const isSelected = selectedLangs.some(l => l.includes(lang.code) || l.includes(lang.name.toLowerCase()));
                  
                  return (
                    <label 
                      key={lang.code}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        borderRadius: '0.375rem',
                        transition: 'background-color 0.2s',
                        backgroundColor: isSelected ? '#ede9fe' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const currentLangs = settings.languages_supported.split(',').map(l => l.trim()).filter(Boolean);
                          let newLangs;
                          
                          if (e.target.checked) {
                            // Добавить язык
                            newLangs = [...currentLangs, `${lang.name} - ${lang.desc}`];
                          } else {
                            // Удалить язык
                            newLangs = currentLangs.filter(l => 
                              !l.toLowerCase().includes(lang.code) && 
                              !l.toLowerCase().includes(lang.name.toLowerCase())
                            );
                          }
                          
                          setSettings({ 
                            ...settings, 
                            languages_supported: newLangs.join(', ') 
                          });
                        }}
                        style={{ 
                          width: '1.25rem', 
                          height: '1.25rem', 
                          cursor: 'pointer',
                          accentColor: '#a78bfa'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: isSelected ? '600' : '500',
                          color: isSelected ? '#6b21a8' : '#374151'
                        }}>
                          {lang.name}
                        </span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: '#6b7280',
                          marginLeft: '0.5rem'
                        }}>
                          {lang.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Выберите языки, на которых бот будет общаться с клиентами
              </p>
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
                  Бот должен не просто называть цену, а оправдывать её ценностью: качество, материалы, долговременность, премиум-сегмент
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
                  Бот НЕ МОЖЕТ записывать клиентов напрямую! Он только направляет на онлайн-запись через YClients.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* COMMUNICATION TAB */}
        {activeTab === 'communication' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              💬 Общение и работа с возражениями
            </h2>
            
            <p style={{ color: '#6b7280' }}>
              Здесь настраиваются шаблоны ответов на возражения клиентов
            </p>
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
                  Важно для безопасности клиентов:
                </p>
                <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                  Эти правила защищают как клиентов, так и репутацию салона
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem',
              padding: '1rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                ⚠️ Что бот НЕ должен делать:
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.75' }}>
                <li>Не разглашать личные данные клиентов</li>
                <li>Не давать медицинские советы или диагнозы</li>
                <li>Не собирать данные для записи (имя, телефон, дату)</li>
                <li>Не придумывать цены - только из базы данных</li>
                <li>Не обещать то, чего нет</li>
                <li>Не воспроизводить copyrighted контент</li>
                <li>Не быть навязчивым или агрессивным</li>
                <li>Не обсуждать конкурентов негативно</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}