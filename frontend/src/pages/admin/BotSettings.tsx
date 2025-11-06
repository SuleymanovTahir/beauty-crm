// frontend/src/pages/admin/BotSettings.tsx - ПОЛНАЯ ВЕРСИЯ
// Включает ВСЕ поля из bot_instructions_file.txt

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Save, Bot, MessageSquare, DollarSign, Calendar, AlertCircle, Globe, Sparkles, BookOpen, Shield, Zap, Heart, Users, MessageCircle } from 'lucide-react';

interface BotSettings {
  bot_name: string;
  personality_traits: string;
  greeting_message: string;
  farewell_message: string;
  price_explanation: string;
  price_response_template: string;
  premium_justification: string;
  booking_redirect_message: string;
  fomo_messages: string;
  upsell_techniques: string;
  communication_style: string;
  max_message_length: number;
  emoji_usage: string;
  languages_supported: string;
  objection_expensive: string;
  objection_think_about_it: string;
  objection_no_time: string;
  objection_pain: string;
  objection_result_doubt: string;
  objection_cheaper_elsewhere: string;
  objection_too_far: string;
  objection_consult_husband: string;
  objection_first_time: string;
  objection_not_happy: string;
  emotional_triggers: string;
  social_proof_phrases: string;
  personalization_rules: string;
  example_dialogues: string;
  emotional_responses: string;
  anti_patterns: string;
  voice_message_response: string;
  contextual_rules: string;
  safety_guidelines: string;
  example_good_responses: string;
  algorithm_actions: string;
  location_features: string;
  seasonality: string;
  emergency_situations: string;
  success_metrics: string;
  ad_campaign_detection: string;
  pre_booking_data_collection: string;
}

type TabType = 'general' | 'personality' | 'pricing' | 'objections' | 'communication' | 'advanced' | 'safety' | 'examples';

const AVAILABLE_LANGUAGES = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺', note: 'основной' },
  { code: 'en', name: 'English', flag: '🇬🇧', note: 'international' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', note: 'местный' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', note: 'индийцы' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', note: 'пакистанцы' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭', note: 'филиппинцы' },
];

