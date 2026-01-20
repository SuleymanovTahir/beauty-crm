// /frontend/src/pages/admin/BotSettings.tsx
// frontend/src/pages/admin/BotSettings.tsx - ПОЛНАЯ ВЕРСИЯ
// Включает ВСЕ поля из bot_instructions_file.txt

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import {
  Save, Bot, MessageSquare, DollarSign, Sparkles, BookOpen, Shield, Zap, MessageCircle, Bell,
  BarChart3, Layout, Activity, Flag, Smile, Info, HelpCircle, AlertCircle, User, Heart, Mic, XCircle, MapPin, Users,
  CheckCircle, Target, Star, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { useNavigate, useParams } from 'react-router-dom';
import './BotSettings.css';

import BotAnalyticsWidget from '../../components/admin/BotAnalyticsWidget';

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
  max_message_length?: number;
  response_style: string;
  emoji_usage: string;
  booking_time_logic: string;
  booking_data_collection: string;
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
  manager_consultation_prompt: string;
  booking_availability_instructions: string;
  // Reminder Settings
  abandoned_cart_enabled?: boolean;
  abandoned_cart_delay?: number;
  abandoned_cart_message?: string;
  post_visit_feedback_enabled?: boolean;
  post_visit_delay?: number;
  post_visit_feedback_message?: string;
  return_client_reminder_enabled?: boolean;
  return_client_delay?: number;
  return_client_message?: string;
}

type TabType = 'general' | 'notifications' | 'analytics' | 'personality' | 'pricing' | 'objections' | 'communication' | 'advanced' | 'safety' | 'examples';



