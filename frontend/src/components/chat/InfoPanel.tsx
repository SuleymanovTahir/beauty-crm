import React, { useState } from 'react';
import { User, Phone, Instagram, Check, X, Loader, Edit2, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { StatusSelect } from '../shared/StatusSelect';
import { useClientStatuses } from '../../hooks/useStatuses';


interface Client {
  id: string;
  name: string;
  username: string;
  phone: string;
  display_name: string;
  profile_pic?: string;
  status: string;
}

interface InfoPanelProps {
  client: Client;
  onClose: () => void;
  onUpdate: (data: { name: string; phone: string; status?: string }) => Promise<void>;
}

export default function InfoPanel({ client, onClose, onUpdate }: InfoPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(client.name || '');
  const [editedPhone, setEditedPhone] = useState(client.phone || '');
  const { statuses: statusConfig, addStatus: handleAddStatus } = useClientStatuses();
  const [editedStatus, setEditedStatus] = useState(client.status || 'new');

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onUpdate({
        name: editedName.trim(),
        phone: editedPhone.trim(),
        status: editedStatus
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(client.name || '');
    setEditedPhone(client.phone || '');
    setEditedStatus(client.status || 'new');
    setIsEditing(false);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden animate-in slide-in-from-top duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">Информация</h3>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Profile Picture & Display Name */}
        <div className="flex items-center gap-4 pb-4 border-b-2 border-gray-100">
          {client.profile_pic ? (
            <img
              src={client.profile_pic}
              alt={client.display_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg ${client.profile_pic ? 'hidden' : ''
              }`}
          >
            <span className="text-2xl font-bold">
              {client.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-lg truncate">{client.display_name}</p>
            {client.username && (
              <p className="text-sm text-gray-600">@{client.username}</p>
            )}
          </div>
        </div>

        {/* Name Field */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            Имя клиента
          </label>
          {isEditing ? (
            <Input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Введите имя..."
              className="border-2 border-blue-300 focus:border-blue-500 rounded-xl"
            />
          ) : (
            <p className="text-gray-900 px-2 py-1">
              {client.name || <span className="text-gray-400 italic">Не указано</span>}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-600" />
            </div>
            Телефон
          </label>
          {isEditing ? (
            <Input
              type="text"
              value={editedPhone}
              onChange={(e) => setEditedPhone(e.target.value)}
              placeholder="+971 XX XXX XXXX"
              className="border-2 border-blue-300 focus:border-blue-500 rounded-xl"
            />
          ) : (
            <p className="text-gray-900 px-2 py-1">
              {client.phone || <span className="text-gray-400 italic">Не указан</span>}
            </p>
          )}
        </div>
        {/* Status Field */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
              <Check className="w-4 h-4 text-purple-600" />
            </div>
            Статус
          </label>
          {isEditing ? (
            <StatusSelect
              value={editedStatus}
              onChange={setEditedStatus}
              options={statusConfig}
              allowAdd={true}
              onAddStatus={handleAddStatus}
            />
          ) : (
            <div className="px-2 py-1">
              <StatusSelect
                value={client.status}
                onChange={async (newStatus) => {
                  try {
                    await onUpdate({
                      name: client.name,
                      phone: client.phone,
                      status: newStatus
                    });
                  } catch (error) {
                    console.error('Failed to update status:', error);
                  }
                }}
                options={statusConfig}
                allowAdd={true}
                onAddStatus={handleAddStatus}
              />
            </div>
          )}
        </div>
        {/* Instagram Field */}
        {client.username && (
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200 p-4">
            <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              Instagram
            </label>
            <a
              href={`https://instagram.com/${client.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
            >
              @{client.username}
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t-2 border-gray-100">
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
              className="px-4 border-2 rounded-xl hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
        )}
      </div>
    </div>
  );
}