export default function BotSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation(['botsettings', 'common']);
  const [settings, setSettings] = useState<BotSettings>({
    bot_name: '',
    personality_traits: '',
    greeting_message: '',
    farewell_message: '',
    price_explanation: '',
    price_response_template: '',
    premium_justification: '',
    booking_redirect_message: '',
    fomo_messages: '',
    upsell_techniques: '',
    communication_style: '',
    max_message_length: 4,
    emoji_usage: '',
    languages_supported: 'ru,en,ar',
    objection_expensive: '',
    objection_think_about_it: '',
    objection_no_time: '',
    objection_pain: '',
    objection_result_doubt: '',
    objection_cheaper_elsewhere: '',
    objection_too_far: '',
    objection_consult_husband: '',
    objection_first_time: '',
    objection_not_happy: '',
    emotional_triggers: '',
    social_proof_phrases: '',
    personalization_rules: '',
    example_dialogues: '',
    emotional_responses: '',
    anti_patterns: '',
    voice_message_response: '',
    contextual_rules: '',
    safety_guidelines: '',
    example_good_responses: '',
    algorithm_actions: '',
    location_features: '',
    seasonality: '',
    emergency_situations: '',
    success_metrics: '',
    ad_campaign_detection: '',
    pre_booking_data_collection: ''
  });

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['ru', 'en', 'ar']);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      languages_supported: selectedLanguages.join(',')
    }));
  }, [selectedLanguages]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading bot settings...');

      const data = await api.getBotSettings();
      console.log('✅ Получены настройки:', data);

      const langs = data.languages_supported ? data.languages_supported.split(',') : ['ru', 'en', 'ar'];
      setSelectedLanguages(langs);

      setSettings({
        bot_name: data.bot_name || 'M.Le Diamant Assistant',
        personality_traits: data.personality_traits || '',
        greeting_message: data.greeting_message || '',
        farewell_message: data.farewell_message || '',
        price_explanation: data.price_explanation || '',
        price_response_template: data.price_response_template || '',
        premium_justification: data.premium_justification || '',
        booking_redirect_message: data.booking_redirect_message || '',
        fomo_messages: data.fomo_messages || '',
        upsell_techniques: data.upsell_techniques || '',
        communication_style: data.communication_style || '',
        max_message_length: data.max_message_length || 4,
        emoji_usage: data.emoji_usage || '',
        languages_supported: langs.join(','),
        objection_expensive: data.objection_expensive || '',
        objection_think_about_it: data.objection_think_about_it || '',
        objection_no_time: data.objection_no_time || '',
        objection_pain: data.objection_pain || '',
        objection_result_doubt: data.objection_result_doubt || '',
        objection_cheaper_elsewhere: data.objection_cheaper_elsewhere || '',
        objection_too_far: data.objection_too_far || '',
        objection_consult_husband: data.objection_consult_husband || '',
        objection_first_time: data.objection_first_time || '',
        objection_not_happy: data.objection_not_happy || '',
        emotional_triggers: data.emotional_triggers || '',
        social_proof_phrases: data.social_proof_phrases || '',
        personalization_rules: data.personalization_rules || '',
        example_dialogues: data.example_dialogues || '',
        emotional_responses: data.emotional_responses || '',
        anti_patterns: data.anti_patterns || '',
        voice_message_response: data.voice_message_response || '',
        contextual_rules: data.contextual_rules || '',
        safety_guidelines: data.safety_guidelines || '',
        example_good_responses: data.example_good_responses || '',
        algorithm_actions: data.algorithm_actions || '',
        location_features: data.location_features || '',
        seasonality: data.seasonality || '',
        emergency_situations: data.emergency_situations || '',
        success_metrics: data.success_metrics || '',
        ad_campaign_detection: data.ad_campaign_detection || '',
        pre_booking_data_collection: data.pre_booking_data_collection || 'Для записи нужно имя и WhatsApp — это займет секунду! 😊',
      });
    } catch (err) {
      console.error('❌ Error loading settings:', err);
      toast.error('Ошибка загрузки настроек: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateBotSettings(settings);

      await fetch(`${import.meta.env.VITE_API_URL}/api/bot-settings/reload`, {
        method: 'POST',
        credentials: 'include'
      });

      toast.success('✅ Настройки сохранены и бот перезагружен!');
    } catch (err: any) {
      toast.error('❌ Ошибка: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (langCode: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(langCode)) {
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
    { id: 'general', label: t('botsettings:tabs.general'), icon: <Bot size={18} /> },
    { id: 'personality', label: 'Личность', icon: <Sparkles size={18} /> },
    { id: 'pricing', label: 'Цены', icon: <DollarSign size={18} /> },
    { id: 'objections', label: 'Возражения', icon: <MessageCircle size={18} /> },
    { id: 'communication', label: 'Общение', icon: <MessageSquare size={18} /> },
    { id: 'advanced', label: 'Продвинутое', icon: <BookOpen size={18} /> },
    { id: 'safety', label: 'Безопасность', icon: <Shield size={18} /> },
    { id: 'examples', label: 'Примеры', icon: <Zap size={18} /> }
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="inline-block animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
          🤖 {t('botsettings:title')}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Полная конфигурация AI-ассистента
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
            gap: '0.5rem'
          }}
        >
          <Save size={18} />
          {saving ? 'Сохранение...' : 'Сохранить'}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
              🏢 Основная информация
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              {t('botsettings:bot_name')}
              </label>
              <input
                type="text"
                value={settings.bot_name}
                onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
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
                📏 Макс. длина сообщения (предложений)
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
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                🌍 Поддерживаемые языки
              </label>
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
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(lang.code)}
                      onChange={() => toggleLanguage(lang.code)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#a78bfa' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        {lang.flag} {lang.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {lang.note}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PERSONALITY TAB */}
        {activeTab === 'personality' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
              ✨ Личность бота
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Черты характера
              </label>
              <textarea
                value={settings.personality_traits}
                onChange={(e) => setSettings({ ...settings, personality_traits: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                👋 Приветствие
              </label>
              <textarea
                value={settings.greeting_message}
                onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
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
                👋 Прощание
              </label>
              <textarea
                value={settings.farewell_message}
                onChange={(e) => setSettings({ ...settings, farewell_message: e.target.value })}
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
                🎨 Стиль общения
              </label>
              <textarea
                value={settings.communication_style}
                onChange={(e) => setSettings({ ...settings, communication_style: e.target.value })}
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
                😊 Эмодзи
              </label>
              <input
                type="text"
                value={settings.emoji_usage}
                onChange={(e) => setSettings({ ...settings, emoji_usage: e.target.value })}
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
        )}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
              💰 Работа с ценами
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                💎 Объяснение премиум-цен
              </label>
              <textarea
                value={settings.price_explanation}
                onChange={(e) => setSettings({ ...settings, price_explanation: e.target.value })}
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
                📝 Шаблон ответа на цену
              </label>
              <textarea
                value={settings.price_response_template}
                onChange={(e) => setSettings({ ...settings, price_response_template: e.target.value })}
                rows={5}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                ⚡ FOMO сообщения (разделяйте |)
              </label>
              <textarea
                value={settings.fomo_messages}
                onChange={(e) => setSettings({ ...settings, fomo_messages: e.target.value })}
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
                🚀 Upsell техники (разделяйте |)
              </label>
              <textarea
                value={settings.upsell_techniques}
                onChange={(e) => setSettings({ ...settings, upsell_techniques: e.target.value })}
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
                📱 Сообщение о записи
              </label>
              <textarea
                value={settings.booking_redirect_message}
                onChange={(e) => setSettings({ ...settings, booking_redirect_message: e.target.value })}
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
          </div>
        )}

        {/* OBJECTIONS TAB */}
        {activeTab === 'objections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
              🛡️ Работа с возражениями
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                💸 "Дорого"
              </label>
              <textarea
                value={settings.objection_expensive}
                onChange={(e) => setSettings({ ...settings, objection_expensive: e.target.value })}
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
                🤔 "Подумаю"
              </label>
              <textarea
                value={settings.objection_think_about_it}
                onChange={(e) => setSettings({ ...settings, objection_think_about_it: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                ⏰ "Нет времени"
              </label>
              <textarea
                value={settings.objection_no_time}
                onChange={(e) => setSettings({ ...settings, objection_no_time: e.target.value })}
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
                😰 "Боюсь боли"
              </label>
              <textarea
                value={settings.objection_pain}
                onChange={(e) => setSettings({ ...settings, objection_pain: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                ❓ "Не уверен в результате"
              </label>
              <textarea
                value={settings.objection_result_doubt}
                onChange={(e) => setSettings({ ...settings, objection_result_doubt: e.target.value })}
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
                🏪 "У других дешевле"
              </label>
              <textarea
                value={settings.objection_cheaper_elsewhere}
                onChange={(e) => setSettings({ ...settings, objection_cheaper_elsewhere: e.target.value })}
                rows={7}
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
                🚗 "Слишком далеко"
              </label>
              <textarea
                value={settings.objection_too_far}
                onChange={(e) => setSettings({ ...settings, objection_too_far: e.target.value })}
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
                💑 "Посоветуюсь с мужем"
              </label>
              <textarea
                value={settings.objection_consult_husband}
                onChange={(e) => setSettings({ ...settings, objection_consult_husband: e.target.value })}
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
                🆕 "Первый раз"
              </label>
              <textarea
                value={settings.objection_first_time}
                onChange={(e) => setSettings({ ...settings, objection_first_time: e.target.value })}
                rows={7}
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
                😟 "А если не понравится?"
              </label>
              <textarea
                value={settings.objection_not_happy}
                onChange={(e) => setSettings({ ...settings, objection_not_happy: e.target.value })}
                rows={7}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
              💬 Общение и эмоции
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                💖 Эмоциональные триггеры
              </label>
              <textarea
                value={settings.emotional_triggers}
                onChange={(e) => setSettings({ ...settings, emotional_triggers: e.target.value })}
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
                ⭐ Социальное доказательство
              </label>
              <textarea
                value={settings.social_proof_phrases}
                onChange={(e) => setSettings({ ...settings, social_proof_phrases: e.target.value })}
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
                👤 Правила персонализации
              </label>
              <textarea
                value={settings.personalization_rules}
                onChange={(e) => setSettings({ ...settings, personalization_rules: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                😊 Эмоциональные ответы
              </label>
              <textarea
                value={settings.emotional_responses}
                onChange={(e) => setSettings({ ...settings, emotional_responses: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🎙️ Ответ на голосовые
              </label>
              <textarea
                value={settings.voice_message_response}
                onChange={(e) => setSettings({ ...settings, voice_message_response: e.target.value })}
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
                ❌ Антипаттерны (что НЕ делать)
              </label>
              <textarea
                value={settings.anti_patterns}
                onChange={(e) => setSettings({ ...settings, anti_patterns: e.target.value })}
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
                📋 Сбор данных перед записью
              </label>
              <textarea
                value={settings.pre_booking_data_collection}
                onChange={(e) => setSettings({ ...settings, pre_booking_data_collection: e.target.value })}
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
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Как бот запрашивает имя и WhatsApp перед записью
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🎯 Детекция рекламных кампаний
              </label>
              <textarea
                value={settings.ad_campaign_detection}
                onChange={(e) => setSettings({ ...settings, ad_campaign_detection: e.target.value })}
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
                Как бот распознает клиентов из таргетированной рекламы
              </p>
            </div>
          </div>
        )}

        {/* ADVANCED TAB */}
        {activeTab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
              🎓 Продвинутые настройки
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📋 Алгоритм действий
              </label>
              <textarea
                value={settings.algorithm_actions}
                onChange={(e) => setSettings({ ...settings, algorithm_actions: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📍 Особенности локации
              </label>
              <textarea
                value={settings.location_features}
                onChange={(e) => setSettings({ ...settings, location_features: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🌡️ Сезонность
              </label>
              <textarea
                value={settings.seasonality}
                onChange={(e) => setSettings({ ...settings, seasonality: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                🌍 Контекстные правила
              </label>
              <textarea
                value={settings.contextual_rules}
                onChange={(e) => setSettings({ ...settings, contextual_rules: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                📊 Метрики успеха
              </label>
              <textarea
                value={settings.success_metrics}
                onChange={(e) => setSettings({ ...settings, success_metrics: e.target.value })}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
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
                rows={10}
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
          </div>
        )}

        {/* EXAMPLES TAB */}
        {activeTab === 'examples' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
              💡 Примеры и диалоги
            </h2>

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                ✅ Примеры хороших ответов
              </label>
              <textarea
                value={settings.example_good_responses}
                onChange={(e) => setSettings({ ...settings, example_good_responses: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                💬 Примеры диалогов
              </label>
              <textarea
                value={settings.example_dialogues}
                onChange={(e) => setSettings({ ...settings, example_dialogues: e.target.value })}
                rows={15}
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
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Примеры реальных диалогов для обучения бота
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Save Button */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 50
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '1rem 2rem',
            backgroundColor: saving ? '#9ca3af' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '1rem'
          }}
        >
          <Save size={20} />
          {saving ? 'Сохранение...' : 'Сохранить всё'}
        </button>
      </div>
    </div>
  );
}