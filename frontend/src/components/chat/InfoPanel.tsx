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
      toast.success(t('bot_mode_changed', {
        mode: mode === 'manual' ? t('bot_mode_manual', { ns: 'common' }) :
          mode === 'assistant' ? t('bot_mode_assistant', { ns: 'common' }) :
            t('bot_mode_autopilot', { ns: 'common' })
      }));
    } catch (err) {
      toast.error(t('error_changing_mode'));
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
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden animate-in slide-in-from-top duration-300 max-w-full flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-black" />
          </div>
          <h3 className="font-bold text-black text-lg">{t('info_panel_title')}</h3>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-black" />
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
            <p className="font-bold text-gray-900 text-base sm:text-lg truncate">{client.display_name}</p>
            {client.username && (
              <p className="text-sm text-gray-600">@{client.username}</p>
            )}
          </div>
        </div>

        {/* Name Field */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            {t('client_name')}
          </label>
          {isEditing ? (
            <Input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder={t('client_name_placeholder')}
              className="border-2 border-blue-300 focus:border-blue-500 rounded-xl"
            />
          ) : (
            <p className="text-gray-900 px-2 py-1">
              {client.name || <span className="text-gray-400 italic">{t('not_specified')}</span>}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-600" />
            </div>
            {t('phone')}
          </label>
          {isEditing ? (
            <Input
              type="text"
              value={editedPhone}
              onChange={(e) => setEditedPhone(e.target.value)}
              placeholder={t('phone_placeholder')}
              className="border-2 border-blue-300 focus:border-blue-500 rounded-xl"
            />
          ) : (
            <p className="text-gray-900 px-2 py-1">
              {client.phone || <span className="text-gray-400 italic">{t('not_specified_phone')}</span>}
            </p>
          )}
        </div>

        {/* Status Field */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
              <Check className="w-4 h-4 text-purple-600" />
            </div>
            {t('status')}
          </label>
          {isEditing ? (
            <StatusSelect
              value={editedStatus}
              onChange={setEditedStatus}
              options={statusConfig}
              allowAdd={true}
              onAddStatus={handleAddStatus}
            />
          ) : (
            <div className="px-2 py-1">
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
        <div className="py-4 border-b border-gray-200">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wider">
            {t('source_title', 'Источник')}
          </label>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            {client.source === 'instagram' ? '📷 Instagram' :
              client.source === 'telegram' ? '✈️ Telegram' :
                client.source === 'whatsapp' ? '📱 WhatsApp' :
                  client.source === 'account' ? '👤 Личный кабинет' :
                    client.source === 'guest_link' ? '🔗 Гостевая ссылка' :
                      t(`source.${client.source || 'manual'}`, client.source || 'Вручную')}
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
      <div className="p-3 sm:p-4 bg-gray-50 border-t-2 border-gray-100 flex-shrink-0">
        {isEditing ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black rounded-xl shadow-lg"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('save')}
                </>
              )}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
              className="sm:w-auto px-4 border-2 rounded-xl hover:bg-gray-100"
            >
              <X className="w-4 h-4 sm:mr-2" />
              <span className="sm:inline hidden">{t('cancel')}</span>
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-black rounded-xl shadow-lg"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            {t('edit')}
          </Button>
        )}
      </div>
    </div>
  );
}
