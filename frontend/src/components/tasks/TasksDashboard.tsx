
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { format, isToday, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    Calendar,
    Zap,
    Pin,
    Flame,
    Filter,
    Banknote
} from 'lucide-react';

interface Task {
    id: number;
    title: string;
    description?: string;
    stage_id: number;
    status: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    assignee_id?: number;
    assignee_name?: string;
    created_by?: number;
}

interface Stage {
    id: number;
    name: string;
    key?: string;
    color: string;
}

interface TasksDashboardProps {
    tasks: Task[];
    stages: Stage[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const PRIORITY_COLORS = {
    high: '#ef4444',
    medium: '#eab308',
    low: '#3b82f6'
};

export function TasksDashboard({ tasks, stages }: TasksDashboardProps) {
    const { t } = useTranslation(['admin/tasks', 'common']);

    const stats = useMemo(() => {
        const today = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'done');
        const overdue = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done');
        const execution = tasks.filter(t => t.status !== 'done' && t.status !== 'todo'); // In progress basically

        // Group by Assignee for "Control" (Who has tasks?)
        const controlData = tasks.reduce((acc, task) => {
            const name = task.assignee_name || 'Unassigned';
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const controlChartData = Object.entries(controlData).map(([name, value]) => ({ name, value }));

        // Group by Status for "Overdue" (or just breakdown of overdue by assignee)
        // The screenshot shows "Overdue tasks" pie chart with names.
        const overdueByPerson = overdue.reduce((acc, task) => {
            const name = task.assignee_name || 'Unassigned';
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const overdueChartData = Object.entries(overdueByPerson).map(([name, value]) => ({ name, value }));

        return {
            today,
            overdue,
            execution,
            controlChartData,
            overdueChartData
        };
    }, [tasks]);

    return (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full overflow-y-auto">
            {/* Column 1: Lists */}
            <div className="space-y-6">
                <Card className="h-[400px] flex flex-col border-none shadow-md">
                    <CardHeader className="bg-white rounded-t-lg border-b border-gray-100 pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                            <div className="p-1.5 bg-blue-50 rounded-md">
                                <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            {t('tasks_for_today', 'Дела на сегодня')}
                            <Badge variant="secondary" className="ml-auto bg-gray-100 text-gray-700 hover:bg-gray-200">{stats.today.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 bg-white rounded-b-lg">
                        <ScrollArea className="h-full px-6 pb-4 pt-4">
                            {stats.today.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.today.map(task => (
                                        <div key={task.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-md transition-colors cursor-pointer group">
                                            <span className="text-sm font-medium truncate flex-1 text-gray-700 group-hover:text-blue-600 transition-colors">{task.title}</span>
                                            <span className="text-xs text-gray-400 ml-2 whitespace-nowrap bg-gray-50 px-1.5 py-0.5 rounded">
                                                {format(new Date(task.due_date!), 'HH:mm')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 py-20 text-sm flex flex-col items-center gap-2">
                                    <Calendar className="w-8 h-8 opacity-20" />
                                    {t('no_tasks_today', 'На сегодня задач нет')}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="h-[400px] flex flex-col border-none shadow-md">
                    <CardHeader className="bg-white rounded-t-lg border-b border-gray-100 pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                            <div className="p-1.5 bg-yellow-50 rounded-md">
                                <Zap className="w-4 h-4 text-yellow-600" />
                            </div>
                            {t('tasks_execution', 'Задачи к выполнению')}
                            <Badge variant="secondary" className="ml-auto bg-gray-100 text-gray-700 hover:bg-gray-200">{stats.execution.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 bg-white rounded-b-lg">
                        <ScrollArea className="h-full px-6 pb-4 pt-4">
                            {stats.execution.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.execution.map(task => (
                                        <div key={task.id} className="py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-md transition-colors cursor-pointer group">
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium truncate text-gray-700 group-hover:text-yellow-600 transition-colors">{task.title}</span>
                                            </div>
                                            <div className="flex justify-between mt-1.5">
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                                    {task.assignee_name}
                                                </span>
                                                {task.due_date && (
                                                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                                        {format(new Date(task.due_date), 'd MMM', { locale: ru })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 py-20 text-sm flex flex-col items-center gap-2">
                                    <Zap className="w-8 h-8 opacity-20" />
                                    {t('no_tasks_execution', 'Нет задач в работе')}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Column 2: Charts */}
            <div className="space-y-6">
                <Card className="h-[400px] flex flex-col border-none shadow-md">
                    <CardHeader className="bg-white rounded-t-lg border-b border-gray-100 pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                            <div className="p-1.5 bg-blue-50 rounded-md">
                                <Pin className="w-4 h-4 text-blue-600" />
                            </div>
                            {t('tasks_control', 'Задачи для контроля')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 bg-white rounded-b-lg">
                        {stats.controlChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.controlChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.controlChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-gray-900">
                                        {tasks.length}
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col gap-2">
                                <Pin className="w-8 h-8 opacity-20" />
                                {t('no_data', 'Нет данных')}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="h-[400px] flex flex-col border-none shadow-md">
                    <CardHeader className="bg-white rounded-t-lg border-b border-gray-100 pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                            <div className="p-1.5 bg-red-50 rounded-md">
                                <Flame className="w-4 h-4 text-red-600" />
                            </div>
                            {t('overdue_tasks', 'Просроченные задачи')}
                            <Badge variant="destructive" className="ml-auto">{stats.overdue.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 bg-white rounded-b-lg">
                        {stats.overdueChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.overdueChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#ef4444"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.overdueChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-red-500">
                                        {stats.overdue.length}
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-green-500 text-sm flex-col gap-2">
                                <div className="p-3 bg-green-50 rounded-full mb-1">
                                    <span className="text-2xl">🎉</span>
                                </div>
                                {t('no_overdue', 'Нет просроченных!')}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Column 3: Misc/Funnel Placeholder */}
            <div className="space-y-6">
                <Card className="h-[400px] flex flex-col border-none shadow-md bg-gradient-to-br from-indigo-50/50 to-white">
                    <CardHeader className="rounded-t-lg border-b border-indigo-100/50 pb-3 bg-transparent">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-900">
                            <div className="p-1.5 bg-indigo-100 rounded-md">
                                <Filter className="w-4 h-4 text-indigo-600" />
                            </div>
                            {t('pipeline_overview', 'Воронка задач')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 relative">
                        {stages.length > 0 ? (
                            <div className="flex flex-col gap-3 h-full justify-center px-2">
                                {stages.map((stage, idx) => {
                                    const count = tasks.filter(t => t.stage_id === stage.id).length;
                                    const max = tasks.length || 1;
                                    const width = Math.max(10, (count / max) * 100);

                                    return (
                                        <div key={stage.id} className="relative group">
                                            <div className="flex justify-between text-xs font-medium mb-1.5 text-gray-600">
                                                <span className="group-hover:text-indigo-600 transition-colors">{stage.name}</span>
                                                <span className="bg-white px-1.5 rounded-full text-indigo-600 shadow-sm border border-indigo-100">{count}</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100/50">
                                                <div
                                                    className={`h-full rounded-full ${stage.color || 'bg-blue-500'} transition-all duration-700 ease-out`}
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col gap-2">
                                <Filter className="w-8 h-8 opacity-20" />
                                {t('no_stages', 'Нет стадий')}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Placeholder for Bills/Finance to match screenshot vibe */}
                <Card className="h-[400px] flex flex-col border-none shadow-md">
                    <CardHeader className="bg-white rounded-t-lg border-b border-gray-100 pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                            <div className="p-1.5 bg-emerald-50 rounded-md">
                                <Banknote className="w-4 h-4 text-emerald-600" />
                            </div>
                            {t('bills', 'Счета')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center text-center h-full bg-white rounded-b-lg">
                        <div className="space-y-3 flex flex-col items-center">
                            <div className="p-4 bg-emerald-50 rounded-full">
                                <Banknote className="w-8 h-8 text-emerald-300" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900 tracking-tight">0.00 AED</p>
                                <p className="text-xs text-gray-400 mt-1">{t('finance_module_coming_soon', 'Модуль финансов в разработке')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
