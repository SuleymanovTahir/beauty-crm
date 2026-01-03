import { X, Phone, Users, Edit } from 'lucide-react';
import { motion } from 'motion/react';

interface InfoPanelProps {
  name: string;
  username: string;
  phone: string;
  onClose: () => void;
}

export function InfoPanel({ name, username, phone, onClose }: InfoPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.2 }}
      className="w-[380px] bg-white border-l border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        <h3 className="font-semibold">Информация</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="size-5 text-gray-700" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Profile */}
        <div className="flex flex-col items-center mb-6">
          <div className="size-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-semibold">{name[0]}</span>
          </div>
          <h2 className="font-semibold text-xl mb-1">{name}</h2>
          <p className="text-sm text-gray-600">{username}</p>
        </div>

        {/* Info Sections */}
        <div className="space-y-4">
          {/* Name */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Users className="size-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Имя</p>
                <p className="text-sm font-medium">{name}</p>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Phone className="size-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Телефон</p>
                <p className="text-sm font-medium">{phone}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Edit className="size-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Примечания</p>
                <button className="text-sm text-blue-600 hover:underline">
                  Добавить примечание
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Редактировать профиль
          </button>
          <button className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors">
            Заблокировать
          </button>
        </div>
      </div>
    </motion.div>
  );
}
