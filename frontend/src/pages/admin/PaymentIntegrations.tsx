import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Settings, CheckCircle, XCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface PaymentProvider {
    id: number;
    name: string;
    is_active: boolean;
    settings: any;
    created_at: string;
    updated_at: string;
}

const PaymentIntegrations = () => {
    const { t } = useTranslation(['admin/integrations', 'common']);
    const [providers, setProviders] = useState<PaymentProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/payment-providers');
            setProviders(response.providers || []);
        } catch (error) {
            console.error('Error loading payment providers:', error);
            toast.error(t('errors.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    const providerInfo = {
        stripe: {
            name: 'Stripe',
            description: 'Международные платежи картами',
            icon: '💳',
            color: 'from-purple-500 to-indigo-600'
        },
        yookassa: {
            name: 'ЮKassa',
            description: 'Российская платежная система',
            icon: '🇷🇺',
            color: 'from-blue-500 to-cyan-600'
        },
        tinkoff: {
            name: 'Tinkoff',
            description: 'Банковские платежи',
            icon: '🏦',
            color: 'from-yellow-500 to-orange-600'
        },
        paypal: {
            name: 'PayPal',
            description: 'Международные платежи',
            icon: '💰',
            color: 'from-blue-600 to-blue-800'
        }
    };

    const getProviderStatus = (providerName: string) => {
        const provider = providers.find(p => p.name === providerName);
        return provider?.is_active || false;
    };

    return (
        <div className="payment-integrations-page">
            <div className="page-header">
                <div>
                    <h1>{t('payment.title', 'Платежные системы')}</h1>
                    <p className="text-gray-600">{t('payment.subtitle', 'Настройка интеграций с платежными системами')}</p>
                </div>
            </div>

            {loading ? (
                <div className="loading">{t('common:loading', 'Загрузка...')}</div>
            ) : (
                <div className="providers-grid">
                    {Object.entries(providerInfo).map(([key, info]) => {
                        const isActive = getProviderStatus(key);

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
                                    <div className="provider-stats">
                                        <div className="stat">
                                            <span className="label">{t('payment.status', 'Статус')}:</span>
                                            <span className={`value ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                {isActive ? t('payment.active', 'Активен') : t('payment.inactive', 'Не настроен')}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        className="btn-primary w-full"
                                        onClick={() => {
                                            setSelectedProvider(key);
                                            setShowConfigDialog(true);
                                        }}
                                    >
                                        <Settings size={16} />
                                        {isActive ? t('payment.configure', 'Настроить') : t('payment.setup', 'Подключить')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showConfigDialog && selectedProvider && (
                <ConfigDialog
                    provider={selectedProvider}
                    providerInfo={providerInfo[selectedProvider as keyof typeof providerInfo]}
                    onClose={() => {
                        setShowConfigDialog(false);
                        setSelectedProvider(null);
                    }}
                    onSuccess={() => {
                        setShowConfigDialog(false);
                        setSelectedProvider(null);
                        loadProviders();
                        toast.success(t('payment.configSuccess', 'Настройки сохранены'));
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
        secret_key: '',
        webhook_secret: '',
        is_active: true,
        settings: {}
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/payment-providers', formData);
            onSuccess();
        } catch (error) {
            console.error('Error saving provider:', error);
            toast.error(t('errors.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <h2>{t('payment.configureProvider', 'Настройка')} {providerInfo.name}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('payment.apiKey', 'API ключ')} *</label>
                        <input
                            type="text"
                            value={formData.api_key}
                            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            placeholder={provider === 'stripe' ? 'sk_live_...' : 'API Key'}
                            required
                        />
                        <small className="text-gray-500">
                            {provider === 'stripe' && 'Получите в Stripe Dashboard → API Keys'}
                            {provider === 'yookassa' && 'Shop ID из личного кабинета ЮKassa'}
                            {provider === 'tinkoff' && 'Terminal Key из личного кабинета'}
                        </small>
                    </div>

                    <div className="form-group">
                        <label>{t('payment.secretKey', 'Секретный ключ')} *</label>
                        <input
                            type="password"
                            value={formData.secret_key}
                            onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                            placeholder="Secret Key"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('payment.webhookSecret', 'Webhook Secret')}</label>
                        <input
                            type="password"
                            value={formData.webhook_secret}
                            onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                            placeholder="Webhook Secret"
                        />
                        <small className="text-gray-500">
                            {t('payment.webhookUrl', 'URL для вебхука')}: {window.location.origin}/api/webhook/{provider}
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            {t('payment.enableProvider', 'Включить провайдера')}
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

export default PaymentIntegrations;
