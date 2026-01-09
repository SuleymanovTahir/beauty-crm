// /frontend/src/pages/employee/Tasks.tsx
import { useEffect, useState } from 'react';
import { CheckSquare, Clock, AlertCircle, Loader } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  status: string;
  priority: string;
  assigned_to: string;
}

export default function EmployeeTasks() {
  const { t } = useTranslation(['employee/tasks', 'common']);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      // API endpoint for tasks would need to be created
      // const data = await api.getTasks();
      // setTasks(data.tasks || []);
      setTasks([]); // Placeholder
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      setError(err.message || t('common:error_loading'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{t('common:error')}: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-pink-600" />
          {t('tasks:my_tasks')}
        </h1>
        <p className="text-gray-600">{t('tasks:manage_your_tasks')}</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">{t('tasks:no_tasks')}</h3>
          <p className="text-gray-600">{t('tasks:no_tasks_description')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{task.title}</h3>
                  <p className="text-gray-600 mb-3">{task.description}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(task.due_date).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
                <Badge className={
                  task.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : task.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }>
                  {task.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
