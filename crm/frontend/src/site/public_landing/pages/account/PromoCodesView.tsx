import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket, Percent, Coins, Search, Loader, Gift, Tag } from 'lucide-react';
import { api } from '@crm/services/api';
import { apiClient } from '@crm/api/client';
import { Button } from '@site/public_landing/components/ui/button';
import { Input } from '@site/public_landing/components/ui/input';
import { toast } from 'sonner';
import { useCurrency } from '@crm/hooks/useSalonSettings';

interface PromoCode {
    id: number;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    description: string | null;
    valid_until: string | null;
    min_booking_amount: number;
    is_active: boolean;
}

interface SpecialPackage {
    id: number;
    name: string;
    description: string | null;
    original_price: number;
    special_price: number;
    promo_code: string | null;
    valid_until: string | null;
    is_active: boolean;
}

interface PromoCodesViewProps {
    mode?: 'promo-codes' | 'special-offers';
}

export function PromoCodesView({ mode = 'promo-codes' }: PromoCodesViewProps) {
    const { t } = useTranslation(['booking', 'common', 'account', 'layouts/mainlayout']);
    const { formatCurrency } = useCurrency();
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [specialPackages, setSpecialPackages] = useState<SpecialPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const isPromoMode = mode === 'promo-codes';

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                if (isPromoMode) {
                    const response = await api.getPromoCodes();
                    setPromoCodes(response.filter((promo: PromoCode) => promo.is_active));
                    return;
                }

                const response = await apiClient.getSpecialPackages(true) as { packages?: SpecialPackage[] };
                const packages = Array.isArray(response?.packages) ? response.packages : [];
                setSpecialPackages(packages.filter((item) => item.is_active));
            } catch (error) {
                console.error('Failed to load offers data:', error);
                toast.error(t('common:error_loading_data', 'Failed to load data'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isPromoMode, t]);

    const filteredPromoCodes = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (query.length === 0) {
            return promoCodes;
        }
        return promoCodes.filter((promo) =>
            promo.code.toLowerCase().includes(query)
            || (promo.description ?? '').toLowerCase().includes(query)
        );
    }, [promoCodes, searchTerm]);

    const filteredSpecialPackages = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (query.length === 0) {
            return specialPackages;
        }
        return specialPackages.filter((item) =>
            item.name.toLowerCase().includes(query)
            || (item.description ?? '').toLowerCase().includes(query)
            || (item.promo_code ?? '').toLowerCase().includes(query)
        );
    }, [specialPackages, searchTerm]);

    const copyToClipboard = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(t('promotions.copied', 'Promo code copied to clipboard!'));
        } catch (error) {
            toast.error(t('common:error_occurred', 'An error occurred'));
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">
                        {isPromoMode
                            ? t('layouts/mainlayout:menu.promo_codes', 'Промокоды')
                            : t('account:settings.special_offers', 'Специальные предложения и скидки')}
                    </h2>
                    <p className="text-muted-foreground">
                        {isPromoMode
                            ? t('promotions.offer_desc', 'Use these codes to get discounts on your next visit')
                            : t('settings.promotions', 'Акции и предложения')}
                    </p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common.search', 'Search...')}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {isPromoMode ? (
                filteredPromoCodes.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-lg">
                        <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">{t('promotions.no_active_codes', 'No active promo codes available right now.')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPromoCodes.map((promo) => (
                            <div
                                key={promo.id}
                                className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all group relative"
                            >
                                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Ticket className="w-24 h-24 rotate-12" />
                                </div>

                                <div className="p-6 relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div
                                            className={`
                                                w-12 h-12 rounded-full flex items-center justify-center
                                                ${promo.discount_type === 'percent' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}
                                            `}
                                        >
                                            {promo.discount_type === 'percent'
                                                ? <Percent className="w-6 h-6" />
                                                : <Coins className="w-6 h-6" />}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">
                                                {promo.discount_type === 'percent'
                                                    ? `${promo.discount_value}%`
                                                    : formatCurrency(promo.discount_value)}
                                            </div>
                                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                                {t('common.discount', 'OFF')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <div className="font-mono text-lg font-bold bg-muted/50 p-2 rounded text-center border border-dashed border-border select-all">
                                            {promo.code}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                            {promo.description ?? t('promotions.no_desc', 'No description')}
                                        </p>
                                        {promo.min_booking_amount > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('promotions.min_order', 'Min. order')}: {formatCurrency(promo.min_booking_amount)}
                                            </p>
                                        )}
                                        {promo.valid_until && (
                                            <p className="text-xs text-amber-600 font-medium">
                                                {t('common.expires', 'Expires')}: {new Date(promo.valid_until).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={() => copyToClipboard(promo.code)}
                                    >
                                        {t('common.copy_code', 'Copy Code')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : filteredSpecialPackages.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                    <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">{t('promotions.no_active_codes', 'No active promo codes available right now.')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSpecialPackages.map((item) => {
                        const hasDiscount = item.original_price > 0 && item.special_price >= 0 && item.special_price < item.original_price;
                        const discountPercent = hasDiscount
                            ? Math.round(((item.original_price - item.special_price) / item.original_price) * 100)
                            : 0;

                        return (
                            <div key={item.id} className="bg-card border rounded-xl p-6 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    {discountPercent > 0 && (
                                        <div className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                                            -{discountPercent}%
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 mb-5">
                                    <h3 className="text-lg font-semibold leading-tight">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground min-h-[40px]">
                                        {item.description ?? t('promotions.no_desc', 'No description')}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-primary">{formatCurrency(item.special_price)}</span>
                                        {hasDiscount && (
                                            <span className="text-sm line-through text-muted-foreground">{formatCurrency(item.original_price)}</span>
                                        )}
                                    </div>
                                    {item.valid_until && (
                                        <p className="text-xs text-amber-600 font-medium">
                                            {t('common.expires', 'Expires')}: {new Date(item.valid_until).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>

                                {item.promo_code && item.promo_code.length > 0 ? (
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={() => copyToClipboard(item.promo_code ?? '')}
                                    >
                                        <Tag className="w-4 h-4 mr-2" />
                                        {item.promo_code}
                                    </Button>
                                ) : (
                                    <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                                        {t('promotions.no_desc', 'No description')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
