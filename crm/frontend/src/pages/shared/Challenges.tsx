// /frontend/src/pages/shared/Challenges.tsx
import { useState, useEffect, useCallback } from 'react';
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
import { buildApiUrl } from '../../api/client';
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

interface UniversalChallengesProps {
    embedded?: boolean;
    showEmbeddedHeader?: boolean;
    onEmbeddedPrimaryActionReady?: (handler: (() => void) | null) => void;
}

export default function UniversalChallenges({
    embedded = false,
    showEmbeddedHeader = true,
    onEmbeddedPrimaryActionReady
}: UniversalChallengesProps) {
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

    const normalizeChallengeType = (type: Challenge['type'] | string): Challenge['type'] => {
        if (type === 'spend') {
            return 'spending';
        }
        if (type === 'service_type') {
            return 'services';
        }
        return type as Challenge['type'];
    };

    const parseNonNegativeInteger = (value: string, fallbackValue: number): number => {
        const parsedValue = Number(value);
        if (!Number.isFinite(parsedValue)) {
            return fallbackValue;
        }
        if (parsedValue < 0) {
            return 0;
        }
        return Math.round(parsedValue);
    };

    useEffect(() => {
        loadChallenges();
        loadStats();
    }, []);

    const handleOpenCreateDialog = useCallback(() => {
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
    }, []);

    useEffect(() => {
        if (typeof onEmbeddedPrimaryActionReady !== 'function') {
            return;
        }

        if (embedded) {
            onEmbeddedPrimaryActionReady(() => handleOpenCreateDialog());
            return () => onEmbeddedPrimaryActionReady(null);
        }

        onEmbeddedPrimaryActionReady(null);
    }, [embedded, onEmbeddedPrimaryActionReady, handleOpenCreateDialog]);

    const loadChallenges = async () => {
        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('/api/admin/challenges'), { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.challenges)) {
                    const normalizedChallenges = data.challenges.map((challenge: Challenge) => ({
                        ...challenge,
                        type: normalizeChallengeType(challenge.type),
                    }));
                    setChallenges(normalizedChallenges);
                }
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
            const response = await fetch(buildApiUrl('/api/admin/challenges/stats'), { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) setStats(data.stats);
            }
        } catch (error) { }
    };

    const handleSave = async () => {
        try {
            if (formData.title.trim().length === 0) {
                toast.error(t('common:error_saving', 'Ошибка сохранения'));
                return;
            }

            const normalizedType = normalizeChallengeType(formData.type);
            if (normalizedType === 'services') {
                toast.error(t('common:error_saving', 'Ошибка сохранения'));
                return;
            }

            const url = editingChallenge ? `/api/admin/challenges/${editingChallenge.id}` : '/api/admin/challenges';
            const method = editingChallenge ? 'PUT' : 'POST';
            const payload = {
                ...formData,
                type: normalizedType,
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
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
            const response = await fetch(buildApiUrl(`/api/admin/challenges/${id}`), {
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
            const response = await fetch(buildApiUrl(`/api/admin/challenges/${id}/check-progress`), {
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
            title: t('stats.active_challenges', 'Активные задания'),
            value: stats.active_challenges,
            icon: Flame,
            color: embedded ? 'text-blue-600' : 'text-orange-600',
            bg: embedded ? 'bg-blue-100' : 'bg-orange-50'
        },
        {
            title: t('stats.total_participants', 'Участников всего'),
            value: stats.total_participants,
            icon: Users,
            color: embedded ? 'text-green-600' : 'text-indigo-600',
            bg: embedded ? 'bg-green-100' : 'bg-indigo-50'
        },
        {
            title: t('stats.completed_today', 'Выполнено сегодня'),
            value: stats.completed_today,
            icon: Trophy,
            color: embedded ? 'text-blue-600' : 'text-amber-500',
            bg: embedded ? 'bg-blue-100' : 'bg-amber-50'
        }
    ];

    const containerClassName = embedded
        ? ''
        : 'crm-calendar-theme crm-calendar-page crm-calendar-challenges min-h-screen bg-gray-50/30 p-4 sm:p-8 animate-in fade-in duration-500';
    const showHeader = !embedded || showEmbeddedHeader;

    return (
        <div className={containerClassName}>
            <div className={embedded ? 'space-y-6' : 'max-w-6xl mx-auto space-y-8'}>
                {/* Back Navigation */}
                {!embedded && (
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors group"
                    >
                        <div className="p-1.5 rounded-lg group-hover:bg-white border border-transparent group-hover:border-gray-100 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs tracking-tight">{t('common:back', 'Назад')}</span>
                    </button>
                )}

                {/* Header Section */}
                {showHeader && (
                    <div className={embedded ? 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' : 'crm-calendar-toolbar flex flex-col md:flex-row md:items-start justify-between gap-6'}>
                        <div className={embedded ? 'min-w-0 lg:flex-1' : 'space-y-3'}>
                            {!embedded && (
                                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-[0.2em]">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Gamification Engine
                                </div>
                            )}
                            <h1 className={embedded ? 'text-3xl text-gray-900 mb-2 flex items-center gap-3' : 'text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-none'}>
                                {embedded && (
                                    <Trophy className="w-8 h-8 text-blue-600" />
                                )}
                                {t('title', 'Челленджи')}
                                {!embedded && <span className="text-blue-600">.</span>}
                            </h1>
                            <p className={embedded ? 'text-gray-600' : 'text-gray-500 font-medium max-w-lg text-sm leading-relaxed'}>
                                {t('subtitle', 'Повышайте лояльность клиентов с помощью игровых механик и автоматических наград.')}
                            </p>
                        </div>

                        <Button
                            onClick={handleOpenCreateDialog}
                            className={embedded
                                ? 'w-full sm:w-auto lg:self-start bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-semibold shadow-sm transition-all flex items-center gap-2 shrink-0'
                                : 'bg-gray-900 hover:bg-black text-white rounded-xl h-12 px-6 font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 shrink-0'}
                        >
                            <Plus className={embedded ? 'w-4 h-4' : 'w-5 h-5'} />
                            {t('buttons.add_challenge', 'Создать задание')}
                        </Button>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {statsCards.map((stat, idx) => (
                        <Card
                            key={idx}
                            className={embedded
                                ? 'crm-calendar-panel bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'
                                : 'crm-calendar-panel border-none shadow-sm bg-white rounded-2xl transition-all hover:shadow-md duration-300 overflow-hidden'}
                        >
                            <CardContent className={embedded ? 'p-6 flex items-center justify-between gap-4' : 'p-5 flex items-center gap-5'}>
                                <div className={`shrink-0 ${embedded ? 'w-12 h-12 rounded-lg' : 'w-14 h-14 rounded-xl'} ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                    <stat.icon className={embedded ? 'w-6 h-6' : 'w-7 h-7'} />
                                </div>
                                <div className="min-w-0">
                                    <p className={embedded ? 'text-sm text-gray-500 font-medium mb-2' : 'text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2'}>{stat.title}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <p className={embedded ? 'text-2xl font-bold text-gray-900 leading-none' : 'text-xl font-bold text-gray-900 leading-none tracking-tight'}>{stat.value}</p>
                                        {!embedded && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* List of Challenges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {challenges.map((challenge) => (
                        <div
                            key={challenge.id}
                            className={embedded
                                ? 'crm-calendar-panel bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden flex flex-col gap-5'
                                : 'crm-calendar-panel group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 p-8 relative overflow-hidden flex flex-col gap-6'}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={`${challenge.is_active || challenge.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'} ${embedded ? 'px-2.5 py-1 text-xs font-medium' : 'px-2 py-1 font-bold text-[9px] uppercase tracking-wider'} border shadow-none`}>
                                        {(challenge.is_active || challenge.status === 'active') ? t('status.active', 'Активно') : t('status.inactive', 'Пауза')}
                                    </Badge>
                                    <Badge className={`bg-amber-50 text-amber-600 border-amber-100 ${embedded ? 'px-2.5 py-1 text-xs font-medium' : 'px-2 py-1 font-bold text-[9px] uppercase tracking-wider'} border shadow-none flex items-center gap-1.5`}>
                                        <Star className="w-2.5 h-2.5 fill-amber-500" />
                                        {challenge.reward_points} {t('common:points_sc', 'баллов')}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingChallenge(challenge);
                                            setFormData({
                                                title: challenge.title,
                                                description: challenge.description,
                                                type: normalizeChallengeType(challenge.type),
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
                                <h3 className={embedded ? 'text-lg font-semibold text-gray-900 leading-tight' : 'text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight tracking-tight'}>{t(challenge.title)}</h3>
                                <p className={embedded ? 'text-sm text-gray-500 leading-6 max-w-2xl' : 'text-gray-500 font-medium leading-relaxed max-w-md text-sm'}>{t(challenge.description)}</p>
                            </div>

                            <div className={embedded ? 'bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3' : 'bg-gray-50/80 rounded-2xl p-6 border border-gray-100 space-y-4'}>
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className={embedded ? 'text-sm text-gray-500' : 'text-[9px] font-bold uppercase tracking-widest text-gray-400'}>{t('card.progress', 'Прогресс')}</p>
                                        <p className="text-lg font-bold text-gray-900 leading-none">{challenge.completion_rate}%</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className={embedded ? 'text-sm text-gray-500' : 'text-[9px] font-bold uppercase tracking-widest text-gray-400'}>{t('card.participants', 'Участники')}</p>
                                        <p className="text-base font-bold text-gray-900 leading-none">{challenge.participants_count ?? challenge.participants ?? 0}</p>
                                    </div>
                                </div>
                                <Progress value={challenge.completion_rate} className="h-2.5 bg-gray-200" />
                            </div>

                            <div className={embedded ? 'flex flex-col gap-3 pt-4 border-t border-gray-100 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between' : 'flex items-center justify-between pt-4 border-t border-gray-50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400'}>
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
                        <div className={embedded ? 'crm-calendar-panel col-span-full text-center bg-white rounded-xl border border-gray-200 shadow-sm p-10 sm:p-14' : 'crm-calendar-panel col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100'}>
                            <Zap className={embedded ? 'w-10 h-10 text-gray-300 mx-auto mb-4' : 'w-12 h-12 text-gray-200 mx-auto mb-4 animate-pulse'} />
                            <h3 className={embedded ? 'text-2xl font-semibold text-gray-900 mb-2' : 'text-xl font-black text-gray-900 mb-1'}>{t('empty.title', 'Челленджи не настроены')}</h3>
                            <p className={embedded ? 'text-gray-500 max-w-lg mx-auto mb-6 px-4 text-base leading-7' : 'text-gray-400 max-w-sm mx-auto font-medium mb-8 px-8 text-sm'}>
                                {t('empty.subtitle', 'Создайте первое игровое задание, чтобы стимулировать клиентов записываться чаще.')}
                            </p>
                            <Button
                                onClick={() => setShowAddDialog(true)}
                                className={embedded ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold px-6 h-11 shadow-sm' : 'bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black px-8 h-12'}
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
                                        <option value="spending">{t('types.spend', 'Общая сумма трат')}</option>
                                        <option value="referrals">{t('types.referrals', 'Рекомендации')}</option>
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
                                        onChange={(e) => setFormData({ ...formData, target_value: parseNonNegativeInteger(e.target.value, 0) })}
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
                                        onChange={(e) => setFormData({ ...formData, reward_points: parseNonNegativeInteger(e.target.value, 0) })}
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
