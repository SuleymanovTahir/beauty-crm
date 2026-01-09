import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Settings, CheckCircle, XCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import '../../styles/crm-pages.css';

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
            const response = await api.get('/api/payment-providers');
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
            icon: <CreditCard size={20} />,
            brandClass: 'brand-stripe'
        },
        yookassa: {
            name: 'ЮKassa',
            description: 'Российская платежная система',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-yookassa'
        },
        tinkoff: {
            name: 'Tinkoff',
            description: 'Российский банк',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-tinkoff'
        },
        sberbank: {
            name: 'Сбербанк',
            description: 'Сбербанк России',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-sberbank'
        },
        alfabank: {
            name: 'Альфа-Банк',
            description: 'Альфа-Банк России',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-alfabank'
        },
        kaspi: {
            name: 'Kaspi.kz',
            description: 'Казахстанский банк',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-kaspi'
        },
        halyk: {
            name: 'Halyk Bank',
            description: 'Народный банк Казахстана',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-halyk'
        },
        freedom: {
            name: 'Freedom Finance',
            description: 'Freedom Bank Kazakhstan',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-freedom'
        },
        emirates_nbd: {
            name: 'Emirates NBD',
            description: 'Банк ОАЭ',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-emirates_nbd'
        },
        adcb: {
            name: 'ADCB',
            description: 'Abu Dhabi Commercial Bank',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-adcb'
        },
        mashreq: {
            name: 'Mashreq Bank',
            description: 'Банк Машрек ОАЭ',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-mashreq'
        },
        paypal: {
            name: 'PayPal',
            description: 'Международные платежи',
            icon: <CreditCard size={20} />,
            brandClass: 'brand-paypal'
        }
    };

    const getProviderStatus = (providerName: string) => {
        const provider = providers.find(p => p.name === providerName);
        return provider?.is_active || false;
    };

    return (
        <div className="crm-page">
            <div className="crm-page-header">
                <div>
                    <h1>{t('payment.title', 'Платежные системы')}</h1>
                    <p className="text-gray-600">{t('payment.subtitle', 'Настройка интеграций с платежными системами')}</p>
                </div>
            </div>

            {loading ? (
                <div className="crm-loading">{t('common:loading', 'Загрузка...')}</div>
            ) : (
                <div className="crm-grid crm-grid-2">
                    {Object.entries(providerInfo).map(([key, info]) => {
                        const isActive = getProviderStatus(key);

                        return (
                            <div key={key} className={`crm-provider-card ${isActive ? 'active' : ''}`}>
                                <div className={`crm-provider-header ${info.brandClass}`}>
                                    <div className="crm-provider-icon">{info.icon}</div>
                                    <div className="crm-provider-info">
                                        <h3 className="crm-provider-name">{info.name}</h3>
                                        <p className="crm-provider-desc">{info.description}</p>
                                    </div>
                                    <div className="crm-provider-status">
                                        {isActive ? (
                                            <CheckCircle className="text-green-400" size={24} />
                                        ) : (
                                            <XCircle className="text-gray-400" size={24} />
                                        )}
                                    </div>
                                </div>

                                <div className="crm-provider-body">
                                    <div className="crm-provider-stats">
                                        <div className="crm-detail-row">
                                            <span className="crm-detail-label">{t('payment.status', 'Статус')}:</span>
                                            <span className={`crm-detail-value ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                {isActive ? t('payment.active', 'Активен') : t('payment.inactive', 'Не настроен')}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        className="crm-btn-primary"
                                        style={{ width: '100%' }}
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
            await api.post('/api/payment-providers', formData);
            onSuccess();
        } catch (error) {
            console.error('Error saving provider:', error);
            toast.error(t('errors.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{t('payment.configureProvider', 'Настройка')} {providerInfo.name}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="crm-form-group">
                        <label className="crm-label">{t('payment.apiKey', 'API ключ')} *</label>
                        <input
                            type="text"
                            className="crm-input"
                            value={formData.api_key}
                            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            placeholder={provider === 'stripe' ? 'sk_live_...' : 'API Key'}
                            required
                        />
                        <small className="text-gray-600 text-sm">
                            {provider === 'stripe' && 'Получите в Stripe Dashboard → API Keys'}
                            {provider === 'yookassa' && 'Shop ID из личного кабинета ЮKassa'}
                            {provider === 'tinkoff' && 'Terminal Key из личного кабинета'}
                        </small>
                    </div>

                    <div className="crm-form-group">
                        <label className="crm-label">{t('payment.secretKey', 'Секретный ключ')} *</label>
                        <input
                            type="password"
                            className="crm-input"
                            value={formData.secret_key}
                            onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                            placeholder="Secret Key"
                            required
                        />
                    </div>

                    <div className="crm-form-group">
                        <label className="crm-label">{t('payment.webhookSecret', 'Webhook Secret')}</label>
                        <input
                            type="password"
                            className="crm-input"
                            value={formData.webhook_secret}
                            onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                            placeholder="Webhook Secret"
                        />
                        <small className="text-gray-600 text-sm">
                            {t('payment.webhookUrl', 'URL для вебхука')}: {window.location.origin}/api/webhook/{provider}
                        </small>
                    </div>

                    <div className="crm-form-group">
                        <label className="crm-checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            {t('payment.enableProvider', 'Включить провайдера')}
                        </label>
                    </div>

                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn-secondary" onClick={onClose}>
                            {t('common:cancel', 'Отмена')}
                        </button>
                        <button type="submit" className="crm-btn-primary" disabled={loading}>
                            {loading ? t('common:saving', 'Сохранение...') : t('common:save', 'Сохранить')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentIntegrations;
