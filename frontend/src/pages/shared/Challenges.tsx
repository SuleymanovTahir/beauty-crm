// /frontend/src/pages/shared/Challenges.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, TrendingUp, Edit, Star,
    Medal, Zap, Calendar, Users,
    Trophy, Sparkles, Flame, ChevronDown,
    ArrowLeft, Trash2, Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { useSalonSettings } from '../../hooks/useSalonSettings';
import { toast } from 'sonner';
import '../../styles/crm-pages.css';

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'visits' | 'spend' | 'service_type' | 'spending' | 'referrals' | 'services';
    target_value: number;
    reward_points: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    participants_count?: number;
    participants?: number; // compat
    completion_rate?: number;
    completions?: number; // compat
    status?: 'active' | 'upcoming' | 'completed'; // compat
}

export default function UniversalChallenges() {
    const { t } = useTranslation(['admin/challenges', 'adminpanel/challenges', 'common', 'services', 'dynamic']);
    const { currency } = useSalonSettings();
    const navigate = useNavigate();

    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(false);
    const [checkingProgress, setCheckingProgress] = useState<string | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
    const [stats, setStats] = useState({
        active_challenges: 0,
        total_participants: 0,
        completed_today: 0
    });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'visits' as Challenge['type'],
        target_value: 5,
        reward_points: 500,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    useEffect(() => {
        loadChallenges();
        loadStats();
    }, []);

    const loadChallenges = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/challenges', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.challenges) setChallenges(data.challenges);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(t('common:error_loading', 'Ошибка загрузки'));
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch('/api/admin/challenges/stats', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) setStats(data.stats);
            }
        } catch (error) { }
    };

    const handleSave = async () => {
        try {
            const url = editingChallenge ? `/api/admin/challenges/${editingChallenge.id}` : '/api/admin/challenges';
            const method = editingChallenge ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success(editingChallenge ? t('toasts.updated', 'Задание обновлено') : t('toasts.created', 'Задание создано'));
                setShowAddDialog(false);
                setEditingChallenge(null);
                loadChallenges();
                loadStats();
            } else {
                const error = await response.json();
                toast.error(error.error || t('common:error_saving', 'Ошибка сохранения'));
            }
        } catch (error) {
            toast.error(t('common:error_saving', 'Ошибка сохранения'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('dialogs.delete.confirm', 'Вы уверены, что хотите удалить этот челлендж?'))) return;

        try {
            const response = await fetch(`/api/admin/challenges/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                toast.success(t('toasts.deleted', 'Челлендж удален'));
                loadChallenges();
                loadStats();
            } else {
                toast.error(t('toasts.failed_delete', 'Ошибка при удалении'));
            }
        } catch (error) {
            toast.error(t('toasts.failed_delete', 'Ошибка при удалении'));
        }
    };

    const handleCheckProgress = async (id: string) => {
        try {
            setCheckingProgress(id);
            const response = await fetch(`/api/admin/challenges/${id}/check-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({}),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    toast.success(t('toasts.progress_checked', {
                        defaultValue: `Обновлено ${data.updated_count} клиентов`,
                        count: data.updated_count
                    }));
                    loadChallenges();
                }
            }
        } catch (error) {
            toast.error(t('toasts.failed_check_progress', 'Ошибка проверки прогресса'));
        } finally {
            setCheckingProgress(null);
        }
    };

    const statsCards = [
        {
            title: t('stats.active_challenges', 'АКТИВНЫЕ ЗАДАНИЯ'),
            value: stats.active_challenges,
            icon: Flame,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
        {
            title: t('stats.total_participants', 'УЧАСТНИКОВ ВСЕГО'),
            value: stats.total_participants,
            icon: Users,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: t('stats.completed_today', 'ВЫПОЛНЕНО СЕГОДНЯ'),
            value: stats.completed_today,
            icon: Trophy,
            color: 'text-amber-500',
            bg: 'bg-amber-50'
        }
    ];

    return (
        <div className="crm-calendar-theme crm-calendar-page crm-calendar-challenges min-h-screen bg-gray-50/30 p-4 sm:p-8 animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Back Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors group"
                >
                    <div className="p-1.5 rounded-lg group-hover:bg-white border border-transparent group-hover:border-gray-100 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs tracking-tight">{t('common:back', 'Назад')}</span>
                </button>

                {/* Header Section */}
                <div className="crm-calendar-toolbar flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-[0.2em]">
                            <Sparkles className="w-2.5 h-2.5" />
                            Gamification Engine
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-none">
                            {t('title', 'Челленджи')}
                            <span className="text-blue-600">.</span>
                        </h1>
                        <p className="text-gray-500 font-medium max-w-lg text-sm leading-relaxed">
                            {t('subtitle', 'Повышайте лояльность клиентов с помощью игровых механик и автоматических наград.')}
                        </p>
                    </div>

                    <Button
                        onClick={() => {
                            setEditingChallenge(null);
                            setFormData({
                                title: '',
                                description: '',
                                type: 'visits',
                                target_value: 5,
                                reward_points: 500,
                                start_date: new Date().toISOString().split('T')[0],
                                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                            });
                            setShowAddDialog(true);
                        }}
                        className="bg-gray-900 hover:bg-black text-white rounded-xl h-12 px-6 font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 shrink-0"
                    >
                        <Plus className="w-5 h-5" />
                        {t('buttons.add_challenge', 'Создать задание')}
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsCards.map((stat, idx) => (
                        <Card key={idx} className="crm-calendar-panel border-none shadow-sm bg-white rounded-2xl transition-all hover:shadow-md duration-300 overflow-hidden">
                            <CardContent className="p-5 flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                                    <stat.icon className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">{stat.title}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <p className="text-xl font-bold text-gray-900 leading-none tracking-tight">{stat.value}</p>
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* List of Challenges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {challenges.map((challenge) => (
                        <div key={challenge.id} className="crm-calendar-panel group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 p-8 relative overflow-hidden flex flex-col gap-6">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={`${challenge.is_active || challenge.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'} px-2 py-1 font-bold text-[9px] uppercase tracking-wider border shadow-none`}>
                                        {(challenge.is_active || challenge.status === 'active') ? t('status.active', 'АКТИВЕН') : t('status.inactive', 'ПАУЗА')}
                                    </Badge>
                                    <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-2 py-1 font-bold text-[9px] uppercase tracking-wider border shadow-none flex items-center gap-1.5">
                                        <Star className="w-2.5 h-2.5 fill-amber-500" />
                                        {challenge.reward_points} {t('common:points_sc', 'БАЛЛОВ')}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingChallenge(challenge);
                                            setFormData({
                                                title: challenge.title,
                                                description: challenge.description,
                                                type: challenge.type,
                                                target_value: challenge.target_value,
                                                reward_points: challenge.reward_points,
                                                start_date: challenge.start_date.split('T')[0],
                                                end_date: challenge.end_date.split('T')[0]
                                            });
                                            setShowAddDialog(true);
                                        }}
                                        className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(challenge.id)}
                                        className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight tracking-tight">{t(challenge.title)}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed max-w-md text-sm">{t(challenge.description)}</p>
                            </div>

                            <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{t('card.progress', 'ПРОГРЕСС ВЫПОЛНЕНИЯ')}</p>
                                        <p className="text-lg font-bold text-gray-900 leading-none">{challenge.completion_rate}%</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{t('card.participants', 'УЧАСТНИКИ')}</p>
                                        <p className="text-base font-bold text-gray-900 leading-none">{challenge.participants_count || challenge.participants || 0}</p>
                                    </div>
                                </div>
                                <Progress value={challenge.completion_rate} className="h-2.5 bg-gray-200" />
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(challenge.start_date).toLocaleDateString('ru-RU')} — {new Date(challenge.end_date).toLocaleDateString('ru-RU')}
                                </div>
                                <button
                                    onClick={() => handleCheckProgress(challenge.id)}
                                    disabled={checkingProgress === challenge.id}
                                    className="flex items-center gap-1.5 text-gray-900 hover:text-blue-600 transition-colors disabled:opacity-50"
                                >
                                    {checkingProgress === challenge.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trophy className="w-3.5 h-3.5" />
                                    )}
                                    {t('card.check_progress', 'Обновить')}
                                </button>
                            </div>
                        </div>
                    ))}

                    {challenges.length === 0 && !loading && (
                        <div className="crm-calendar-panel col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                            <Zap className="w-12 h-12 text-gray-200 mx-auto mb-4 animate-pulse" />
                            <h3 className="text-xl font-black text-gray-900 mb-1">{t('empty.title', 'Челленджи не настроены')}</h3>
                            <p className="text-gray-400 max-w-sm mx-auto font-medium mb-8 px-8 text-sm">
                                {t('empty.subtitle', 'Создайте первое игровое задание, чтобы стимулировать клиентов записываться чаще.')}
                            </p>
                            <Button
                                onClick={() => setShowAddDialog(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black px-8 h-12"
                            >
                                {t('buttons.create_challenge', 'Запустить челлендж')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modern Add/Edit Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogHeader className="bg-gray-900 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                                <Medal className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-white tracking-tight">
                                    {editingChallenge ? t('dialogs.edit_title', 'Правка челленджа') : t('dialogs.add_title', 'Новый челлендж')}
                                </DialogTitle>
                                <p className="text-blue-300 text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">Loyalty Mechanics Builder</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-8 bg-white max-h-[60vh] overflow-y-auto crm-scrollbar">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('fields.title', 'Название задания')}</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl font-black text-lg px-4 focus:bg-white transition-all"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={t('placeholders.title', 'Например: Золотой статус')}
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('fields.description', 'Публичное описание')}</Label>
                                <Textarea
                                    className="min-h-[100px] bg-gray-50 border-gray-100 rounded-xl font-bold px-4 py-3 focus:bg-white transition-all text-gray-600 text-sm"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('placeholders.description', 'Как клиент увидит это задание?')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('fields.type', 'Методика цели')}</Label>
                                <div className="relative">
                                    <select
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-black appearance-none text-gray-900 focus:bg-white transition-all text-sm"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="visits">{t('types.visits', 'Количество визитов')}</option>
                                        <option value="spend">{t('types.spend', 'Общая сумма трат')}</option>
                                        <option value="referrals">{t('types.referrals', 'Рекомендации')}</option>
                                        <option value="services">{t('types.services', 'Услуги')}</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('fields.target_value', 'План (цель)')}</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        className="h-12 bg-gray-50 border-gray-100 rounded-xl font-black text-lg px-4 focus:bg-white transition-all"
                                        value={formData.target_value}
                                        onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-sm">
                                        {formData.type === 'spend' || formData.type === 'spending' ? currency : (formData.type === 'visits' ? 'X' : '')}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('fields.reward', 'Награда')}</Label>
                                <div className="relative">
                                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 fill-amber-500" />
                                    <Input
                                        type="number"
                                        className="pl-12 h-12 bg-gray-50 border-gray-100 rounded-xl font-black text-lg text-amber-600 focus:bg-white transition-all shadow-inner"
                                        value={formData.reward_points}
                                        onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('fields.dates', 'Временной лимит')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        className="h-12 bg-gray-50 border-gray-100 rounded-xl font-black text-[10px] px-3 focus:bg-white transition-all"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                    <div className="w-3 h-0.5 bg-gray-100 shrink-0" />
                                    <Input
                                        type="date"
                                        className="h-12 bg-gray-50 border-gray-100 rounded-xl font-black text-[10px] px-3 focus:bg-white transition-all"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100">
                        <div className="flex gap-4 w-full">
                            <Button
                                variant="outline"
                                onClick={() => setShowAddDialog(false)}
                                className="flex-1 h-12 rounded-xl font-black text-base border-gray-200 bg-white"
                            >
                                {t('common:cancel', 'Отменить')}
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="flex-[1.5] h-12 rounded-xl font-black text-base bg-gray-900 hover:bg-black text-white shadow-xl transition-all hover:scale-105"
                            >
                                {editingChallenge ? t('common:save', 'Сохранить изменения') : t('buttons.create_challenge', 'Запустить челлендж')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
