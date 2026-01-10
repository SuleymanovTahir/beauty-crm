// /frontend/src/pages/admin/Challenges.tsx
import { useState, useEffect } from 'react';
import {
    Plus, Target, Calendar, Trophy, Users, Edit, Trash2,
    Star, Zap, Clock, ChevronRight, Filter
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'visits' | 'spending' | 'referrals' | 'services';
    target_value: number;
    reward_points: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'upcoming' | 'completed';
    participants: number;
    completions: number;
}

export default function Challenges() {
    const { t } = useTranslation(['adminPanel/Challenges', 'common', 'services']);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'visits' as Challenge['type'],
        target_value: 0,
        reward_points: 0,
        start_date: '',
        end_date: '',
    });

    useEffect(() => {
        loadChallenges();
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
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChallenge = async () => {
        try {
            const endpoint = editingChallenge ? `/api/admin/challenges/${editingChallenge.id}` : '/api/admin/challenges';
            const response = await fetch(endpoint, {
                method: editingChallenge ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success(editingChallenge ? 'Челлендж обновлен' : 'Челлендж создан');
                setShowCreateDialog(false);
                setEditingChallenge(null);
                setFormData({ title: '', description: '', type: 'visits', target_value: 0, reward_points: 0, start_date: '', end_date: '' });
                loadChallenges();
            }
        } catch (error) {
            toast.error('Произошла ошибка');
        }
    };

    const handleDeleteChallenge = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот челлендж?')) return;
        try {
            const response = await fetch(`/api/admin/challenges/${id}`, { method: 'DELETE', credentials: 'include' });
            if (response.ok) {
                toast.success('Удалено');
                loadChallenges();
            }
        } catch (error) { }
    };

    const handleCheckProgress = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/challenges/${id}/check-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({}),
            });
            if (response.ok) {
                const data = await response.json();
                toast.success(`Проверено: обновлено ${data.updated_count || 0} участников`);
                loadChallenges();
            }
        } catch (error) { }
    };

    const stats = [
        {
            title: t('stats.active_challenges', 'Активные'),
            value: challenges.filter(c => c.status === 'active').length,
            icon: Target,
            color: 'from-pink-500 to-rose-600',
            lightColor: 'bg-pink-50 text-pink-600',
            shadow: 'shadow-pink-100'
        },
        {
            title: t('stats.total_participants', 'Участники'),
            value: challenges.reduce((sum, c) => sum + c.participants, 0),
            icon: Users,
            color: 'from-blue-500 to-indigo-600',
            lightColor: 'bg-blue-50 text-blue-600',
            shadow: 'shadow-blue-100'
        },
        {
            title: t('stats.completions', 'Завершено'),
            value: challenges.reduce((sum, c) => sum + c.completions, 0),
            icon: Trophy,
            color: 'from-yellow-500 to-orange-600',
            lightColor: 'bg-yellow-50 text-yellow-600',
            shadow: 'shadow-yellow-100'
        },
    ];

    const typeLabels: Record<Challenge['type'], string> = {
        visits: 'Визитов',
        spending: 'Потрачено',
        referrals: 'Рекомендаций',
        services: 'Услуг',
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-900 via-pink-900 to-indigo-900 p-8 sm:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest">
                            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            {t('services:gamification', 'Геймификация лояльности')}
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                            {t('title', 'Челленджи')}
                        </h1>
                        <p className="text-pink-100/80 text-lg max-w-xl font-medium">
                            {t('subtitle', 'Создавайте игровые механики, которые мотивируют клиентов возвращаться к вам чаще.')}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="bg-white text-gray-900 hover:bg-gray-50 rounded-2xl h-14 px-8 font-black shadow-xl transition-all hover:scale-105"
                        >
                            <Plus className="w-5 h-5 mr-3" />
                            {t('create_challenge', 'Создать челлендж')}
                        </Button>
                    </div>
                </div>

                {/* Floating Background Icons */}
                <Trophy className="absolute -bottom-6 -right-6 w-40 h-40 text-white/5 -rotate-12 pointer-events-none" />
                <Star className="absolute top-10 left-10 w-32 h-32 text-white/5 rotate-12 pointer-events-none" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
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

            {/* Challenges List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-gray-900">Управление заданиями</h2>
                        <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 border-none px-3 font-bold">{challenges.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" className="rounded-xl font-bold text-gray-500"><Filter className="w-4 h-4 mr-2" /> Фильтр</Button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка заданий...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {challenges.map((challenge) => {
                            const completionRate = challenge.participants > 0 ? (challenge.completions / challenge.participants) * 100 : 0;
                            return (
                                <Card key={challenge.id} className="border-none shadow-2xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-1">
                                    <div className={`h-3 w-full bg-gradient-to-r ${challenge.status === 'active' ? 'from-pink-500 to-rose-600' :
                                            challenge.status === 'upcoming' ? 'from-blue-500 to-indigo-600' : 'from-gray-300 to-gray-400'
                                        }`} />
                                    <CardHeader className="p-8">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge className={`px-4 py-1.5 rounded-full border-none font-bold uppercase tracking-widest text-[10px] ${challenge.status === 'active' ? 'bg-pink-100 text-pink-700' :
                                                            challenge.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {t(`statuses.${challenge.status}`, challenge.status.toUpperCase())}
                                                    </Badge>
                                                    <Badge variant="outline" className="border-gray-100 text-gray-400 font-bold px-3 py-1 text-[10px] uppercase">
                                                        {typeLabels[challenge.type]}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <CardTitle className="text-2xl font-black text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                                                        {challenge.title}
                                                    </CardTitle>
                                                    <CardDescription className="text-gray-500 font-medium text-base line-clamp-2 leading-relaxed">
                                                        {challenge.description}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-50 h-10 w-10" onClick={() => { setEditingChallenge(challenge); setFormData(challenge); setShowCreateDialog(true); }}>
                                                    <Edit className="w-4 h-4 text-gray-400" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-rose-50 h-10 w-10 group/del" onClick={() => handleDeleteChallenge(challenge.id)}>
                                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover/del:text-rose-600 transition-colors" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-8 pb-8 space-y-8">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1 p-4 bg-gray-50 rounded-2xl">
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Цель задания</p>
                                                <p className="text-xl font-bold text-gray-900">{challenge.target_value} {typeLabels[challenge.type].toLowerCase()}</p>
                                            </div>
                                            <div className="space-y-1 p-4 bg-purple-50 rounded-2xl relative overflow-hidden">
                                                <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Награда</p>
                                                <p className="text-xl font-bold text-purple-700">{challenge.reward_points} <span className="text-sm">баллов</span></p>
                                                <Star className="absolute -bottom-2 -right-2 w-12 h-12 text-purple-100 -rotate-12" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Прогресс выполнения</span>
                                                <span className="font-black text-pink-600 bg-pink-50 px-3 py-1 rounded-lg">
                                                    {challenge.completions}/{challenge.participants} <span className="text-[10px] opacity-70">готово</span>
                                                </span>
                                            </div>
                                            <div className="h-3 relative rounded-full overflow-hidden bg-gray-100">
                                                <div className="h-full absolute left-0 top-0 transition-all duration-1000 bg-gradient-to-r from-pink-500 to-rose-600" style={{ width: `${Math.min(100, completionRate)}%` }} />
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-6 text-sm font-bold text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{new Date(challenge.start_date).toLocaleDateString()}</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 opacity-30" />
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{new Date(challenge.end_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            {challenge.status === 'active' && (
                                                <Button
                                                    onClick={() => handleCheckProgress(challenge.id)}
                                                    className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-6 h-12 rounded-xl font-black transition-all hover:scale-105 shadow-lg shadow-gray-200"
                                                >
                                                    <Trophy className="w-4 h-4 mr-2" />
                                                    Проверить прогресс
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-xl rounded-[2.5rem] p-8">
                    <DialogHeader className="space-y-4 pb-4">
                        <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto">
                            <Zap className="w-8 h-8 text-pink-600 fill-pink-600" />
                        </div>
                        <div className="text-center">
                            <DialogTitle className="text-2xl font-black text-gray-900">{editingChallenge ? 'Редактировать челлендж' : 'Новое задание'}</DialogTitle>
                            <DialogDescription className="text-base font-medium text-gray-500 mt-2">
                                Укажите условия для получения бонусных баллов
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">Название задания</Label>
                            <Input
                                placeholder="Напр. Супер-гость сентября"
                                className="h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 transition-all font-bold"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">Описание (условия для клиента)</Label>
                            <Textarea
                                placeholder="Клиенты увидят это в приложении..."
                                className="bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 transition-all font-medium min-h-[100px]"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">Тип события</Label>
                                <select
                                    className="w-full h-14 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 transition-all font-bold"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Challenge['type'] })}
                                >
                                    <option value="visits">Визиты</option>
                                    <option value="spending">Траты</option>
                                    <option value="referrals">Рекомендации</option>
                                    <option value="services">Услуги</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">Целевое значение</Label>
                                <Input
                                    type="number"
                                    className="h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 transition-all font-bold"
                                    value={formData.target_value}
                                    onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">Награда (баллы)</Label>
                            <Input
                                type="number"
                                className="h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-bold text-purple-700"
                                value={formData.reward_points}
                                onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">Дата начала</Label>
                                <Input type="date" className="h-14 bg-gray-50 border-none rounded-2xl" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-gray-600 pl-1">Дата окончания</Label>
                                <Input type="date" className="h-14 bg-gray-50 border-none rounded-2xl" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1 h-14 rounded-2xl font-bold border-gray-200">Отмена</Button>
                            <Button onClick={handleCreateChallenge} className="flex-1 h-14 rounded-2xl font-black bg-gradient-to-r from-pink-600 to-rose-700 shadow-lg shadow-pink-200 hover:scale-[1.02] transition-all">
                                {editingChallenge ? 'Обновить задание' : 'Запустить челлендж'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
