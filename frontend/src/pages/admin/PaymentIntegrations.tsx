import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Settings, CheckCircle, XCircle, ExternalLink, Link as LinkIcon, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const navigate = useNavigate();

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

                                    {isActive && (
                                        <>
                                            <button
                                                className="crm-btn-secondary"
                                                style={{ width: '100%', marginTop: '10px' }}
                                                onClick={() => {
                                                    setSelectedProvider(key);
                                                    setShowPaymentDialog(true);
                                                }}
                                            >
                                                <LinkIcon size={16} />
                                                {t('payment.createLink', 'Создать ссылку')}
                                            </button>

                                            <button
                                                className="crm-btn-secondary"
                                                style={{ width: '100%', marginTop: '10px' }}
                                                onClick={() => navigate('/crm/finance')}
                                            >
                                                <ExternalLink size={16} />
                                                {t('payment.viewTransactions', 'История транзакций')}
                                            </button>
                                        </>
                                    )}
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

            {showPaymentDialog && selectedProvider && (
                <CreatePaymentDialog
                    provider={selectedProvider}
                    providerInfo={providerInfo[selectedProvider as keyof typeof providerInfo]}
                    onClose={() => {
                        setShowPaymentDialog(false);
                        setSelectedProvider(null);
                    }}
                />
            )}
        </div>
    );
};

const CreatePaymentDialog = ({ provider, providerInfo, onClose }: any) => {
    const { t } = useTranslation('admin/integrations');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('AED');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [createdLink, setCreatedLink] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/api/create-payment', {
                amount: parseFloat(amount),
                currency,
                provider,
                description,
                metadata: { description: description || 'Manual Payment Link' }
            });

            if (res.payment_url) {
                setCreatedLink(res.payment_url);
            } else {
                // Fallback if no real URL is returned (e.g. simulation or manual provider)
                setCreatedLink(`${window.location.origin}/pay/${res.transaction_id}`);
            }
            toast.success(t('payment.linkCreated', 'Ссылка успешно создана'));
        } catch (error) {
            console.error(error);
            toast.error(t('errors.createLinkFailed', 'Ошибка создания ссылки'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{t('payment.createLinkTitle', 'Создать платежную ссылку')} ({providerInfo.name})</h2>

                {!createdLink ? (
                    <form onSubmit={handleSubmit}>
                        <div className="crm-form-group">
                            <label className="crm-label">{t('payment.amount', 'Сумма')}</label>
                            <input
                                type="number"
                                className="crm-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                min="1"
                            />
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-label">{t('payment.currency', 'Валюта')}</label>
                            <select
                                className="crm-select"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="AED">AED</option>
                                <option value="USD">USD</option>
                                <option value="RUB">RUB</option>
                                <option value="KZT">KZT</option>
                            </select>
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-label">{t('common:description', 'Описание')}</label>
                            <input
                                type="text"
                                className="crm-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('payment.descriptionPlaceholder', 'За что оплата...')}
                            />
                        </div>

                        <div className="crm-modal-footer">
                            <button type="button" className="crm-btn-secondary" onClick={onClose}>
                                {t('common:cancel', 'Отмена')}
                            </button>
                            <button type="submit" className="crm-btn-primary" disabled={loading}>
                                {loading ? t('common:creating', 'Создание...') : t('common:create', 'Создать')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded border border-gray-200 break-all">
                            {createdLink}
                        </div>
                        <div className="crm-modal-footer">
                            <button
                                type="button"
                                className="crm-btn-secondary"
                                onClick={onClose}
                            >
                                {t('common:close', 'Закрыть')}
                            </button>
                            <button
                                type="button"
                                className="crm-btn-primary flex items-center gap-2"
                                onClick={() => {
                                    navigator.clipboard.writeText(createdLink);
                                    toast.success(t('common:copied', 'Скопировано'));
                                }}
                            >
                                <Copy size={16} />
                                {t('common:copy', 'Копировать')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ConfigDialog = ({ provider, providerInfo, onClose, onSuccess }: any) => {
    // ... existing ConfigDialog code ...

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
