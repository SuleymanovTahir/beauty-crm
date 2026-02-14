import React from 'react';
import { X } from 'lucide-react';
import { EmployeeSchedule } from './EmployeeSchedule';
import { useTranslation } from 'react-i18next';
import { getPhotoUrl } from '../../utils/photoUtils';
import { getDynamicAvatar } from '../../utils/avatarUtils';

interface User {
    id: number;
    full_name: string;
    role: string;
    username?: string;
    photo?: string;
}

interface ScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({ isOpen, onClose, user }) => {
    const { t } = useTranslation('admin-components');

    if (!isOpen || !user) return null;

    const photoUrl = getPhotoUrl(user.photo);
    const avatarName = user.full_name ?? user.username ?? 'User';
    const fallbackAvatar = getDynamicAvatar(avatarName, 'cold');

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <img
                            src={photoUrl ?? fallbackAvatar}
                            alt={user.full_name}
                            className="w-12 h-12 rounded-full object-cover bg-gray-100"
                        />
                        <div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                            {t('schedule_management', { name: user.full_name })}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {t('schedule_settings')}
                        </p>
                        </div>
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
