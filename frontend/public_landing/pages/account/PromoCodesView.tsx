import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket, Percent, Coins, Search, Loader } from 'lucide-react';
import { api } from '../../../src/services/api';
import { Button } from '../../../src/components/ui/button';
import { Input } from '../../../src/components/ui/input';
import { toast } from 'sonner';

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

export function PromoCodesView() {
    const { t } = useTranslation(['booking', 'common']);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPromoCodes = async () => {
            try {
                // Fetch only public active promo codes (or personalized ones)
                // For now, let's fetch non-personalized active ones
                const response = await api.getPromoCodes();
                setPromoCodes(response.filter((p: PromoCode) => p.is_active));
            } catch (error) {
                console.error('Failed to fetch promo codes:', error);
                toast.error(t('errors.fetch_promocodes', 'Failed to load promo codes'));
            } finally {
                setLoading(false);
            }
        };

        fetchPromoCodes();
    }, []);

    const filteredCodes = promoCodes.filter(promo =>
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(t('promotions.copied', 'Promo code copied to clipboard!'));
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
                    <h2 className="text-2xl font-bold">{t('promotions.offer_title', 'Special Offers')}</h2>
                    <p className="text-muted-foreground">
                        {t('promotions.offer_desc', 'Use these codes to get discounts on your next visit')}
                    </p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common.search', 'Search...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {filteredCodes.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                    <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">{t('promotions.no_active_codes', 'No active promo codes available right now.')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCodes.map((promo) => (
                        <div
                            key={promo.id}
                            className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all group relative"
                        >
                            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Ticket className="w-24 h-24 rotate-12" />
                            </div>

                            <div className="p-6 relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center
                                        ${promo.discount_type === 'percent' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}
                                    `}>
                                        {promo.discount_type === 'percent' ? (
                                            <Percent className="w-6 h-6" />
                                        ) : (
                                            <Coins className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-primary">
                                            {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `${promo.discount_value}₽`}
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
                                        {promo.description || t('promotions.no_desc', 'No description')}
                                    </p>
                                    {promo.min_booking_amount > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {t('promotions.min_order', 'Min. order')}: {promo.min_booking_amount}₽
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
            )}
        </div>
    );
}
