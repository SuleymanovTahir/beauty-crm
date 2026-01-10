// /frontend/src/pages/admin/Referrals.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Gift, TrendingUp, Search, Settings,
    ChevronRight, ArrowLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

interface Referral {
    id: string;
    referrer_name: string;
    referrer_email: string;
    referred_name: string;
    referred_email: string;
    status: 'pending' | 'completed' | 'cancelled';
    points_awarded: number;
    created_at: string;
}

export default function Referrals() {
    const { t } = useTranslation(['adminPanel/ReferralProgram', 'common', 'services']);
    const navigate = useNavigate();

    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [stats, setStats] = useState({
        total_referrals: 0,
        completed_referrals: 0,
        points_distributed: 0,
    });

    const [settings, setSettings] = useState({
        referrer_bonus: 500,
        referred_bonus: 200,
        min_purchase_amount: 0,
    });

    useEffect(() => {
        loadReferrals();
        loadSettings();
        loadStats();
    }, [statusFilter]);

    const loadReferrals = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await fetch(`/api/admin/referrals?${params.toString()}`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.referrals) setReferrals(data.referrals);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/admin/referrals/settings', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.settings) setSettings(data.settings);
            }
        } catch (error) { }
    };

    const loadStats = async () => {
        try {
            const response = await fetch('/api/admin/referrals/stats', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) setStats(data.stats);
            }
        } catch (error) { }
    };

    const handleSaveSettings = async () => {
        try {
            const response = await fetch('/api/admin/referrals/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(settings),
            });

            if (response.ok) {
                toast.success(t('toasts.settings_saved', 'Настройки сохранены'));
                setShowSettingsDialog(false);
            }
        } catch (error) {
            toast.error(t('common:error_saving', 'Ошибка сохранения'));
        }
    };

    const statsCards = [
        {
            title: t('stats.total_referrals', 'Всего рекомендаций'),
            value: stats.total_referrals,
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            lightColor: 'bg-blue-50 text-blue-600',
            shadow: 'shadow-blue-100'
        },
        {
            title: t('stats.completed_referrals', 'Успешных визитов'),
            value: stats.completed_referrals,
            icon: TrendingUp,
            color: 'from-emerald-500 to-emerald-600',
            lightColor: 'bg-emerald-50 text-emerald-600',
            shadow: 'shadow-emerald-100'
        },
        {
            title: t('stats.points_distributed', 'Выдано бонусов'),
            value: stats.points_distributed.toLocaleString(),
            icon: Gift,
            color: 'from-blue-500 to-blue-600',
            lightColor: 'bg-blue-50 text-blue-600',
            shadow: 'shadow-blue-100'
        },
    ];

    const filteredReferrals = referrals.filter(r =>
        r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referrer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referred_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50/30 p-4 sm:p-8 animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Back Navigation */}
                <button
                    onClick={() => navigate('/crm/services')}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors group"
                >
                    <div className="p-1.5 rounded-lg group-hover:bg-white border border-transparent group-hover:border-gray-100 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs tracking-tight">{t('common:back', 'Назад')}</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Gift className="w-6 h-6 text-blue-600" />
                            </div>
                            {t('title', 'Реферальная программа')}
                        </h1>
                        <p className="text-gray-500 mt-1.5 font-medium max-w-xl text-sm">
                            {t('subtitle', 'Превратите ваших довольных клиентов в амбассадоров вашего бренда.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowSettingsDialog(true)}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg h-10 px-4 font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
                        >
                            <Settings className="w-4 h-4 text-gray-400" />
                            {t('settings', 'Настроить правила')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsCards.map((stat, idx) => (
                        <Card key={idx} className="overflow-hidden border-none shadow-sm bg-white rounded-xl border border-gray-100 group transition-all hover:shadow-md">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{stat.title}</p>
                                        <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-lg ${stat.lightColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                                <h3 className="text-base font-bold text-gray-900">{t('table.title', 'История рекомендаций')}</h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder={t('table.search_placeholder', 'Поиск...')}
                                        className="pl-9 h-10 bg-white border-gray-200 rounded-lg text-xs focus:ring-blue-500/10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-lg border border-gray-100">
                                    {['all', 'pending', 'completed', 'cancelled'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${statusFilter === status
                                                ? 'bg-white text-blue-700 shadow-sm border border-gray-100'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {status === 'all' ? t('table.filters.all_statuses', 'Все') : t(`table.statuses.${status}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow className="hover:bg-transparent border-b border-gray-100">
                                    <TableHead className="py-3 px-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">{t('table.columns.referrer', 'Кто пригласил')}</TableHead>
                                    <TableHead className="py-3 px-5 text-center text-gray-300">
                                        <ChevronRight className="w-3.5 h-3.5 mx-auto" />
                                    </TableHead>
                                    <TableHead className="py-3 px-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">{t('table.columns.referred_friend', 'Приглашенный друг')}</TableHead>
                                    <TableHead className="py-3 px-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">{t('table.columns.status', 'Статус')}</TableHead>
                                    <TableHead className="py-3 px-5 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">{t('table.columns.points_awarded', 'Бонусы')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReferrals.map((r) => (
                                    <TableRow key={r.id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 group">
                                        <TableCell className="py-3 px-5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                    {r.referrer_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-gray-900">{r.referrer_name}</div>
                                                    <div className="text-[10px] text-gray-500">{r.referrer_email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-5 text-center">
                                            <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center mx-auto">
                                                <ChevronRight className="w-2.5 h-2.5 text-gray-300" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                    {r.referred_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-gray-900">{r.referred_name}</div>
                                                    <div className="text-[10px] text-gray-500">{r.referred_email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-5">
                                            {r.status === 'completed' ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[9px] font-bold">
                                                    {t('table.statuses.completed', 'Завершено')}
                                                </Badge>
                                            ) : r.status === 'pending' ? (
                                                <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 text-[9px] font-bold">
                                                    {t('table.statuses.pending', 'Ожидает')}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-50 text-rose-600 hover:bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 text-[9px] font-bold">
                                                    {t('table.statuses.cancelled', 'Отменено')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 px-5 text-right">
                                            <div className={`text-xs font-black ${r.points_awarded > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                                                {r.points_awarded > 0 ? `+${r.points_awarded}` : '—'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {!loading && filteredReferrals.length === 0 && (
                            <div className="py-16 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Users className="w-6 h-6 text-gray-200" />
                                </div>
                                <h4 className="text-base font-bold text-gray-900">Никого не нашли</h4>
                                <p className="text-gray-500 text-xs max-w-xs mx-auto">
                                    По вашему запросу рекомендации отсутствуют.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                    <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                                    <Settings className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-white">{t('dialogs.settings.title', 'Правила программы')}</DialogTitle>
                                    <p className="text-blue-100 text-xs opacity-90">Настройка вознаграждений</p>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="p-8 space-y-6 bg-white">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">{t('dialogs.settings.referrer_bonus', 'Бонус пригласившему')}</Label>
                                    <div className="relative group">
                                        <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                        <Input
                                            type="number"
                                            className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl font-bold text-base focus:bg-white"
                                            value={settings.referrer_bonus}
                                            onChange={(e) => setSettings({ ...settings, referrer_bonus: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">{t('dialogs.settings.referred_bonus', 'Бонус другу')}</Label>
                                    <div className="relative group">
                                        <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                        <Input
                                            type="number"
                                            className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl font-bold text-base focus:bg-white"
                                            value={settings.referred_bonus}
                                            onChange={(e) => setSettings({ ...settings, referred_bonus: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">{t('dialogs.settings.min_purchase_amount', 'Мин. сумма покупки друга')}</Label>
                                    <div className="relative group">
                                        <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                        <Input
                                            type="number"
                                            className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl font-bold text-base focus:bg-white"
                                            value={settings.min_purchase_amount}
                                            onChange={(e) => setSettings({ ...settings, min_purchase_amount: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
                            <div className="flex gap-3 w-full">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowSettingsDialog(false)}
                                    className="flex-1 h-11 rounded-xl font-bold border-gray-200"
                                >
                                    {t('buttons.cancel', 'Отмена')}
                                </Button>
                                <Button
                                    onClick={handleSaveSettings}
                                    className="flex-1 h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                >
                                    {t('buttons.save_changes', 'Сохранить')}
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
