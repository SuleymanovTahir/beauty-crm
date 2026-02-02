import React from 'react';
import { X } from 'lucide-react';
import { EmployeeSchedule } from './EmployeeSchedule';
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

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({ isOpen, onClose, user }) => {
    const { t } = useTranslation('admin-components');

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                            {t('schedule_management', { name: user.full_name })}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {t('schedule_settings')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <EmployeeSchedule employeeId={user.id} employee={user} />
                </div>
            </div>
        </div>
    );
};