export default function BotSettings() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  // Синхронизация с URL: если таб в URL есть, используем его, иначе 'general'
  const activeTab = (tab as TabType) || 'general';

  const handleTabChange = (value: TabType | string) => {
    navigate(`/crm/bot-settings/${value}`);
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation(['admin/botsettings', 'common']);
  const { user: currentUser } = useAuth();

  // Используем централизованную систему прав
  const userPermissions = usePermissions(currentUser?.role || 'employee');

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
    response_style: 'adaptive',
    emoji_usage: '',
    languages_supported: '',
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
    pre_booking_data_collection: '',
    manager_consultation_prompt: '',
    booking_time_logic: '',
    booking_data_collection: '',
    booking_availability_instructions: '',
    abandoned_cart_enabled: true,
    abandoned_cart_delay: 30,
    abandoned_cart_message: '',
    post_visit_feedback_enabled: true,
    post_visit_delay: 24,
    post_visit_feedback_message: '',
    return_client_reminder_enabled: false,
    return_client_delay: 45,
    return_client_message: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('🔄 Загрузка настроек бота...');

      const data = await api.getBotSettings();
      console.log('✅ Настройки загружены:', data);

      // ✅ БЕЗОПАСНОЕ ИЗВЛЕЧЕНИЕ (data может быть обёрнут или нет)
      const botData = data.bot_settings || data;

      setSettings({
        bot_name: botData.bot_name || '',
        personality_traits: botData.personality_traits || '',
        greeting_message: botData.greeting_message || '',
        farewell_message: botData.farewell_message || '',
        price_explanation: botData.price_explanation || '',
        price_response_template: botData.price_response_template || '',
        premium_justification: botData.premium_justification || '',
        booking_redirect_message: botData.booking_redirect_message || '',
        fomo_messages: botData.fomo_messages || '',
        upsell_techniques: botData.upsell_techniques || '',
        communication_style: botData.communication_style || '',
        response_style: botData.response_style || 'adaptive',
        emoji_usage: botData.emoji_usage || '',
        languages_supported: botData.languages_supported || '',
        objection_expensive: botData.objection_expensive || '',
        objection_think_about_it: botData.objection_think_about_it || '',
        objection_no_time: botData.objection_no_time || '',
        objection_pain: botData.objection_pain || '',
        objection_result_doubt: botData.objection_result_doubt || '',
        objection_cheaper_elsewhere: botData.objection_cheaper_elsewhere || '',
        objection_too_far: botData.objection_too_far || '',
        objection_consult_husband: botData.objection_consult_husband || '',
        objection_first_time: botData.objection_first_time || '',
        objection_not_happy: botData.objection_not_happy || '',
        emotional_triggers: botData.emotional_triggers || '',
        social_proof_phrases: botData.social_proof_phrases || '',
        personalization_rules: botData.personalization_rules || '',
        example_dialogues: botData.example_dialogues || '',
        emotional_responses: botData.emotional_responses || '',
        anti_patterns: botData.anti_patterns || '',
        voice_message_response: botData.voice_message_response || '',
        contextual_rules: botData.contextual_rules || '',
        safety_guidelines: botData.safety_guidelines || '',
        example_good_responses: botData.example_good_responses || '',
        algorithm_actions: botData.algorithm_actions || '',
        location_features: botData.location_features || '',
        seasonality: botData.seasonality || '',
        emergency_situations: botData.emergency_situations || '',
        success_metrics: botData.success_metrics || '',
        ad_campaign_detection: botData.ad_campaign_detection || '',
        pre_booking_data_collection: botData.pre_booking_data_collection || '',
        manager_consultation_prompt: botData.manager_consultation_prompt || '',
        booking_time_logic: botData.booking_time_logic || '',
        booking_data_collection: botData.booking_data_collection || '',
        booking_availability_instructions: botData.booking_availability_instructions || '',

        // Reminder Settings
        abandoned_cart_enabled: botData.abandoned_cart_enabled ?? true,
        abandoned_cart_delay: botData.abandoned_cart_delay || 30,
        abandoned_cart_message: botData.abandoned_cart_message || '',
        post_visit_feedback_enabled: botData.post_visit_feedback_enabled ?? true,
        post_visit_delay: botData.post_visit_delay || 24,
        post_visit_feedback_message: botData.post_visit_feedback_message || '',
        return_client_reminder_enabled: botData.return_client_reminder_enabled ?? false,
        return_client_delay: botData.return_client_delay || 45,
        return_client_message: botData.return_client_message || '',
      });
    } catch (err) {
      console.error('❌ Error loading settings:', err);
      toast.error(t('error_loading') + (err instanceof Error ? err.message : t('unknown_error')));
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

      toast.success(t('settings_saved_and_bot_reloaded'));
    } catch (err: any) {
      toast.error(t('error') + err.message);
    } finally {
      setSaving(false);
    }
  };


  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: t('tabs.general'), icon: <Bot size={18} /> },
    { id: 'notifications', label: t('tab_notifications'), icon: <Bell size={18} /> },
    { id: 'analytics', label: t('tab_analytics'), icon: <BarChart3 size={18} /> },
    { id: 'personality', label: t('tabs.personality'), icon: <Sparkles size={18} /> },
    { id: 'pricing', label: t('tabs.pricing'), icon: <DollarSign size={18} /> },
    { id: 'objections', label: t('tabs.objections'), icon: <MessageCircle size={18} /> },
    { id: 'communication', label: t('tabs.communication'), icon: <MessageSquare size={18} /> },
    { id: 'advanced', label: t('tabs.advanced'), icon: <BookOpen size={18} /> },
    { id: 'safety', label: t('tabs.safety'), icon: <Shield size={18} /> },
    { id: 'examples', label: t('tabs.examples'), icon: <Zap size={18} /> }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
        <p className="loading-text">{t('loading')}</p>
      </div>
    );
  }

  // Проверка доступа к настройкам бота (только директор)
  if (!userPermissions.canEditSettings) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <Shield style={{ width: '4rem', height: '4rem', color: '#d1d5db', margin: '0 auto 1rem' }} />
          <h2 className="access-denied-title">{t('access_denied')}</h2>
          <p className="access-denied-message">
            {t('access_denied_message')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bot-settings-container">
      {/* Header */}
      <div className="bot-settings-header">
        <h1 className="bot-settings-title">
          <Bot size={32} className="text-pink-600" /> {t('title')}
        </h1>
        <p className="bot-settings-subtitle">
          {t('full_configuration_of_ai_assistant')}
        </p>
      </div>

      <div className="bot-settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`bot-settings-tab-button ${activeTab === tab.id ? 'bot-settings-tab-button-active' : ''}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bot-settings-content">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="flex flex-col gap-[1.5rem]">
            <h2 className="bot-settings-section-title">
              <Layout size={20} className="text-blue-600" /> {t('main_information')}
            </h2>

            <div>
              <label className="bot-settings-label">
                {t('bot_name')}
              </label>
              <input
                type="text"
                value={settings.bot_name}
                onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
                className="bot-settings-input"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Flag size={18} className="text-pink-500" /> {t('response_style') || 'Стиль ответов бота'}
              </label>
              <div className="grid grid-cols-3 gap-[1rem]">
                {/* Concise / Деловой */}
                <div
                  onClick={() => setSettings({ ...settings, response_style: 'concise' })}
                  className={`bot-settings-style-card ${settings.response_style === 'concise' ? 'bot-settings-style-card-active' : ''}`}
                >
                  <div className="text-[2rem] mb-[0.5rem]">⚡</div>
                  <div className="font-[600] text-[#111827] mb-[0.25rem]">
                    {t('style_concise')}
                  </div>
                  <div className="text-[0.75rem] text-[#6b7280]">
                    {t('style_concise_desc')}
                  </div>
                </div>

                {/* Adaptive / Умный */}
                <div
                  onClick={() => setSettings({ ...settings, response_style: 'adaptive' })}
                  className={`bot-settings-style-card ${settings.response_style === 'adaptive' ? 'bot-settings-style-card-active' : ''}`}
                >
                  <div className="text-[2rem] mb-[0.5rem]">🧠</div>
                  <div className="font-[600] text-[#111827] mb-[0.25rem]">
                    {t('style_adaptive')}
                  </div>
                  <div className="text-[0.75rem] text-[#6b7280]">
                    {t('style_adaptive_desc')}
                  </div>
                </div>

                {/* Detailed / Дружелюбный */}
                <div
                  onClick={() => setSettings({ ...settings, response_style: 'detailed' })}
                  className={`bot-settings-style-card ${settings.response_style === 'detailed' ? 'bot-settings-style-card-active' : ''}`}
                >
                  <div className="text-[2rem] mb-[0.5rem]">💬</div>
                  <div className="font-[600] text-[#111827] mb-[0.25rem]">
                    {t('style_detailed')}
                  </div>
                  <div className="text-[0.75rem] text-[#6b7280]">
                    {t('style_detailed_desc')}
                  </div>
                </div>
              </div>
              <p className="bot-settings-helper-text">
                {t('style_descriptions')}
              </p>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} className="text-indigo-600" /> {t('bot_analytics_title')}
            </h2>
            <BotAnalyticsWidget />
          </div>
        )}

        {/* PERSONALITY TAB */}
        {activeTab === 'personality' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 className="bot-settings-section-title">
              <Sparkles size={20} className="text-yellow-500" /> {t('personality_of_the_bot')}
            </h2>

            <div>
              <label className="bot-settings-label">
                {t('character_traits')}
              </label>
              <textarea
                value={settings.personality_traits}
                onChange={(e) => setSettings({ ...settings, personality_traits: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <MessageSquare size={18} className="text-blue-400" /> {t('greeting')}
              </label>
              <textarea
                value={settings.greeting_message}
                onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
                rows={3}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <MessageSquare size={18} className="text-gray-400" /> {t('farewell')}
              </label>
              <textarea
                value={settings.farewell_message}
                onChange={(e) => setSettings({ ...settings, farewell_message: e.target.value })}
                rows={2}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Activity size={18} className="text-purple-500" /> {t('communication_style')}
              </label>
              <textarea
                value={settings.communication_style}
                onChange={(e) => setSettings({ ...settings, communication_style: e.target.value })}
                rows={4}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Smile size={18} className="text-yellow-500" /> {t('emoji')}
              </label>
              <input
                type="text"
                value={settings.emoji_usage}
                onChange={(e) => setSettings({ ...settings, emoji_usage: e.target.value })}
                className="bot-settings-input"
              />
            </div>
          </div>
        )}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 className="bot-settings-section-title">
              <DollarSign size={20} className="text-green-600" /> {t('working_with_prices')}
            </h2>

            <div>
              <label className="bot-settings-label">
                {t('premium_price_explanation')}
              </label>
              <textarea
                value={settings.price_explanation}
                onChange={(e) => setSettings({ ...settings, price_explanation: e.target.value })}
                rows={3}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <BookOpen size={18} className="text-blue-500" /> {t('price_response_template')}
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
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Shield size={18} className="text-pink-600" /> {t('high_price_justification')}
              </label>
              <textarea
                value={settings.premium_justification}
                onChange={(e) => setSettings({ ...settings, premium_justification: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Zap size={18} className="text-yellow-500" /> {t('fomo_messages')} ({t('separate_with_pipe')})
              </label>
              <textarea
                value={settings.fomo_messages}
                onChange={(e) => setSettings({ ...settings, fomo_messages: e.target.value })}
                rows={4}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Sparkles size={18} className="text-purple-500" /> {t('upsell_techniques')} ({t('separate_with_pipe')})
              </label>
              <textarea
                value={settings.upsell_techniques}
                onChange={(e) => setSettings({ ...settings, upsell_techniques: e.target.value })}
                rows={4}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <MessageSquare size={18} className="text-blue-500" /> {t('booking_message')}
              </label>
              <textarea
                value={settings.booking_redirect_message}
                onChange={(e) => setSettings({ ...settings, booking_redirect_message: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label">
                {t('booking_time_logic')}
              </label>
              <textarea
                value={settings.booking_time_logic}
                onChange={(e) => setSettings({ ...settings, booking_time_logic: e.target.value })}
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
              <p className="bot-settings-helper-text">
                {t('booking_time_logic_description')}
              </p>
            </div>

            <div>
              <label className="bot-settings-label">
                {t('booking_data_collection')}
              </label>
              <textarea
                value={settings.booking_data_collection}
                onChange={(e) => setSettings({ ...settings, booking_data_collection: e.target.value })}
                rows={8}
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
              <p className="bot-settings-helper-text">
                {t('booking_data_collection_description')}
              </p>
            </div>
            <div>
              <label className="bot-settings-label">
                {t('booking_availability_instructions')}
              </label>
              <textarea
                value={settings.booking_availability_instructions}
                onChange={(e) => setSettings({ ...settings, booking_availability_instructions: e.target.value })}
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
              <p className="bot-settings-helper-text">
                {t('booking_availability_instructions_description')}
              </p>
            </div>
          </div>
        )}

        {/* OBJECTIONS TAB */}
        {activeTab === 'objections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 className="bot-settings-section-title">
              <Shield size={20} className="text-red-500" /> {t('working_with_objections')}
            </h2>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <DollarSign size={18} className="text-red-500" /> {t('expensive')}
              </label>
              <textarea
                value={settings.objection_expensive}
                onChange={(e) => setSettings({ ...settings, objection_expensive: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <HelpCircle size={18} className="text-blue-500" /> {t('think_about_it')}
              </label>
              <textarea
                value={settings.objection_think_about_it}
                onChange={(e) => setSettings({ ...settings, objection_think_about_it: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Bell size={18} className="text-orange-500" /> {t('no_time')}
              </label>
              <textarea
                value={settings.objection_no_time}
                onChange={(e) => setSettings({ ...settings, objection_no_time: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <AlertCircle size={18} className="text-red-400" /> {t('afraid_of_pain')}
              </label>
              <textarea
                value={settings.objection_pain}
                onChange={(e) => setSettings({ ...settings, objection_pain: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <HelpCircle size={18} className="text-blue-400" /> {t('not_sure_about_the_result')}
              </label>
              <textarea
                value={settings.objection_result_doubt}
                onChange={(e) => setSettings({ ...settings, objection_result_doubt: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Layout size={18} className="text-orange-500" /> {t('cheaper_elsewhere')}
              </label>
              <textarea
                value={settings.objection_cheaper_elsewhere}
                onChange={(e) => setSettings({ ...settings, objection_cheaper_elsewhere: e.target.value })}
                rows={7}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <MapPin size={18} className="text-red-500" /> {t('too_far')}
              </label>
              <textarea
                value={settings.objection_too_far}
                onChange={(e) => setSettings({ ...settings, objection_too_far: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Users size={18} className="text-pink-500" /> {t('consult_with_husband')}
              </label>
              <textarea
                value={settings.objection_consult_husband}
                onChange={(e) => setSettings({ ...settings, objection_consult_husband: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <User size={18} className="text-green-500" /> {t('first_time')}
              </label>
              <textarea
                value={settings.objection_first_time}
                onChange={(e) => setSettings({ ...settings, objection_first_time: e.target.value })}
                rows={7}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <AlertCircle size={18} className="text-gray-400" /> {t('if_not_liked')}
              </label>
              <textarea
                value={settings.objection_not_happy}
                onChange={(e) => setSettings({ ...settings, objection_not_happy: e.target.value })}
                rows={7}
                className="bot-settings-textarea"
              />
            </div>
          </div>
        )}

        {/* COMMUNICATION TAB */}
        {activeTab === 'communication' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 className="bot-settings-section-title">
              <MessageCircle size={20} className="text-blue-500" /> {t('communication_and_emotions')}
            </h2>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Heart size={18} className="text-pink-500" /> {t('emotional_triggers')}
              </label>
              <textarea
                value={settings.emotional_triggers}
                onChange={(e) => setSettings({ ...settings, emotional_triggers: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>


            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Sparkles size={18} className="text-yellow-500" /> {t('social_proof')}
              </label>
              <textarea
                value={settings.social_proof_phrases}
                onChange={(e) => setSettings({ ...settings, social_proof_phrases: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <User size={18} className="text-blue-500" /> {t('personalization_rules')}
              </label>
              <textarea
                value={settings.personalization_rules}
                onChange={(e) => setSettings({ ...settings, personalization_rules: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Smile size={18} className="text-green-500" /> {t('emotional_responses')}
              </label>
              <textarea
                value={settings.emotional_responses}
                onChange={(e) => setSettings({ ...settings, emotional_responses: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Mic size={18} className="text-blue-500" /> {t('voice_message_response')}
              </label>
              <textarea
                value={settings.voice_message_response}
                onChange={(e) => setSettings({ ...settings, voice_message_response: e.target.value })}
                rows={3}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <XCircle size={18} className="text-red-500" /> {t('anti_patterns')} ({t('what_not_to_do')})
              </label>
              <textarea
                value={settings.anti_patterns}
                onChange={(e) => setSettings({ ...settings, anti_patterns: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>
            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <BookOpen size={18} className="text-blue-500" /> {t('pre_booking_data_collection')}
              </label>
              <textarea
                value={settings.pre_booking_data_collection}
                onChange={(e) => setSettings({ ...settings, pre_booking_data_collection: e.target.value })}
                rows={4}
                className="bot-settings-textarea"
              />
              <p className="bot-settings-helper-text">
                {t('pre_booking_data_collection_explanation')}
              </p>
            </div>

            {/* ← ad_campaign_detection идет после этого */}

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Users size={18} className="text-pink-500" /> {t('manager_consultation_prompt')}
              </label>
              <textarea
                value={settings.manager_consultation_prompt}
                onChange={(e) => setSettings({ ...settings, manager_consultation_prompt: e.target.value })}
                rows={12}
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
              <p className="bot-settings-helper-text">
                {t('manager_consultation_prompt_description')}
              </p>
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Target size={18} className="text-purple-500" /> {t('ad_campaign_detection')}
              </label>
              <textarea
                value={settings.ad_campaign_detection}
                onChange={(e) => setSettings({ ...settings, ad_campaign_detection: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
              <p className="bot-settings-helper-text">
                {t('ad_campaign_detection_explanation')}
              </p>
            </div>
          </div>
        )}

        {/* ADVANCED TAB */}
        {activeTab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 className="bot-settings-section-title">
              <Zap size={20} className="text-yellow-500" /> {t('advanced_settings')}
            </h2>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <CheckCircle size={18} className="text-green-500" /> {t('algorithm_actions')}
              </label>
              <textarea
                value={settings.algorithm_actions}
                onChange={(e) => setSettings({ ...settings, algorithm_actions: e.target.value })}
                rows={8}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <MapPin size={18} className="text-red-500" /> {t('location_features')}
              </label>
              <textarea
                value={settings.location_features}
                onChange={(e) => setSettings({ ...settings, location_features: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Activity size={18} className="text-blue-500" /> {t('seasonality')}
              </label>
              <textarea
                value={settings.seasonality}
                onChange={(e) => setSettings({ ...settings, seasonality: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <Info size={18} className="text-indigo-500" /> {t('contextual_rules')}
              </label>
              <textarea
                value={settings.contextual_rules}
                onChange={(e) => setSettings({ ...settings, contextual_rules: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <BarChart3 size={18} className="text-green-600" /> {t('success_metrics')}
              </label>
              <textarea
                value={settings.success_metrics}
                onChange={(e) => setSettings({ ...settings, success_metrics: e.target.value })}
                rows={5}
                className="bot-settings-textarea"
              />
            </div>
          </div>
        )}

        {/* SAFETY TAB */}
        {activeTab === 'safety' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 className="bot-settings-section-title">
              <Shield size={24} />
              {t('safety_and_ethics')}
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
                  {t('important_for_safety')}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                  {t('these_rules_protect_clients_and_reputation')}
                </p>
              </div>
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <ShieldCheck size={18} className="text-blue-600" /> {t('safety_rules')}
              </label>
              <textarea
                value={settings.safety_guidelines}
                onChange={(e) => setSettings({ ...settings, safety_guidelines: e.target.value })}
                rows={10}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <AlertCircle size={18} className="text-red-600" /> {t('emergency_situations')}
              </label>
              <textarea
                value={settings.emergency_situations}
                onChange={(e) => setSettings({ ...settings, emergency_situations: e.target.value })}
                rows={6}
                className="bot-settings-textarea"
              />
            </div>
          </div>
        )}

        {/* EXAMPLES TAB */}
        {activeTab === 'examples' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 className="bot-settings-section-title">
              <Layout size={20} className="text-yellow-600" /> {t('examples_and_dialogues')}
            </h2>

            <div>
              <label className="bot-settings-label flex items-center gap-[0.5rem]">
                <CheckCircle size={18} className="text-green-500" /> {t('good_responses')}
              </label>
              <textarea
                value={settings.example_good_responses}
                onChange={(e) => setSettings({ ...settings, example_good_responses: e.target.value })}
                rows={8}
                className="bot-settings-textarea"
              />
            </div>

            <div>
              <label className="bot-settings-label">
                💬 {t('dialogues')}
              </label>
              <textarea
                value={settings.example_dialogues}
                onChange={(e) => setSettings({ ...settings, example_dialogues: e.target.value })}
                rows={15}
                className="bot-settings-textarea-mono"
              />
              <p className="bot-settings-helper-text">
                {t('real_dialogues_for_training')}
              </p>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 className="bot-settings-section-title">
              <Bell size={20} className="text-pink-600" /> {t('notifications_and_reminders_settings')}
            </h2>

            {/* 1. Abandoned Cart */}
            <div className="bot-settings-card">
              <div className="bot-settings-card-header">
                <h3 className="bot-settings-card-title">
                  <Activity size={18} className="text-yellow-500" /> {t('abandoned_cart')}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={settings.abandoned_cart_enabled}
                    onChange={(e) => setSettings({ ...settings, abandoned_cart_enabled: e.target.checked })}
                    style={{ width: '1.25rem', height: '1.25rem' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{t('enabled')}</span>
                </div>
              </div>

              <div className="bot-settings-card-grid">
                <div>
                  <label className="bot-settings-small-label">{t('delay_minutes')}</label>
                  <input
                    type="number"
                    value={settings.abandoned_cart_delay}
                    onChange={(e) => setSettings({ ...settings, abandoned_cart_delay: parseInt(e.target.value) || 30 })}
                    className="bot-settings-small-input"
                  />
                  <p className="bot-settings-helper-text">{t('abandoned_cart_hint')}</p>
                </div>
                <div>
                  <label className="bot-settings-small-label">{t('message_template')}</label>
                  <textarea
                    value={settings.abandoned_cart_message}
                    onChange={(e) => setSettings({ ...settings, abandoned_cart_message: e.target.value })}
                    placeholder={t('default_template_hint')}
                    rows={3}
                    className="bot-settings-small-input"
                  />
                </div>
              </div>
            </div>

            {/* 2. Feedback Request */}
            <div className="bot-settings-card">
              <div className="bot-settings-card-header">
                <h3 className="bot-settings-card-title">
                  <Star size={18} className="text-yellow-400" /> {t('feedback_request')}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={settings.post_visit_feedback_enabled}
                    onChange={(e) => setSettings({ ...settings, post_visit_feedback_enabled: e.target.checked })}
                    style={{ width: '1.25rem', height: '1.25rem' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{t('enabled')}</span>
                </div>
              </div>

              <div className="bot-settings-card-grid">
                <div>
                  <label className="bot-settings-small-label">{t('delay_hours')}</label>
                  <input
                    type="number"
                    value={settings.post_visit_delay}
                    onChange={(e) => setSettings({ ...settings, post_visit_delay: parseInt(e.target.value) || 24 })}
                    className="bot-settings-small-input"
                  />
                  <p className="bot-settings-helper-text">{t('feedback_hint')}</p>
                </div>
                <div>
                  <label className="bot-settings-small-label">{t('message_template')}</label>
                  <textarea
                    value={settings.post_visit_feedback_message}
                    onChange={(e) => setSettings({ ...settings, post_visit_feedback_message: e.target.value })}
                    placeholder={t('default_template_hint')}
                    rows={3}
                    className="bot-settings-small-input"
                  />
                </div>
              </div>
            </div>

            {/* 3. Retention */}
            <div className="bot-settings-card" style={{ opacity: 0.7 }}>
              <div className="bot-settings-card-header">
                <h3 className="bot-settings-card-title">
                  <Activity size={18} className="text-blue-500" /> {t('client_retention')} <span className="bot-settings-beta-tag">{t('beta')}</span>
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={settings.return_client_reminder_enabled}
                    onChange={(e) => setSettings({ ...settings, return_client_reminder_enabled: e.target.checked })}
                    style={{ width: '1.25rem', height: '1.25rem' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{t('enabled')}</span>
                </div>
              </div>

              <div className="bot-settings-card-grid">
                <div>
                  <label className="bot-settings-small-label">{t('delay_days')}</label>
                  <input
                    type="number"
                    value={settings.return_client_delay}
                    onChange={(e) => setSettings({ ...settings, return_client_delay: parseInt(e.target.value) || 45 })}
                    className="bot-settings-small-input"
                  />
                  <p className="bot-settings-helper-text">{t('retention_hint')}</p>
                </div>
                <div>
                  <label className="bot-settings-small-label">{t('message_template')}</label>
                  <textarea
                    value={settings.return_client_message}
                    onChange={(e) => setSettings({ ...settings, return_client_message: e.target.value })}
                    placeholder={t('retention_placeholder')}
                    rows={3}
                    className="bot-settings-small-input"
                  />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <div className="bot-settings-save-bar">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bot-settings-save-button"
        >
          <Save size={20} />
          {saving ? t('saving') : t('save_all')}
        </button>
      </div>
    </div>
  );
}