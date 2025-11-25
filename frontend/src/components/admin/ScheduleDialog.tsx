import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { WorkScheduleTab } from './WorkScheduleTab';
import { TimeOffTab } from './TimeOffTab';
import { useTranslation } from 'react-i18next';

interface User {
    id: number;
    full_name: string;
    role: string;
}

interface ScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

type Tab = 'schedule' | 'time-off';

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({ isOpen, onClose, user }) => {
    const { t } = useTranslation('admin-components');
    const [activeTab, setActiveTab] = useState<Tab>('schedule');

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl custom-dialog-scroll flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {t('schedule_management', { name: user.full_name })}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {t('schedule_settings')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'schedule'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        {t('work_schedule')}
                    </button>
                    <button
                        onClick={() => setActiveTab('time-off')}
                        className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'time-off'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        {t('absences')}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'schedule' ? (
                        <WorkScheduleTab userId={user.id} />
                    ) : (
                        <TimeOffTab userId={user.id} />
                    )}
                </div>
            </div>
        </div>
    );
};
