
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    CalendarDays,
    User,
    Trash2,
    Layout,
    LayoutDashboard,
    Settings,
    Eye
} from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { CreateTaskDialog } from '../../components/tasks/CreateTaskDialog';
import { ManageTaskStagesDialog } from '../../components/tasks/ManageTaskStagesDialog';
import { TasksDashboard } from '../../components/tasks/TasksDashboard';

interface Task {
    id: number;
    title: string;
    description?: string;
    stage_id: number;
    status: string; // legacy or convenience
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    assignee_id?: number;
    assignee_name?: string;
    assignee_ids?: number[];
    assignee_names?: string[];
    created_by?: number;
    created_by_name?: string;
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

export default function Tasks() {
    const { t } = useTranslation(['admin/tasks', 'common']);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [analytics, setAnalytics] = useState<TaskAnalytics>({ total_active: 0, completed: 0, overdue: 0, today: 0 });
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [manageStagesOpen, setManageStagesOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [tasksData, analyticsData, stagesData] = await Promise.all([
                api.get('/api/tasks'),
                api.get('/api/tasks/analytics'),
                api.get('/api/tasks/stages')
            ]);
            setTasks(tasksData);
            setAnalytics(analyticsData);
            setStages(stagesData);
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error('Failed to load tasks');
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
                            variant="outline"
                            className="bg-white"
                            onClick={() => setManageStagesOpen(true)}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            {t('manage_stages')}
                        </Button>
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
                />

                <ManageTaskStagesDialog
                    open={manageStagesOpen}
                    onOpenChange={setManageStagesOpen}
                    onSuccess={loadData}
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
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">
                                <CalendarDays className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{analytics.total_active}</div>
                                <div className="text-xs text-gray-600 font-medium">{t('analytics.active')}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            {viewMode === 'dashboard' ? (
                <div className="flex-1 overflow-hidden">
                    <TasksDashboard tasks={tasks} stages={stages} />
                </div>
            ) : (
                /* Kanban Board */
                <div className="flex-1 overflow-x-auto p-6">
                    <div className="flex gap-6 h-full min-w-max">
                        {stages.map(stage => (
                            <div
                                key={stage.id}
                                className="w-96 flex flex-col bg-gray-100/50 rounded-xl border border-gray-200/60"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className="p-4 border-b border-gray-200/60 bg-white/50 rounded-t-xl sticky top-0 backdrop-blur-sm z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: stage.color?.replace('bg-', '').replace('-500', '') || '#9ca3af' }}
                                            />
                                            <span className="font-semibold text-gray-700">{t(`stages.${stage.key || stage.name.toLowerCase().replace(/\s+/g, '_')}`, { defaultValue: stage.name })}</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-white text-gray-500 shadow-sm border">
                                            {tasks.filter(t => t.stage_id === stage.id).length}
                                        </Badge>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 p-3">
                                    <div className="space-y-3 pb-2">
                                        {tasks.filter(t => t.stage_id === stage.id).map(task => (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task)}
                                                className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                                            >
                                                {/* Actions Overlay */}
                                                <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg p-0.5 backdrop-blur-sm">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditTask(task);
                                                        }}
                                                        title={t('edit')}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTask(task.id);
                                                        }}
                                                        title={t('delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                {/* Task Card Content */}
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge className={`px-2 py-0.5 text-[10px] bg-transparent border ${getPriorityColor(task.priority)} shadow-none hover:bg-transparent`}>
                                                        {t(`priority.${task.priority}`)}
                                                    </Badge>
                                                </div>

                                                <h4 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{task.title}</h4>
                                                {task.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>}

                                                {task.created_by_name && (
                                                    <div className="flex items-center gap-1.5 mb-3 text-[10px] text-gray-400">
                                                        <User className="w-3 h-3" />
                                                        <span>{t('created_by')}: {task.created_by_name}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {task.assignee_names && task.assignee_names.length > 0 ? (
                                                            <>
                                                                <div className="flex -space-x-2">
                                                                    {task.assignee_names.slice(0, 3).map((name, idx) => (
                                                                        <Avatar key={idx} className="w-6 h-6 border-2 border-white">
                                                                            <AvatarFallback className="text-[9px] bg-pink-50 text-pink-600">
                                                                                {name[0]}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                    ))}
                                                                    {task.assignee_names.length > 3 && (
                                                                        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] text-gray-600 font-medium">
                                                                            +{task.assignee_names.length - 3}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-gray-400 ml-1">
                                                                    {task.assignee_names.length === 1
                                                                        ? task.assignee_names[0]
                                                                        : `${task.assignee_names.length} ${t('assignees', 'ответственных')}`}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-dashed border-gray-300 text-gray-400">
                                                                    <User className="w-3 h-3" />
                                                                </div>
                                                                <span className="text-xs text-gray-400">{t('unassigned')}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {task.due_date && (
                                                        <div className={`text-xs flex items-center gap-1 ${isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                                            <CalendarDays className="w-3 h-3" />
                                                            {format(new Date(task.due_date), 'd MMM', { locale: ru })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {tasks.filter(t => t.stage_id === stage.id).length === 0 && (
                                            <div className="text-center py-10 text-gray-400 text-xs italic border-2 border-dashed border-gray-100 rounded-lg">
                                                {t('no_tasks')}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-2 pt-0 sticky bottom-0 bg-transparent">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-gray-400 hover:text-gray-600 text-xs border border-dashed border-gray-300 hover:bg-white bg-transparent"
                                        onClick={() => {
                                            setTaskToEdit(null); // Ensure creation mode
                                            setCreateDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="w-3 h-3 mr-1.5" />
                                        {t('quick_add')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
