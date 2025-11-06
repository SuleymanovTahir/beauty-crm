import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Calendar, MessageSquare, Edit2, Save, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Client {
  id: string;
  username: string;
  phone: string;
  name: string;
  first_contact: string;
  last_contact: string;
  total_messages: number;
  status: string;
  lifetime_value: number;
  notes: string;
  profile_pic?: string;
}

interface ChatMessage {
  message: string;
  sender: string;
  timestamp: string;
  type?: string;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      loadClient();
    }
  }, [id]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const data = await api.getClient(id!);
      
      setClient(data.client);
      setEditForm({
        name: data.client?.name || '',
        phone: data.client?.phone || '',
        notes: data.client?.notes || ''
      });
      
      setMessages(data.chat_history || []);
    } catch (err) {
      toast.error('Ошибка загрузки клиента');
      console.error('Error:', err);
      navigate('/admin/clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!client) return;

    try {
      setSaving(true);
      await api.updateClient(client.id, editForm);
      
      setClient({ ...client, ...editForm });
      setEditing(false);
      toast.success('Данные клиента обновлены');
    } catch (err) {
      toast.error('Ошибка сохранения');
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <Button onClick={() => navigate('/admin/clients')} variant="ghost">
          ← Вернуться
        </Button>
        <p className="text-gray-600 mt-4">Клиент не найден</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/clients')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          {client.profile_pic ? (
            <img
              src={client.profile_pic}
              alt={client.name || 'Клиент'}
              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {(client.name || client.username || 'К').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl text-gray-900">{client.name || 'Клиент'}</h1>
            {client.username && (
              <a
                href={`https://instagram.com/${client.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-700 hover:underline flex items-center gap-2"
              >
                @{client.username}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            variant="outline"
            className="gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Редактировать
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Информация о клиенте</h2>

            {editing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Имя</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Телефон</label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Заметки</label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button
                    onClick={() => setEditing(false)}
                    variant="outline"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Телефон</p>
                    <p className="text-lg text-gray-900">{client.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Первый контакт</p>
                    <p className="text-lg text-gray-900">
                      {new Date(client.first_contact).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Всего сообщений</p>
                    <p className="text-lg text-gray-900">{client.total_messages}</p>
                  </div>
                </div>

                {client.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Заметки</p>
                    <p className="text-gray-900 mt-1">{client.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg text-gray-900 mb-6">Статистика</h3>

            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Статус</p>
                <Badge className="bg-blue-100 text-blue-800 capitalize">
                  {client.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Lifetime Value</p>
                <p className="text-2xl text-green-600 font-bold">
                  {client.lifetime_value} AED
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Последний контакт</p>
                <p className="text-gray-900">
                  {new Date(client.last_contact).toLocaleDateString('ru-RU')}
                </p>
              </div>

              <Button
                onClick={() => navigate(`/admin/chat?client_id=${client.id}`)}
                className="w-full bg-pink-600 hover:bg-pink-700 gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Написать сообщение
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat History */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl text-gray-900 mb-6">История переписки</h2>

        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-3 rounded-lg ${
                    msg.sender === 'bot'
                      ? 'bg-pink-100 text-gray-900'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Нет сообщений</p>
        )}
      </div>
    </div>
  );
}