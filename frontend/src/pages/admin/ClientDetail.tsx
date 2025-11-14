import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, MessageSquare, Edit2, Save, X, Clock, Instagram } from 'lucide-react';
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

interface Booking {
  id: number;
  service: string;
  datetime: string;
  phone: string;
  status: string;
  revenue?: number;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation([' admin/ClientDetail', 'common']);
  const [client, setClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
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
      setBookings(data.bookings || []);
    } catch (err) {
      toast.error(t('common:loading_error'));
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
      toast.success(t('clientdetail:client_data_updated'));
    } catch (err) {
      toast.error(t('clientdetail:error_saving'));
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
          <p className="mt-4 text-gray-600">{t('clientdetail:loading')}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <Button onClick={() => navigate('/admin/clients')} variant="ghost">
          ← {t('common:back_to_clients')}
        </Button>
        <p className="text-gray-600 mt-4">{t('clientdetail:not_found')}</p>
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
              alt={client.name || t('clientdetail:client')}
              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {(client.name || client.username || t('clientdetail:client')).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl text-gray-900">{client.name || t('clientdetail:client')}</h1>
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
            {t('clientdetail:edit')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('clientdetail:client_info')}</h2>

            {editing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{t('clientdetail:name')}</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{t('clientdetail:phone')}</label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{t('clientdetail:notes')}</label>
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
                    {saving ? t('clientdetail:saving') : t('clientdetail:save')}
                  </Button>
                  <Button
                    onClick={() => setEditing(false)}
                    variant="outline"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('clientdetail:cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">{t('clientdetail:phone')}</p>
                    <p className="text-lg text-gray-900">{client.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">{t('clientdetail:first_contact')}</p>
                    <p className="text-lg text-gray-900">
                      {new Date(client.first_contact).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">{t('clientdetail:total_messages')}</p>
                    <p className="text-lg text-gray-900">{client.total_messages}</p>
                  </div>
                </div>

                {client.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">{t('clientdetail:notes')}</p>
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
            <h3 className="text-lg text-gray-900 mb-6">{t('clientdetail:statistics')}</h3>

            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('clientdetail:status')}</p>
                <Badge className="bg-blue-100 text-blue-800 capitalize">
                  {client.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">{t('clientdetail:lifetime_value')}</p>
                <p className="text-2xl text-green-600 font-bold">
                  {client.lifetime_value} AED
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">{t('clientdetail:last_contact')}</p>
                <p className="text-gray-900">
                  {new Date(client.last_contact).toLocaleDateString('ru-RU')}
                </p>
              </div>

              {/* Messenger Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => navigate(`/admin/chat?client_id=${client.id}`)}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 gap-2"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                  <span className="hidden sm:inline">Instagram</span>
                </Button>

                <Button
                  onClick={() => {
                    const phone = client.phone?.replace(/[^0-9]/g, '');
                    if (phone) {
                      window.open(`https://wa.me/${phone}`, '_blank');
                    } else {
                      toast.error('Номер телефона не указан');
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600 gap-2"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>

                <Button
                  onClick={() => {
                    toast.info('Telegram интеграция в разработке');
                  }}
                  className="bg-blue-500 hover:bg-blue-600 gap-2"
                  title="Telegram"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Telegram</span>
                </Button>

                <Button
                  onClick={() => {
                    toast.info('TikTok интеграция в разработке');
                  }}
                  className="bg-black hover:bg-gray-800 gap-2"
                  title="TikTok"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">TikTok</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking History */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6 text-pink-600" />
          {t('clientdetail:booking_history')}
        </h2>

        {bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clientdetail:service')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clientdetail:date_time')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clientdetail:status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clientdetail:revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(booking.datetime).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`
                        ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                        ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                        ${booking.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
                        capitalize
                      `}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {booking.revenue ? `${booking.revenue} AED` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">{t('clientdetail:no_bookings')}</p>
        )}
      </div>

      {/* Chat History */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl text-gray-900 mb-6">{t('clientdetail:chat_history')}</h2>

        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-3 rounded-lg ${msg.sender === 'bot'
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
          <p className="text-gray-500 text-center py-8">{t('clientdetail:no_messages')}</p>
        )}
      </div>
    </div>
  );
}