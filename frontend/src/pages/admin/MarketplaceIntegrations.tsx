import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Store, Settings, CheckCircle, XCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface MarketplaceProvider {
    id: number;
    name: string;
    is_active: boolean;
    sync_enabled: boolean;
    last_sync_at: string | null;
    settings: any;
    created_at: string;
}

const MarketplaceIntegrations = () => {
    const { t } = useTranslation(['admin/integrations', 'common']);
    const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [syncing, setSyncing] = useState<string | null>(null);

    useEffect(() => {
        loadProviders();
        loadStats();
    }, []);

    const loadProviders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/marketplace-providers');
            setProviders(response.providers || []);
        } catch (error) {
            console.error('Error loading marketplace providers:', error);
            toast.error(t('errors.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await api.get('/marketplace/stats');
            setStats(response);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleSync = async (providerName: string) => {
        try {
            setSyncing(providerName);
            await api.post(`/marketplace/sync/${providerName}`);
            toast.success(t('marketplace.syncStarted', 'Синхронизация запущена'));
            setTimeout(loadProviders, 2000);
        } catch (error) {
            console.error('Error syncing:', error);
            toast.error(t('errors.syncFailed'));
        } finally {
            setSyncing(null);
        }
    };

    const marketplaceInfo = {
        yandex_maps: {
            name: 'Яндекс.Карты',
            description: 'Записи и отзывы с Яндекс.Карт',
            icon: '🗺️',
            color: 'from-red-500 to-yellow-500'
        },
        '2gis': {
            name: '2ГИС',
            description: 'Онлайн-записи через 2ГИС',
            icon: '🏢',
            color: 'from-green-500 to-emerald-600'
        },
        google_business: {
            name: 'Google Business',
            description: 'Google Мой Бизнес',
            icon: '🔍',
            color: 'from-blue-500 to-indigo-600'
        },
        booksy: {
            name: 'Booksy',
            description: 'Платформа онлайн-записи',
            icon: '📅',
            color: 'from-purple-500 to-pink-600'
        },
        yclients: {
            name: 'YCLIENTS',
            description: 'CRM для салонов красоты',
            icon: '💼',
            color: 'from-cyan-500 to-blue-600'
        }
    };

    const getProviderStatus = (providerName: string) => {
        const provider = providers.find(p => p.name === providerName);
        return provider?.is_active || false;
    };

    const getProviderData = (providerName: string) => {
        return providers.find(p => p.name === providerName);
    };

    const formatLastSync = (date: string | null) => {
        if (!date) return t('marketplace.neverSynced', 'Никогда');
        const syncDate = new Date(date);
        const now = new Date();
        const diff = now.getTime() - syncDate.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return t('marketplace.justNow', 'Только что');
        if (minutes < 60) return t('marketplace.minutesAgo', '{{count}} мин назад', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('marketplace.hoursAgo', '{{count}} ч назад', { count: hours });
        const days = Math.floor(hours / 24);
        return t('marketplace.daysAgo', '{{count}} дн назад', { count: days });
    };

    return (
        <div className="marketplace-integrations-page">
            <div className="page-header">
                <div>
                    <h1>{t('marketplace.title', 'Маркетплейсы')}</h1>
                    <p className="text-gray-600">{t('marketplace.subtitle', 'Интеграция с платформами бронирования')}</p>
                </div>
            </div>

            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon bg-blue-100 text-blue-600">
                            <Store size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">
                                {Object.values(stats.bookings_by_provider || {}).reduce((a: any, b: any) => a + b, 0)}
                            </div>
                            <div className="stat-label">{t('marketplace.totalBookings', 'Всего записей')}</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon bg-yellow-100 text-yellow-600">
                            <BarChart3 size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">
                                {Object.keys(stats.bookings_by_provider || {}).length}
                            </div>
                            <div className="stat-label">{t('marketplace.activeSources', 'Активных источников')}</div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading">{t('common:loading', 'Загрузка...')}</div>
            ) : (
                <div className="providers-grid">
                    {Object.entries(marketplaceInfo).map(([key, info]) => {
                        const isActive = getProviderStatus(key);
                        const providerData = getProviderData(key);
                        const bookingCount = stats?.bookings_by_provider?.[key] || 0;
                        const reviewData = stats?.reviews_by_provider?.[key];

                        return (
                            <div key={key} className={`provider-card ${isActive ? 'active' : ''}`}>
                                <div className={`provider-header bg-gradient-to-r ${info.color}`}>
                                    <div className="provider-icon">{info.icon}</div>
                                    <div className="provider-info">
                                        <h3>{info.name}</h3>
                                        <p>{info.description}</p>
                                    </div>
                                    <div className="provider-status">
                                        {isActive ? (
                                            <CheckCircle className="text-green-400" size={24} />
                                        ) : (
                                            <XCircle className="text-gray-400" size={24} />
                                        )}
                                    </div>
                                </div>

                                <div className="provider-body">
                                    {isActive && (
                                        <div className="provider-stats">
                                            <div className="stat">
                                                <span className="label">{t('marketplace.bookings', 'Записей')}:</span>
                                                <span className="value">{bookingCount}</span>
                                            </div>
                                            {reviewData && (
                                                <div className="stat">
                                                    <span className="label">{t('marketplace.reviews', 'Отзывов')}:</span>
                                                    <span className="value">
                                                        {reviewData.count} (⭐ {reviewData.avg_rating?.toFixed(1)})
                                                    </span>
                                                </div>
                                            )}
                                            <div className="stat">
                                                <span className="label">{t('marketplace.lastSync', 'Синхронизация')}:</span>
                                                <span className="value text-sm">
                                                    {formatLastSync(providerData?.last_sync_at || null)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="provider-actions">
                                        <button
                                            className="btn-secondary flex-1"
                                            onClick={() => {
                                                setSelectedProvider(key);
                                                setShowConfigDialog(true);
                                            }}
                                        >
                                            <Settings size={16} />
                                            {t('marketplace.configure', 'Настроить')}
                                        </button>

                                        {isActive && (
                                            <button
                                                className="btn-primary flex-1"
                                                onClick={() => handleSync(key)}
                                                disabled={syncing === key}
                                            >
                                                <RefreshCw size={16} className={syncing === key ? 'animate-spin' : ''} />
                                                {syncing === key ? t('marketplace.syncing', 'Синхронизация...') : t('marketplace.sync', 'Синхронизировать')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showConfigDialog && selectedProvider && (
                <ConfigDialog
                    provider={selectedProvider}
                    providerInfo={marketplaceInfo[selectedProvider as keyof typeof marketplaceInfo]}
                    onClose={() => {
                        setShowConfigDialog(false);
                        setSelectedProvider(null);
                    }}
                    onSuccess={() => {
                        setShowConfigDialog(false);
                        setSelectedProvider(null);
                        loadProviders();
                        toast.success(t('marketplace.configSuccess', 'Настройки сохранены'));
                    }}
                />
            )}
        </div>
    );
};

const ConfigDialog = ({ provider, providerInfo, onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/integrations');
    const [formData, setFormData] = useState({
        name: provider,
        api_key: '',
        api_secret: '',
        webhook_url: '',
        is_active: true,
        settings: {}
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/marketplace-providers', formData);
            onSuccess();
        } catch (error) {
            console.error('Error saving provider:', error);
            toast.error(t('errors.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    const webhookUrl = `${window.location.origin}/api/marketplace/webhook/${provider}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <h2>{t('marketplace.configureProvider', 'Настройка')} {providerInfo.name}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('marketplace.apiKey', 'API ключ')}</label>
                        <input
                            type="text"
                            value={formData.api_key}
                            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            placeholder="API Key"
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('marketplace.apiSecret', 'API Secret')}</label>
                        <input
                            type="password"
                            value={formData.api_secret}
                            onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                            placeholder="API Secret"
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('marketplace.webhookUrl', 'URL для вебхука')}</label>
                        <div className="webhook-url-display">
                            <input
                                type="text"
                                value={webhookUrl}
                                readOnly
                                className="bg-gray-50"
                            />
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    navigator.clipboard.writeText(webhookUrl);
                                    toast.success(t('marketplace.urlCopied', 'URL скопирован'));
                                }}
                            >
                                {t('common:copy', 'Копировать')}
                            </button>
                        </div>
                        <small className="text-gray-500">
                            {t('marketplace.webhookHint', 'Укажите этот URL в настройках вебхуков на платформе')}
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            {t('marketplace.enableProvider', 'Включить интеграцию')}
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {t('common:cancel', 'Отмена')}
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? t('common:saving', 'Сохранение...') : t('common:save', 'Сохранить')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MarketplaceIntegrations;
