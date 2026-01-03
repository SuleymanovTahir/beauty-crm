// /frontend/src/components/chat/InfoPanel.tsx
import { useState } from 'react';
import { User, Phone, Instagram, Check, X, Loader, Edit2, Save, Send, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { StatusSelect } from '../shared/StatusSelect';
import { useClientStatuses } from '../../hooks/useStatuses';
import BotModeSelector from './BotModeSelector';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Client {
  id: string;
  name: string;
  username: string;
  phone: string;
  display_name: string;
  profile_pic?: string;
  status: string;
  source?: string;
  telegram_id?: string;
}

interface InfoPanelProps {
  client: Client;
  onClose: () => void;
  onUpdate: (data: { name: string; phone: string; status?: string }) => Promise<void>;
}

export default function InfoPanel({ client, onClose, onUpdate }: InfoPanelProps) {
  const { t } = useTranslation('components');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(client.name || '');
  const [editedPhone, setEditedPhone] = useState(client.phone || '');
  const { statuses: statusConfig, addStatus: handleAddStatus } = useClientStatuses();
  const [editedStatus, setEditedStatus] = useState(client.status || 'new');
  const [botMode, setBotMode] = useState<'manual' | 'assistant' | 'autopilot'>(
    (client as any).bot_mode || 'assistant'
  );

  const handleBotModeChange = async (mode: 'manual' | 'assistant' | 'autopilot') => {
    try {
      await api.updateClientBotMode(client.id, mode);
      setBotMode(mode);
      toast.success(t('bot_mode_changed', 'Режим бота изменен', {
        mode: mode === 'manual' ? t('bot_mode_manual', 'Вручную', { ns: 'common' }) :
          mode === 'assistant' ? t('bot_mode_assistant', 'Ассистент', { ns: 'common' }) :
            t('bot_mode_autopilot', 'Автопилот', { ns: 'common' })
      }));
    } catch (err) {
      toast.error(t('error_changing_mode', 'Ошибка изменения режима'));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onUpdate({
        name: editedName.trim(),
        phone: editedPhone.trim(),
        status: editedStatus
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(client.name || '');
    setEditedPhone(client.phone || '');
    setEditedStatus(client.status || 'new');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-blue-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-500 max-w-full flex flex-col max-h-[85vh] m-2">
      {/* Header - Ultra Premium */}
      <div className="bg-gradient-to-r from-[#1e40af] via-[#3b82f6] to-[#6366f1] p-6 flex items-center justify-between flex-shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/20 rounded-full translate-y-12 -translate-x-12 blur-2xl"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-white text-xl tracking-tight leading-none mb-1">
              {t('info_panel_title', 'Информация') || 'Информация'}
            </h3>
            <span className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.3em] bg-white/10 px-2 py-0.5 rounded-full">
              💎 Premium V2
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-10 w-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300 border border-white/10 relative z-10"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Content - со скроллом */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Profile Picture & Display Name */}
        <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b-2 border-gray-100">
          {client.profile_pic ? (
            <img
              src={client.profile_pic}
              alt={client.display_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg flex-shrink-0"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-black shadow-lg flex-shrink-0 ${client.profile_pic ? 'hidden' : ''
              }`}
          >
            <span className="text-2xl font-bold">
              {client.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-xl tracking-tight truncate">{client.display_name}</p>
            {client.username && (
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-sm font-bold text-blue-600">@{client.username}</p>
              </div>
            )}
          </div>
        </div>

        {/* Name Field */}
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
          <label className="flex items-center gap-2 font-bold text-gray-400 mb-2 text-[10px] uppercase tracking-[0.2em]">
            <User className="w-3 h-3 text-blue-500" />
            {t('client_name', 'Имя клиента') || 'Имя клиента'}
          </label>
          {isEditing ? (
            <Input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder={t('client_name_placeholder', 'Имя клиента') || 'Имя клиента'}
              className="border-2 border-blue-100 focus:border-blue-500 rounded-xl bg-gray-50/50"
            />
          ) : (
            <p className="text-gray-900 font-bold text-lg px-1">
              {client.name || <span className="text-gray-300 italic font-normal">{t('not_specified', 'Не указано') || 'Не указано'}</span>}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm hover:border-green-200 hover:shadow-md transition-all duration-300 group">
          <label className="flex items-center gap-2 font-bold text-gray-400 mb-2 text-[10px] uppercase tracking-[0.2em]">
            <Phone className="w-3 h-3 text-green-500" />
            {t('phone', 'Телефон') || 'Телефон'}
          </label>
          {isEditing ? (
            <Input
              type="text"
              value={editedPhone}
              onChange={(e) => setEditedPhone(e.target.value)}
              placeholder={t('phone_placeholder', 'Телефон') || 'Телефон'}
              className="border-2 border-green-100 focus:border-green-500 rounded-xl bg-gray-50/50"
            />
          ) : (
            <p className="text-gray-900 font-bold text-lg px-1 font-mono tracking-tight">
              {client.phone || <span className="text-gray-300 italic font-normal">{t('not_specified_phone', 'Не указано') || 'Не указано'}</span>}
            </p>
          )}
        </div>

        {/* Status Field */}
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm hover:border-purple-200 hover:shadow-md transition-all duration-300 group">
          <label className="flex items-center gap-2 font-bold text-gray-400 mb-2 text-[10px] uppercase tracking-[0.2em]">
            <Check className="w-3 h-3 text-purple-500" />
            {t('status', 'Статус') || 'Статус'}
          </label>
          {isEditing ? (
            <div className="mt-1">
              <StatusSelect
                value={editedStatus}
                onChange={setEditedStatus}
                options={statusConfig}
                allowAdd={true}
                onAddStatus={handleAddStatus}
              />
            </div>
          ) : (
            <div className="mt-1">
              <StatusSelect
                value={client.status}
                onChange={async (newStatus) => {
                  try {
                    await onUpdate({
                      name: client.name,
                      phone: client.phone,
                      status: newStatus
                    });
                  } catch (error) {
                    console.error('Failed to update status:', error);
                  }
                }}
                options={statusConfig}
                allowAdd={true}
                onAddStatus={handleAddStatus}
              />
            </div>
          )}
        </div>
        <div className="pb-4 border-b border-gray-200">
          <BotModeSelector
            currentMode={botMode}
            onChange={handleBotModeChange}
          />
        </div>

        {/* Source Field */}
        <div className="py-4 border-b border-gray-100">
          <label className="flex items-center gap-2 font-bold text-gray-400 mb-2 text-[10px] uppercase tracking-[0.2em]">
            {t('source_title', 'Источник') || 'Источник'}
          </label>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 bg-gray-50 p-2 rounded-xl">
            {client.source === 'instagram' ? '📷 Instagram' :
              client.source === 'telegram' ? '✈️ Telegram' :
                client.source === 'whatsapp' ? '📱 WhatsApp' :
                  client.source === 'account' ? '👤 Личный кабинет' :
                    client.source === 'guest_link' ? '🔗 Гостевая ссылка' :
                      t(`source.${client.source || 'manual'}`, client.source || 'Вручную') || (client.source || 'Вручную')}
          </div>
        </div>
        {/* Instagram Field */}
        {client.username && (
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200 p-4">
            <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Instagram className="w-4 h-4 text-black" />
              </div>
              Instagram
            </label>

            <a href={`https://instagram.com/${client.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
            >
              @{client.username}
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
        )}

        {/* Telegram Field */}
        {client.telegram_id && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4 mt-4">
            <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Send className="w-4 h-4 text-white" />
              </div>
              Telegram
            </label>

            <a href={`https://t.me/${client.telegram_id.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-blue-600 font-medium hover:underline"
            >
              @{client.telegram_id.replace('@', '')}
            </a>
          </div>
        )}

        {/* WhatsApp Field */}
        {client.phone && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-4 mt-4">
            <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              WhatsApp
            </label>

            <a href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-green-600 font-medium hover:underline"
            >
              {client.phone}
            </a>
          </div>
        )}
      </div>

      {/* Actions - зафиксированы внизу */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t-2 border-gray-100 flex-shrink-0">
        {isEditing ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-black font-bold h-12 rounded-2xl shadow-lg shadow-blue-200 transition-all duration-300 active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  {t('saving', 'Сохранение...') || 'Сохранение...'}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {t('save', 'Сохранить') || 'Сохранить'}
                </>
              )}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
              className="px-6 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 h-12 font-bold text-gray-500 transition-all duration-300"
            >
              <X className="w-5 h-5 sm:mr-2" />
              <span className="sm:inline hidden">{t('cancel', 'Отмена') || 'Отмена'}</span>
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-black font-bold h-12 rounded-2xl shadow-lg shadow-blue-200 transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <Edit2 className="w-4 h-4" />
            </div>
            {t('edit', 'Редактировать') || 'Редактировать'}
          </Button>
        )}
      </div>
    </div>
  );
}
