import { useState, useEffect } from 'react';
import {
    MessageCircle,
    Loader,
    Save,
    Edit,
    ArrowLeft,
    MessageSquare
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { InstagramIcon, WhatsAppIcon, TelegramIcon, TikTokIcon } from '../../components/icons/SocialIcons';
import '../shared/Settings.css';

export default function Messengers() {
    const { t } = useTranslation(['admin/settings', 'common']);
    const navigate = useNavigate();

    const [messengerSettings, setMessengerSettings] = useState<Array<{
        id: number
        messenger_type: string
        is_enabled: boolean
        display_name: string
        has_token: boolean
        api_token?: string
        webhook_url?: string
    }>>([]);
    const [loading, setLoading] = useState(true);
    const [editingMessenger, setEditingMessenger] = useState<string | null>(null);
    const [messengerForm, setMessengerForm] = useState({
        api_token: '',
        webhook_url: ''
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await api.getMessengerSettings();
            setMessengerSettings(response.settings);
        } catch (err) {
            console.error('Error loading messenger settings:', err);
            toast.error(t('settings:error_loading_settings'));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMessenger = async (messengerType: string, currentState: boolean) => {
        try {
            await api.updateMessengerSetting(messengerType, { is_enabled: !currentState });
            toast.success(`${messengerType} ${!currentState ? t('settings:enabled') : t('settings:disabled')}`);
            loadSettings();
            window.dispatchEvent(new Event('messengers-updated'));
        } catch (err) {
            console.error('Error toggling messenger:', err);
            toast.error(t('settings:error_changing_setting'));
        }
    };

    const handleSaveMessengerConfig = async (messengerType: string) => {
        try {
            await api.updateMessengerSetting(messengerType, messengerForm);
            toast.success(t('settings:settings_saved'));
            setEditingMessenger(null);
            setMessengerForm({ api_token: '', webhook_url: '' });
            loadSettings();
            window.dispatchEvent(new Event('messengers-updated'));
        } catch (err) {
            console.error('Error saving messenger config:', err);
            toast.error(t('settings:error_saving_settings'));
        }
    };

    const handleStartEditMessenger = (messengerType: string) => {
        const messenger = messengerSettings.find(m => m.messenger_type === messengerType);
        if (messenger) {
            setMessengerForm({
                api_token: messenger.api_token || '',
                webhook_url: messenger.webhook_url || ''
            });
            setEditingMessenger(messengerType);
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 md:w-8 md:h-8 settings-icon-primary" />
                        {t('settings:messengers_settings')}
                    </h1>
                    <p className="text-gray-600">
                        {t('settings:manage_messengers', 'Настройка интеграций с мессенджерами для автоматизации и уведомлений')}
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate(-1)} className="hidden md:flex">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('common:back', 'Назад')}
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader className="w-12 h-12 settings-loader animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {messengerSettings.map((messenger) => (
                        <div
                            key={messenger.messenger_type}
                            className={`border-2 rounded-2xl p-6 transition-all duration-300 ${messenger.is_enabled
                                ? 'settings-border-pink-light settings-bg-pink-light/30 shadow-sm'
                                : 'border-gray-100 bg-white hover:border-gray-200'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 hover:scale-110 group/icon-card ${messenger.is_enabled ? 'bg-white' : 'bg-gray-100'}`}>
                                        {messenger.messenger_type === 'instagram' ? (
                                            <InstagramIcon className="w-9 h-9" colorful={true} />
                                        ) : messenger.messenger_type === 'whatsapp' ? (
                                            <WhatsAppIcon className="w-9 h-9" colorful={true} />
                                        ) : messenger.messenger_type === 'telegram' ? (
                                            <TelegramIcon className="w-9 h-9" colorful={true} />
                                        ) : messenger.messenger_type === 'tiktok' ? (
                                            <TikTokIcon className="w-9 h-9" colorful={true} />
                                        ) : (
                                            <MessageCircle className="w-9 h-9 text-blue-600" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {messenger.display_name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {messenger.is_enabled ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                                    ACTIVE
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase">
                                                    {t('settings:disabled', 'Отключен')}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500">
                                                {messenger.has_token ? t('settings:configured', 'Настроен') : t('settings:needs_configuration', 'Требует настройки')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Switch
                                    checked={messenger.is_enabled}
                                    onCheckedChange={() =>
                                        handleToggleMessenger(messenger.messenger_type, messenger.is_enabled)
                                    }
                                />
                            </div>

                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                {messenger.messenger_type === 'instagram' && t('settings:instagram_desc', 'Автоматические ответы в Direct и сторис, сбор лидов.')}
                                {messenger.messenger_type === 'telegram' && t('settings:telegram_desc', 'Чат-бот для записи клиентов, уведомления менеджерам.')}
                                {messenger.messenger_type === 'whatsapp' && t('settings:whatsapp_desc', 'Рассылки через WhatsApp Business API, напоминания о записи.')}
                                {messenger.messenger_type === 'tiktok' && t('settings:tiktok_desc', 'Сбор заявок из TikTok Lead Gen и общение в чате.')}
                            </p>

                            {messenger.is_enabled && (
                                <div className="space-y-4 pt-6 border-t border-gray-100">
                                    {editingMessenger === messenger.messenger_type ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <Label htmlFor={`${messenger.messenger_type}-token`} className="text-sm font-semibold">
                                                    API Token
                                                </Label>
                                                <Input
                                                    id={`${messenger.messenger_type}-token`}
                                                    type="password"
                                                    value={messengerForm.api_token}
                                                    onChange={(e) =>
                                                        setMessengerForm({ ...messengerForm, api_token: e.target.value })
                                                    }
                                                    placeholder={
                                                        messenger.messenger_type === 'telegram'
                                                            ? '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'
                                                            : t('settings:placeholder_enter_api_token', 'Введите API токен...')
                                                    }
                                                    className="bg-white/50 border-gray-200 focus:border-pink-300 transition-all"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`${messenger.messenger_type}-webhook`} className="text-sm font-semibold">
                                                    Webhook URL
                                                </Label>
                                                <Input
                                                    id={`${messenger.messenger_type}-webhook`}
                                                    value={messengerForm.webhook_url}
                                                    onChange={(e) =>
                                                        setMessengerForm({ ...messengerForm, webhook_url: e.target.value })
                                                    }
                                                    placeholder="https://your-domain.com/webhook"
                                                    className="bg-white/50 border-gray-200 focus:border-pink-300 transition-all"
                                                />
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <Button
                                                    type="button"
                                                    onClick={() => handleSaveMessengerConfig(messenger.messenger_type)}
                                                    className="settings-button-gradient flex-1"
                                                >
                                                    <Save className="w-4 h-4 mr-2" />
                                                    {t('settings:save', 'Сохранить')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingMessenger(null);
                                                        setMessengerForm({ api_token: '', webhook_url: '' });
                                                    }}
                                                    className="flex-1"
                                                >
                                                    {t('settings:cancel', 'Отмена')}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate('/crm/chat')}
                                                className="text-gray-600 hover:text-gray-800"
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                {t('settings:open_chat', 'Чат')}
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleStartEditMessenger(messenger.messenger_type)}
                                                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 font-semibold"
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                {messenger.has_token ? t('settings:change_settings', 'Настроить') : t('settings:configure', 'Настроить')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
