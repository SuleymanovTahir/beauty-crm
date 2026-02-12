import { useState, useEffect } from 'react';
import {
    Ticket,
    Plus,
    Trash2,
    Loader,
    CheckCircle2,
    XCircle,
    Percent,
    Calendar,
    Users,
    Activity,
    Search,
    Zap,
    Tag,
    Gift
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import '../../styles/crm-pages.css';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../components/ui/dialog";

interface PromoCode {
    id: number;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_booking_amount: number;
    valid_from: string;
    valid_until: string | null;
    usage_limit: number | null;
    times_used: number;
    is_active: boolean;
    is_personalized: boolean;
    target_client_id: string | null;
    created_at: string;
}

interface NewPromoState {
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_booking_amount: number;
    valid_from: string;
    valid_until: string;
    usage_limit: string;
}

export default function PromoCodes() {
    const { t } = useTranslation(['admin/promocodes', 'common']);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newPromo, setNewPromo] = useState<NewPromoState>({
        code: '',
        discount_type: 'percent',
        discount_value: 10,
        min_booking_amount: 0,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        usage_limit: ''
    });

    useEffect(() => {
        loadPromoCodes();
    }, []);

    const loadPromoCodes = async () => {
        try {
            setLoading(true);
            const data = await api.getPromoCodes();
            setPromoCodes(data);
        } catch (err) {
            toast.error(t('error_loading', 'Ошибка загрузки промокодов'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newPromo.code) return toast.error(t('code_required', 'Введите код'));

        try {
            await api.createPromoCode({
                ...newPromo,
                usage_limit: newPromo.usage_limit ? parseInt(newPromo.usage_limit) : null,
                valid_until: newPromo.valid_until || null
            });
            toast.success(t('created_success', 'Промокод создан'));
            setShowCreateDialog(false);
            loadPromoCodes();
        } catch (err: any) {
            toast.error(err.error || t('error_creating', 'Ошибка создания'));
        }
    };

    const handleToggle = async (id: number) => {
        try {
            await api.togglePromoCode(id);
            loadPromoCodes();
            toast.success(t('status_updated', 'Статус обновлен'));
        } catch (err) {
            toast.error(t('error_toggling', 'Ошибка смены статуса'));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('confirm_delete', 'Удалить этот промокод?'))) return;
        try {
            await api.deletePromoCode(id);
            loadPromoCodes();
            toast.success(t('deleted_success', 'Промокод удален'));
        } catch (err) {
            toast.error(t('error_deleting', 'Ошибка удаления'));
        }
    };

    const filteredCodes = promoCodes.filter(p =>
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="crm-calendar-theme p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-[#fafafa]">
            {/* Header section with glassmorphism feel */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-pink-100 rounded-xl text-pink-600">
                            <Ticket size={28} />
                        </div>
                        {t('title', 'Промокоды')}
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">
                        {t('subtitle', 'Управление скидками и бонусными кодами для клиентов')}
                    </p>
                </div>

                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-100 px-6 py-6 rounded-2xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                >
                    <Plus size={20} />
                    {t('create_btn', 'Создать промокод')}
                </Button>
            </div>

            {/* Stats Quick View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('total_active', 'Всего активных')}</p>
                        <p className="text-2xl font-bold text-gray-900">{promoCodes.filter(p => p.is_active).length}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Zap size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('total_usage', 'Использований всего')}</p>
                        <p className="text-2xl font-bold text-gray-900">{promoCodes.reduce((acc, p) => acc + p.times_used, 0)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Gift size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('personalized_count', 'Персональных')}</p>
                        <p className="text-2xl font-bold text-gray-900">{promoCodes.filter(p => p.is_personalized).length}</p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                    placeholder={t('search_placeholder', 'Поиск по коду...')}
                    className="pl-12 h-14 bg-white border-gray-100 rounded-2xl focus:ring-pink-500 focus:border-pink-500 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Promo Codes List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
                    <Loader className="w-10 h-10 text-pink-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">{t('loading', 'Загружаем промокоды...')}</p>
                </div>
            ) : filteredCodes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Tag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">{t('not_found', 'Промокоды не найдены')}</h3>
                    <p className="text-gray-500 mt-2">{t('not_found_desc', 'Создайте свой первый промокод, чтобы привлечь больше клиентов!')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredCodes.map((promo) => (
                        <div
                            key={promo.id}
                            className={`group bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-pink-50 transition-all duration-300 relative overflow-hidden ${!promo.is_active && 'opacity-70'}`}
                        >
                            {/* Status Indicator */}
                            <div className="absolute top-0 right-0 p-6 flex gap-2">
                                <button
                                    onClick={() => handleToggle(promo.id)}
                                    className={`p-2 rounded-full transition-colors ${promo.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    title={promo.is_active ? t('deactivate', 'Деактивировать') : t('activate', 'Активировать')}
                                >
                                    {promo.is_active ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(promo.id)}
                                    className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title={t('delete', 'Удалить')}
                                >
                                    <Trash2 size={24} />
                                </button>
                            </div>

                            <div className="flex items-start gap-6">
                                <div className={`p-5 rounded-3xl ${promo.discount_type === 'percent' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {promo.discount_type === 'percent' ? <Percent size={32} /> : <Gift size={32} />}
                                </div>

                                <div className="flex-1 pr-20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl font-black text-gray-900 uppercase tracking-wider">{promo.code}</span>
                                        {promo.is_personalized && (
                                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                {t('personal', 'Personal')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-gray-500 font-medium mb-4">
                                        {promo.discount_type === 'percent'
                                            ? `${promo.discount_value}% ${t('discount_off', 'скидка')}`
                                            : `${promo.discount_value} ${t('val_currency', 'AZN')} ${t('discount_off', 'скидка')}`
                                        }
                                        {promo.min_booking_amount > 0 && ` • ${t('min_order', 'От')} ${promo.min_booking_amount} ${t('val_currency', 'AZN')}`}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Calendar size={14} />
                                            <span>{new Date(promo.valid_from).toLocaleDateString()} — {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : '∞'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Users size={14} />
                                            <span>{promo.times_used} / {promo.usage_limit || '∞'} {t('used', 'исп.')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md bg-white rounded-[40px] p-8 border-0 shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold text-gray-900">{t('create_title', 'Новый промокод')}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 ml-1">{t('code_label', 'Код промокода')}</Label>
                            <Input
                                placeholder="PROMO2024"
                                className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all uppercase font-mono font-bold tracking-widest"
                                value={newPromo.code}
                                onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('type_label', 'Тип скидки')}</Label>
                                <select
                                    className="w-full h-12 rounded-2xl bg-gray-50 border-transparent px-4 py-2 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                    value={newPromo.discount_type}
                                    onChange={(e) => setNewPromo({ ...newPromo, discount_type: e.target.value as 'percent' | 'fixed' })}
                                >
                                    <option value="percent">{t('percent', 'Процент %')}</option>
                                    <option value="fixed">{t('fixed', 'Фикс. сумма')}</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('value_label', 'Размер скидки')}</Label>
                                <Input
                                    type="number"
                                    className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                    value={newPromo.discount_value}
                                    onChange={(e) => setNewPromo({ ...newPromo, discount_value: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 ml-1">{t('min_amount_label', 'Миним. сумма записи (AZN)')}</Label>
                            <Input
                                type="number"
                                className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                value={newPromo.min_booking_amount}
                                onChange={(e) => setNewPromo({ ...newPromo, min_booking_amount: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('valid_until_label', 'Действует до')}</Label>
                                <Input
                                    type="date"
                                    className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                    value={newPromo.valid_until}
                                    onChange={(e) => setNewPromo({ ...newPromo, valid_until: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('limit_label', 'Лимит исп.')}</Label>
                                <Input
                                    type="number"
                                    placeholder="∞"
                                    className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                    value={newPromo.usage_limit}
                                    onChange={(e) => setNewPromo({ ...newPromo, usage_limit: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-10 sm:justify-start gap-3">
                        <Button
                            className="flex-1 h-14 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold shadow-lg shadow-pink-100 transition-all"
                            onClick={handleCreate}
                        >
                            {t('create_action_btn', 'Подтвердить создание')}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-14 rounded-2xl font-bold border-gray-100"
                            onClick={() => setShowCreateDialog(false)}
                        >
                            {t('cancel', 'Отмена')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
