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
  onUpdate: (data: { name: string; phone: string; status?: string; source?: string }) => Promise<void>;
}

export default function InfoPanel({ client, onClose, onUpdate }: InfoPanelProps) {
  const { t } = useTranslation('components');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(client.name || '');
  const [editedPhone, setEditedPhone] = useState(client.phone || '');
  const { statuses: statusConfig, addStatus: handleAddStatus } = useClientStatuses();
  const [editedStatus, setEditedStatus] = useState(client.status || 'new');
  const [editedSource, setEditedSource] = useState(client.source || 'manual');
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
        status: editedStatus,
        source: editedSource
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
    setEditedSource(client.source || 'manual');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-[1.2rem] border border-blue-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden animate-in zoom-in-95 duration-300 max-w-full flex flex-col max-h-[90vh] m-1">
      {/* Header - Compact & Premium */}
      <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-3 flex items-center justify-between flex-shrink-0 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center border border-white/20">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-base tracking-tight leading-none">
              {t('info_panel_title', 'Информация') || 'Информация'}
            </h3>
            <span className="text-[9px] font-bold text-blue-100 uppercase tracking-widest mt-0.5">
              💎 V3.1 POLISHED
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all duration-300 border border-white/5 relative z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content - Compact Scroll */}
      <div className="p-3 space-y-2 overflow-y-auto flex-1 bg-gray-50/30">
        {/* Profile Section - Very Compact */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          {client.profile_pic ? (
            <img
              src={client.profile_pic}
              alt={client.display_name}
              className="w-10 h-10 rounded-xl object-cover border border-white shadow-sm flex-shrink-0"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 ${client.profile_pic ? 'hidden' : ''
              }`}
          >
            <span className="text-lg font-bold">
              {client.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm tracking-tight truncate leading-tight">{client.display_name}</p>
            {client.username && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                <p className="text-[11px] font-bold text-blue-600 truncate">@{client.username}</p>
              </div>
            )}
          </div>
        </div>

        {/* Name Field - Compact Horizontal */}
        <div className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm hover:border-blue-200 transition-all group">
          <div className={`${isEditing ? 'space-y-2' : 'flex items-center justify-between'}`}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('client_name', 'Имя') || 'Имя'}
              </span>
            </div>
            {isEditing ? (
              <Input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder={t('client_name_placeholder', 'Имя клиента') || 'Имя клиента'}
                className="h-9 text-base border-gray-100 focus:border-blue-500 rounded-lg bg-gray-50/50"
              />
            ) : (
              <p className="text-gray-900 font-bold text-base">
                {client.name || <span className="text-gray-300 italic font-normal">{t('not_specified', 'Не указано') || 'Не указано'}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Phone Field - Compact Horizontal */}
        <div className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm hover:border-green-200 transition-all group">
          <div className={`${isEditing ? 'space-y-2' : 'flex items-center justify-between'}`}>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('phone', 'Телефон') || 'Телефон'}
              </span>
            </div>
            {isEditing ? (
              <Input
                type="text"
                value={editedPhone}
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder={t('phone_placeholder', 'Телефон') || 'Телефон'}
                className="h-9 text-base border-gray-100 focus:border-green-500 rounded-lg bg-gray-50/50"
              />
            ) : (
              <p className="text-gray-900 font-bold text-base font-mono leading-none">
                {client.phone || <span className="text-gray-300 italic font-normal">{t('not_specified_phone', 'Не указано') || 'Не указано'}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Status Field - Compact horizontal */}
        <div className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm hover:border-purple-200 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('status', 'Статус') || 'Статус'}
              </span>
            </div>
            <div className="scale-90 origin-right">
              <StatusSelect
                value={isEditing ? editedStatus : client.status}
                onChange={async (newStatus) => {
                  if (isEditing) {
                    setEditedStatus(newStatus);
                  } else {
                    try {
                      await onUpdate({
                        name: client.name,
                        phone: client.phone,
                        status: newStatus
                      });
                    } catch (error) {
                      console.error('Failed to update status:', error);
                    }
                  }
                }}
                options={statusConfig}
                allowAdd={true}
                onAddStatus={handleAddStatus}
              />
            </div>
          </div>
        </div>
        {/* Source and Bot Mode Section - Ultra Compact */}
        <div className="bg-white rounded-xl border border-gray-100 p-2 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('source_title', 'Источник') || 'Источник'}
              </span>
            </div>
            {isEditing ? (
              <select
                value={editedSource}
                onChange={(e) => setEditedSource(e.target.value)}
                className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-lg border border-blue-200 focus:outline-none"
              >
                <option value="manual">{t('source.manual', 'Вручную') || 'Вручную'}</option>
                <option value="instagram">📷 Instagram</option>
                <option value="telegram">✈️ Telegram</option>
                <option value="whatsapp">📱 WhatsApp</option>
                <option value="account">👤 ЛК</option>
                <option value="guest_link">🔗 Ссылка</option>
              </select>
            ) : (
              <div className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-lg border border-blue-100">
                {client.source === 'instagram' ? '📷 Instagram' :
                  client.source === 'telegram' ? '✈️ Telegram' :
                    client.source === 'whatsapp' ? '📱 WhatsApp' :
                      client.source === 'account' ? '👤 ЛК' :
                        client.source === 'guest_link' ? '🔗 Ссылка' :
                          t(`source.${client.source || 'manual'}`, client.source || 'Вручную') || (client.source || 'Вручную')}
              </div>
            )}
          </div>
          <div className="pt-1.5 border-t border-gray-50">
            <BotModeSelector
              currentMode={botMode}
              onChange={handleBotModeChange}
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1 overflow-x-auto pb-1 no-scrollbar w-full">
          {/* Instagram Link */}
          {client.username && (
            <a href={`https://instagram.com/${client.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 border border-pink-100 hover:bg-pink-100 transition-colors shrink-0"
            >
              <Instagram className="w-6 h-6 text-pink-600" />
              <span className="text-sm font-bold text-pink-600">Inst</span>
            </a>
          )}

          {/* Telegram Link */}
          {client.telegram_id && (
            <a href={`https://t.me/${client.telegram_id.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors shrink-0"
            >
              <Send className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-bold text-blue-600">TG</span>
            </a>
          )}

          {/* WhatsApp Link */}
          {client.phone && (
            <a href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100 hover:bg-green-100 transition-colors shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-green-600" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.301-.15-1.767-.872-2.04-.971-.272-.099-.47-.15-.669.15-.199.3-.771.971-.945 1.171-.174.199-.348.225-.649.075-.301-.15-1.272-.469-2.421-1.493-.896-.799-1.5-1.786-1.674-2.086-.174-.3-.019-.462.13-.612.135-.135.301-.35.451-.525.151-.175.201-.3.301-.5.1-.199.05-.374-.025-.525-.075-.15-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.113 2.95.048.075 2.094 3.197 5.074 4.484.708.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.767-.721 2.016-1.417.249-.696.249-1.294.174-1.417-.075-.121-.272-.198-.57-.348h-.001zm-5.452 7.749H11.996c-1.808 0-3.585-.486-5.143-1.405l-.369-.219-3.824 1.002 1.02-3.727-.24-.382a10.999 10.999 0 01-1.688-5.833c0-6.066 4.935-11.001 11.003-11.001 2.937 0 5.698 1.144 7.776 3.223a10.923 10.923 0 013.221 7.778c0 6.067-4.935 11.003-11.003 11.003z" />
              </svg>
              <span className="text-sm font-bold text-green-600">WA</span>
            </a>
          )}
        </div>
      </div>

      {/* Actions - зафиксированы внизу */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t-2 border-gray-100 flex-shrink-0">
        {isEditing ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-12 rounded-2xl shadow-lg shadow-blue-200 transition-all duration-300 active:scale-[0.98]"
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-12 rounded-2xl shadow-lg shadow-blue-200 transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300 text-white">
              <Edit2 className="w-4 h-4" />
            </div>
            {t('edit', 'Редактировать') || 'Редактировать'}
          </Button>
        )}
      </div>
    </div>
  );
}
