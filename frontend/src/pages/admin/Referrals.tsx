// /frontend/src/pages/admin/Referrals.tsx
import { useState, useEffect } from 'react';
import {
    Users, Gift, TrendingUp, Search, Settings,
    ArrowRight, CheckCircle2, XCircle, Clock,
    Plus, Filter, ChevronRight, Award, Sparkles,
    Share2
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
    DialogDescription,
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
                toast.success(t('toasts.settings_saved'));
                setShowSettingsDialog(false);
            }
        } catch (error) {
            toast.error(t('toasts.failed_save'));
        }
    };

    const statsCards = [
        {
            title: t('stats.total_referrals'),
            value: stats.total_referrals,
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            lightColor: 'bg-blue-50 text-blue-600',
            shadow: 'shadow-blue-100'
        },
        {
            title: t('stats.completed_referrals'),
            value: stats.completed_referrals,
            icon: TrendingUp,
            color: 'from-emerald-500 to-emerald-600',
            lightColor: 'bg-emerald-50 text-emerald-600',
            shadow: 'shadow-emerald-100'
        },
        {
            title: t('stats.points_distributed'),
            value: stats.points_distributed.toLocaleString(),
            icon: Gift,
            color: 'from-purple-500 to-purple-600',
            lightColor: 'bg-purple-50 text-purple-600',
            shadow: 'shadow-purple-100'
        },
    ];

    const filteredReferrals = referrals.filter(r =>
        r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referrer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referred_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8 sm:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            {t('services:marketing_program', 'Маркетинговая программа')}
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                            {t('title', 'Реферальная программа')}
                        </h1>
                        <p className="text-indigo-100/80 text-lg max-w-xl font-medium">
                            {t('subtitle', 'Превратите ваших довольных клиентов в амбассадоров вашего бренда.')}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Button
                            onClick={() => setShowSettingsDialog(true)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-2xl h-14 px-8 font-bold transition-all hover:scale-105"
                        >
                            <Settings className="w-5 h-5 mr-3" />
                            {t('settings', 'Настроить правила')}
                        </Button>
                    </div>
                </div>

                {/* Floating Background Icons */}
                <Share2 className="absolute -bottom-4 -left-4 w-32 h-32 text-white/5 -rotate-12 pointer-events-none" />
                <Award className="absolute top-10 right-10 w-48 h-48 text-white/5 rotate-12 pointer-events-none" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsCards.map((stat, idx) => (
                    <Card key={idx} className={`overflow-hidden border-none shadow-xl ${stat.shadow} group transition-all hover:-translate-y-1`}>
                        <CardContent className="p-8 relative">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.title}</p>
                                    <p className="text-4xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                                </div>
                                <div className={`w-16 h-16 rounded-2xl ${stat.lightColor} flex items-center justify-center transition-transform group-hover:rotate-12`}>
                                    <stat.icon className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Table Content */}
            <Card className="border-none shadow-2xl shadow-gray-200/50 rounded-[2rem] overflow-hidden bg-white">
                <div className="p-8 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-900">{t('table.title', 'История рекомендаций')}</h3>
                            <p className="text-sm text-gray-500 font-medium">{t('table.description', 'Список всех приглашенных клиентов и их статусы')}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative min-w-[300px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder={t('table.search_placeholder', 'Поиск по имени или email...')}
                                    className="pl-12 h-14 bg-white border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-500/20 transition-all text-base"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl overflow-x-auto no-scrollbar">
                                {['all', 'pending', 'completed', 'cancelled'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${statusFilter === status
                                                ? 'bg-white text-purple-700 shadow-md'
                                                : 'text-gray-500 hover:text-gray-900'
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
                            <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                <TableHead className="py-6 px-8 text-xs font-black uppercase text-gray-400 tracking-widest">{t('table.columns.referrer', 'Кто пригласил')}</TableHead>
                                <TableHead className="py-6 px-8 text-center text-gray-400">
                                    <ArrowRight className="w-5 h-5 mx-auto" />
                                </TableHead>
                                <TableHead className="py-6 px-8 text-xs font-black uppercase text-gray-400 tracking-widest">{t('table.columns.referred_friend', 'Приглашенный друг')}</TableHead>
                                <TableHead className="py-6 px-8 text-xs font-black uppercase text-gray-400 tracking-widest">{t('table.columns.status', 'Статус')}</TableHead>
                                <TableHead className="py-6 px-8 text-xs font-black uppercase text-gray-400 tracking-widest text-right">{t('table.columns.points_awarded', 'Бонусы')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredReferrals.map((r) => (
                                <TableRow key={r.id} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors group">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-700 font-black text-lg">
                                                {r.referrer_name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{r.referrer_name}</div>
                                                <div className="text-xs text-gray-500 font-medium">{r.referrer_email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-center">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-purple-700 font-black text-lg">
                                                {r.referred_name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{r.referred_name}</div>
                                                <div className="text-xs text-gray-500 font-medium">{r.referred_email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 px-8">
                                        {r.status === 'completed' ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 px-4 py-1.5 rounded-full border-none font-bold flex items-center gap-2 w-fit">
                                                <CheckCircle2 className="w-4 h-4" />
                                                {t('table.statuses.completed')}
                                            </Badge>
                                        ) : r.status === 'pending' ? (
                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-4 py-1.5 rounded-full border-none font-bold flex items-center gap-2 w-fit">
                                                <Clock className="w-4 h-4" />
                                                {t('table.statuses.pending')}
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 px-4 py-1.5 rounded-full border-none font-bold flex items-center gap-2 w-fit">
                                                <XCircle className="w-4 h-4" />
                                                {t('table.statuses.cancelled')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <div className={`text-lg font-black ${r.points_awarded > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                                            {r.points_awarded > 0 ? `+${r.points_awarded}` : '—'}
                                        </div>
                                        {r.points_awarded > 0 && <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">баллов</div>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {!loading && filteredReferrals.length === 0 && (
                        <div className="py-32 text-center space-y-4">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Users className="w-12 h-12 text-gray-200" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900">Никого не нашли</h4>
                            <p className="text-gray-500 max-w-xs mx-auto font-medium">
                                По вашему запросу рекомендации отсутствуют. Попробуйте изменить параметры поиска.
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-8">
                    <DialogHeader className="space-y-4 pb-4">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                            <Settings className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="text-center">
                            <DialogTitle className="text-2xl font-black text-gray-900">{t('dialogs.settings.title', 'Правила программы')}</DialogTitle>
                            <DialogDescription className="text-base font-medium text-gray-500 mt-2">
                                Укажите, сколько баллов получит каждый участник
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">{t('dialogs.settings.referrer_bonus', 'Бонус пригласившему')}</Label>
                            <div className="relative group">
                                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                                <Input
                                    type="number"
                                    className="pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-bold text-lg"
                                    value={settings.referrer_bonus}
                                    onChange={(e) => setSettings({ ...settings, referrer_bonus: parseInt(e.target.value) })}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold px-1">{t('dialogs.settings.referrer_bonus_help', 'Начисляется после первого посещения друга')}</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">{t('dialogs.settings.referred_bonus', 'Бонус другу')}</Label>
                            <div className="relative group">
                                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                                <Input
                                    type="number"
                                    className="pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-lg"
                                    value={settings.referred_bonus}
                                    onChange={(e) => setSettings({ ...settings, referred_bonus: parseInt(e.target.value) })}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold px-1">{t('dialogs.settings.referred_bonus_help', 'Начисляется сразу после регистрации по ссылке')}</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">{t('dialogs.settings.min_purchase_amount', 'Мин. сумма покупки друга')}</Label>
                            <div className="relative group">
                                <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                                <Input
                                    type="number"
                                    className="pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-lg"
                                    value={settings.min_purchase_amount}
                                    onChange={(e) => setSettings({ ...settings, min_purchase_amount: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <Button
                                variant="outline"
                                onClick={() => setShowSettingsDialog(false)}
                                className="flex-1 h-14 rounded-2xl font-bold text-gray-600 border-gray-200 hover:bg-gray-50 transition-all"
                            >
                                {t('buttons.cancel', 'Отмена')}
                            </Button>
                            <Button
                                onClick={handleSaveSettings}
                                className="flex-1 h-14 rounded-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-200 hover:shadow-xl transition-all hover:scale-[1.02]"
                            >
                                {t('buttons.save_changes', 'Сохранить')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
