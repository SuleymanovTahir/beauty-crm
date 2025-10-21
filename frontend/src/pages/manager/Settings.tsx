import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function Settings() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-pink-600" />
          Настройки
        </h1>
        <p className="text-gray-600">Персональные настройки менеджера</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center py-20">
          <SettingsIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-600">Настройки в разработке</h3>
          <p className="text-gray-500 mt-2">Скоро здесь появятся персональные настройки</p>
          <Button className="mt-6 bg-gradient-to-r from-pink-500 to-purple-600">
            Назад к панели управления
          </Button>
        </div>
      </div>
    </div>
  );
}
