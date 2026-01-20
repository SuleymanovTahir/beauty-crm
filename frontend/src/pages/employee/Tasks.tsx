// /frontend/src/pages/employee/Tasks.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';

import {
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    CalendarDays,

    Trash2,
    Layout,
    LayoutDashboard,
    Eye
} from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { CreateTaskDialog } from '../../components/tasks/CreateTaskDialog';
import { TasksDashboard } from '../../components/tasks/TasksDashboard';


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
    created_at: string;
}

interface Stage {
    id: number;
    name: string;
    key?: string;
    color: string;
}

interface TaskAnalytics {
    total_active: number;
    completed: number;
    overdue: number;
    today: number;
}

export default function EmployeeTasks() {
    const { t } = useTranslation(['admin/tasks', 'common']);
    // const { user: currentUser } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [analytics, setAnalytics] = useState<TaskAnalytics>({ total_active: 0, completed: 0, overdue: 0, today: 0 });
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [tasksData, analyticsData, stagesData] = await Promise.all([
                api.get('/api/tasks/my'), // Endpoint for employee's own tasks
                api.get('/api/tasks/analytics'),
                api.get('/api/tasks/stages')
            ]);
            setTasks(tasksData);
            setAnalytics(analyticsData);
            setStages(stagesData);
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error('Ошибка загрузки задач');
        }
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, stageId: number) => {
        e.preventDefault();
        if (!draggedTask || draggedTask.stage_id === stageId) return;

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, stage_id: stageId } : t));

        try {
            await api.put(`/api/tasks/${draggedTask.id}/move`, { stage_id: stageId });
            toast.success(t('status_updated'));
            // Refresh analytics
            const updatedAnalytics = await api.get('/api/tasks/analytics');
            setAnalytics(updatedAnalytics);
        } catch (error) {
            console.error("Update failed", error);
            toast.error(t('update_failed'));
            loadData();
        } finally {
            setDraggedTask(null);
        }
    };

    const handleEditTask = (task: Task) => {
        setTaskToEdit(task);
        setCreateDialogOpen(true);
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm(t('confirm_delete'))) return;

        try {
            await api.delete(`/api/tasks/${taskId}`);
            toast.success(t('task_deleted'));

            setTasks(prev => prev.filter(t => t.id !== taskId));
            const updatedAnalytics = await api.get('/api/tasks/analytics');
            setAnalytics(updatedAnalytics);
        } catch (error) {
            console.error("Delete failed", error);
            toast.error(t('delete_failed'));
        }
    };

    const handleCreateTaskClose = (open: boolean) => {
        setCreateDialogOpen(open);
        if (!open) setTaskToEdit(null);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // View state
    const [viewMode, setViewMode] = useState<'board' | 'dashboard'>('board');

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header & Analytics */}
            <div className="px-8 py-6 bg-white border-b">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('tasks')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('task_management_subtitle')}</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2 border border-gray-200">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'board'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <Layout className="w-4 h-4 mr-2 inline-block" />
                                {t('board')}
                            </button>
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'dashboard'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2 inline-block" />
                                {t('dashboard')}
                            </button>
                        </div>

                        <Button
                            className="bg-gradient-to-r from-pink-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('create_task')}
                        </Button>
                    </div>
                </div>

                <CreateTaskDialog
                    open={createDialogOpen}
                    onOpenChange={handleCreateTaskClose}
                    onSuccess={loadData}
                    stages={stages}
                    taskToEdit={taskToEdit}
                    isEmployee={true}
                />

                {/* Only show analytics summary in Board view */}
                {viewMode === 'board' && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-900">{analytics.today}</div>
                                <div className="text-xs text-blue-600 font-medium">{t('analytics.today')}</div>
                            </div>
                        </div>
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-900">{analytics.overdue}</div>
                                <div className="text-xs text-red-600 font-medium">{t('analytics.overdue')}</div>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-900">{analytics.completed}</div>
                                <div className="text-xs text-blue-600 font-medium">{t('analytics.completed')}</div>
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                <CalendarDays className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-900">{analytics.total_active}</div>
                                <div className="text-xs text-green-600 font-medium">{t('analytics.active')}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            {viewMode === 'dashboard' ? (
                <TasksDashboard tasks={tasks} stages={stages} />
            ) : (
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-4 p-8 h-full" style={{ minWidth: 'max-content' }}>
                        {stages.map((stage) => (
                            <div
                                key={stage.id}
                                className="flex flex-col bg-gray-100 rounded-xl p-4 w-80"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: stage.color }}
                                        />
                                        {stage.name}
                                        <span className="text-sm text-gray-500 ml-1">
                                            ({tasks.filter(t => t.stage_id === stage.id).length})
                                        </span>
                                    </h3>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="space-y-3 pr-4">
                                        {tasks
                                            .filter(task => task.stage_id === stage.id)
                                            .map(task => {
                                                const isDue = task.due_date && isToday(new Date(task.due_date));
                                                const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

                                                return (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, task)}
                                                        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <h4 className="font-medium text-gray-900 text-sm flex-1">{task.title}</h4>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleEditTask(task)}
                                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                                    title={t('edit')}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                                    title={t('delete')}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {task.description && (
                                                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                                                        )}

                                                        <div className="flex items-center justify-between gap-2">
                                                            <Badge className={`text-xs px-2 py-0.5 ${getPriorityColor(task.priority)}`}>
                                                                {t(`priority.${task.priority}`)}
                                                            </Badge>

                                                            {task.due_date && (
                                                                <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : isDue ? 'text-orange-600' : 'text-gray-500'
                                                                    }`}>
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>
                                                                        {format(new Date(task.due_date), 'd MMM', { locale: ru })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </ScrollArea>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
