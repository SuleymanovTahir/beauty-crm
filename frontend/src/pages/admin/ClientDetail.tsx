// /frontend/src/pages/admin/ClientDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, MessageSquare, Edit2, Save, X, Clock, Instagram, User, Upload, Plus, Trash2, Target, Loader, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { api } from '../../services/api';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { useCurrency } from '../../hooks/useSalonSettings';

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
  total_visits?: number;
  discount?: number;
  card_number?: string;
  temperature?: string;
  total_spend?: number;
  gender?: string;
  birth_date?: string;
  email?: string;
  referral_code?: string;
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

interface ClientStats {
  top_procedures: { name: string; count: number }[];
  top_masters: { name: string; count: number }[];
  visits_chart?: { date: string; count: number }[];
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['admin/clientdetail', 'common']);
  const { formatCurrency } = useCurrency();

  const [client, setClient] = useState<Client | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    notes: '',
    gender: '',
    birth_date: '',
    email: '',
    referral_code: '',
    discount: 0,
    password: ''
  });

  // Gallery state
  const [clientGallery, setClientGallery] = useState<any[]>([]);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryFormData, setGalleryFormData] = useState({
    before_photo: '',
    after_photo: '',
    notes: '',
    category: '',
    master_id: 0
  });
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  useEffect(() => {
    if (id) {
      loadClient();
    }
  }, [id]);

  const loadClient = async () => {
    try {
      setLoading(true);

      // Параллельная загрузка всех данных для ускорения (оптимизация производительности)
      const [data, messengersResponse] = await Promise.all([
        api.getClient(id!),
        api.getEnabledMessengers().catch(err => {
          console.error('Error loading enabled messengers:', err);
          return { enabled_messengers: [] };
        })
      ]);

      setClient(data.client);
      setStats(data.stats);
      setEnabledMessengers(messengersResponse.enabled_messengers);

      // Handle phone for edit form (take first if array)
      let phoneVal = data.client?.phone || '';
      try {
        if (phoneVal.startsWith('[')) {
          const parsed = JSON.parse(phoneVal);
          if (Array.isArray(parsed) && parsed.length > 0) phoneVal = parsed[0];
        }
      } catch (e) { }

      setEditForm({
        name: data.client?.name || '',
        phone: phoneVal,
        notes: data.client?.notes || '',
        gender: data.client?.gender || '',
        birth_date: data.client?.birth_date || '',
        email: data.client?.email || '',
        referral_code: data.client?.referral_code || '',
        discount: data.client?.discount || 0,
        password: ''
      });

      setMessages(data.chat_history || []);
      setBookings(data.bookings || []);

      // Загрузка галереи параллельно с основными данными
      loadClientGallery(data.client?.instagram_id || id!);
    } catch (err) {
      toast.error(t('common:loading_error'));
      console.error('Error:', err);
      navigate('/crm/clients');
    } finally {
      setLoading(false);
    }
  };

  const loadClientGallery = async (clientId: string) => {
    try {
      const data = await api.getAdminClientGallery(clientId);
      setClientGallery(data.gallery || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  };

  const handleUploadGalleryPhoto = async (photoType: 'before' | 'after', file: File) => {
    if (!client) return;
    try {
      if (photoType === 'before') setUploadingBefore(true);
      else setUploadingAfter(true);

      const res = await api.uploadClientGalleryPhoto(client.id, photoType, file);
      setGalleryFormData({ ...galleryFormData, [photoType === 'before' ? 'before_photo' : 'after_photo']: res.image_path });
      toast.success(t('photo_uploaded'));
    } catch (error) {
      toast.error(t('upload_error'));
    } finally {
      if (photoType === 'before') setUploadingBefore(false);
      else setUploadingAfter(false);
    }
  };

  const handleSaveGalleryEntry = async () => {
    if (!client) return;
    try {
      setSaving(true);
      await api.addClientGalleryEntry({ ...galleryFormData, client_id: client.id });
      loadClientGallery(client.id);
      setIsGalleryModalOpen(false);
      setGalleryFormData({ before_photo: '', after_photo: '', notes: '', category: '', master_id: 0 });
      toast.success(t('gallery_entry_added'));
    } catch (error) {
      toast.error(t('save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGalleryEntry = async (entryId: number) => {
    if (!confirm(t('delete_gallery_confirm'))) return;
    try {
      await api.deleteClientGalleryEntry(entryId);
      setClientGallery(clientGallery.filter(e => e.id !== entryId));
      toast.success(t('gallery_entry_deleted'));
    } catch (error) {
      toast.error(t('delete_error'));
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    try {
      // Handle both double and single quotes for JSON array
      let phoneStr = phone;
      if (phone.startsWith("['")) {
        phoneStr = phone.replace(/'/g, '"');
      }

      if (phoneStr.startsWith('[')) {
        const parsed = JSON.parse(phoneStr);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(', ') : '-';
      }
    } catch (e) { }
    return phone;
  };

  const handleSave = async () => {
    if (!client) return;

    try {
      setSaving(true);
      await api.updateClient(client.id, editForm);

      setClient({
        ...client,
        ...editForm,
        birth_date: editForm.birth_date || undefined
      });
      setEditing(false);
      toast.success(t('client_data_updated'));
    } catch (err) {
      toast.error(t('error_saving'));
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
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <Button onClick={() => navigate('/crm/clients')} variant="ghost">
          ← {t('common:back_to_clients')}
        </Button>
        <p className="text-gray-600 mt-4">{t('not_found')}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/crm/clients')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          {client.profile_pic && client.profile_pic !== 'null' ? (
            <img
              src={client.profile_pic}
              alt={client.name || t('client')}
              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.querySelector('.fallback-avatar')?.classList.remove('hidden');
              }}
            />
          ) : (
            <img
              src={getDynamicAvatar(client.name || client.username || 'Client', client.temperature, client.gender)}
              alt={client.name || t('client')}
              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
            />
          )}
          {/* Hidden fallback for error handling */}
          <img
            src={getDynamicAvatar(client.name || client.username || 'Client', client.temperature, client.gender)}
            alt="Fallback"
            className="fallback-avatar hidden w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
          />
          <div className="flex-1">
            <h1 className="text-3xl text-gray-900">{client.name || t('client')}</h1>
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
            {t('edit')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('client_info')}</h2>

            {editing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{t('name')}</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{t('phone')}</label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('gender')}
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">{t('select_gender')}</option>
                      <option value="male">{t('male')}</option>
                      <option value="female">{t('female')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('birth_date')}
                    </label>
                    <Input
                      type="date"
                      value={editForm.birth_date}
                      onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">{t('email_login')}</label>
                    <Input
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">{t('password')}</label>
                    <Input
                      type="password"
                      placeholder={t('leave_blank_to_keep')}
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">{t('special_discount')}</label>
                    <Input
                      type="number"
                      value={editForm.discount}
                      onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">{t('promo_code')}</label>
                    <Input
                      value={editForm.referral_code}
                      onChange={(e) => setEditForm({ ...editForm, referral_code: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{t('notes')}</label>
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
                    {saving ? t('saving') : t('save')}
                  </Button>
                  <Button
                    onClick={() => setEditing(false)}
                    variant="outline"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">{t('phone')}</p>
                    <p className="text-lg text-gray-900">{formatPhone(client.phone)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">{t('first_contact')}</p>
                    <p className="text-lg text-gray-900">
                      {new Date(client.first_contact).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                </div>



                <div className="flex items-start gap-4">
                  <User className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">{t('gender_age')}</p>
                    <p className="text-lg text-gray-900">
                      {client.gender === 'male' ? t('male') : client.gender === 'female' ? t('female') : '-'}
                      {client.birth_date && (() => {
                        const birthDate = new Date(client.birth_date);
                        const ageDiffMs = Date.now() - birthDate.getTime();
                        const ageDate = new Date(ageDiffMs);
                        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
                        return `, ${age} ${t('years')}`;
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">{t('total_messages')}</p>
                    <p className="text-lg text-gray-900">{client.total_messages}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="flex items-start gap-4">
                    <User className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">{t('email_login')}</p>
                      <p className="text-lg text-gray-900">{client.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Target className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">{t('promo_code')}</p>
                      <p className="text-lg text-gray-900">{client.referral_code || '-'}</p>
                    </div>
                  </div>
                </div>

                {client.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">{t('notes')}</p>
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
            <h3 className="text-lg text-gray-900 mb-6">{t('statistics')}</h3>

            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('status')}</p>
                <Badge className="bg-blue-100 text-blue-800 capitalize">
                  {t('common:status_' + (client.status || 'new'), { defaultValue: client.status || 'New' })}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('lifetime_value')}</p>
                  <p className="text-2xl text-green-600 font-bold">
                    {formatCurrency(client.total_spend || client.lifetime_value || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('total_visits')}</p>
                  <p className="text-2xl text-blue-600 font-bold">
                    {client.total_visits || 0}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('discount')}</p>
                  <p className="text-lg text-gray-900 font-medium">
                    {client.discount ? `${String(client.discount).replace('%', '')}%` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('card_number')}</p>
                  <p className="text-lg text-gray-900 font-medium">
                    {client.card_number || '-'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">{t('last_contact')}</p>
                <p className="text-gray-900">
                  {client.last_contact ? new Date(client.last_contact).toLocaleDateString(i18n.language) : '-'}
                </p>
              </div>

              {/* Top 3 Procedures */}
              {stats?.top_procedures && stats.top_procedures.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">{t('top_3_procedures', 'Top-3 procedures')}</p>
                  <div className="space-y-2">
                    {stats.top_procedures.map((proc, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-900 truncate pr-2" title={proc.name}>{proc.name}</span>
                        <span className="text-gray-500 font-medium">{proc.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Top 3 Masters */}
              {stats?.top_masters && stats.top_masters.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">{t('top_3_masters', 'Top-3 masters')}</p>
                  <div className="space-y-2">
                    {stats.top_masters.map((master, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-900 truncate pr-2" title={master.name}>{master.name}</span>
                        <span className="text-gray-500 font-medium">{master.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Visits Chart - Professional Bar Chart */}
              {stats?.visits_chart && stats.visits_chart.length > 0 ? (
                <div className="h-64 mt-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-pink-500" />
                    {t('visits_dynamics', 'Visit dynamics')}
                  </p>
                  <ResponsiveContainer width="100%" height="200">
                    <BarChart data={stats.visits_chart} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec4899" stopOpacity={1} />
                          <stop offset="100%" stopColor="#f472b6" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #f3f4f6',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '13px',
                          padding: '12px'
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="url(#barGradient)"
                        radius={[6, 6, 0, 0]}
                        barSize={40}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 mt-4 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 text-center px-4">
                    {t('no_visit_history', 'Нет истории посещений для графика')}
                  </p>
                </div>
              )}

              {/* Messenger Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {enabledMessengers.map((messenger) => (
                  <Button
                    key={messenger.type}
                    onClick={() => {
                      if (messenger.type === 'instagram') {
                        navigate(`/crm/chat?client_id=${client.id}`);
                      } else if (messenger.type === 'whatsapp') {
                        const phone = client.phone?.replace(/[^0-9]/g, '');
                        if (phone) {
                          window.open(`https://wa.me/${phone}`, '_blank');
                        } else {
                          toast.error('Номер телефона не указан');
                        }
                      } else if (messenger.type === 'telegram') {
                        navigate(`/crm/chat?messenger=telegram&client_id=${client.id}`);
                      } else if (messenger.type === 'tiktok') {
                        toast.info('TikTok интеграция в разработке');
                      }
                    }}
                    className={`gap-2 ${messenger.type === 'instagram' ? 'bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700' :
                      messenger.type === 'whatsapp' ? 'bg-green-500 hover:bg-green-600' :
                        messenger.type === 'telegram' ? 'bg-blue-500 hover:bg-blue-600' :
                          'bg-black hover:bg-gray-800'
                      }`}
                    title={messenger.name}
                  >
                    {messenger.type === 'instagram' ? (
                      <Instagram className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{messenger.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking History */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6 text-pink-600" />
          {t('booking_history')}
        </h2>

        {bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('service')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('date_time')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('revenue')}
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
                      {new Date(booking.datetime).toLocaleString(i18n.language, {
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
                      {booking.revenue ? formatCurrency(booking.revenue) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">{t('no_bookings')}</p>
        )}
      </div>

      {/* Chat History */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl text-gray-900 mb-6">{t('chat_history')}</h2>

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
                    {new Date(msg.timestamp).toLocaleTimeString(i18n.language)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">{t('no_messages')}</p>
        )}
      </div>
      {/* Client Gallery */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-pink-600" />
            {t('client_gallery')}
          </h2>
          <Button onClick={() => setIsGalleryModalOpen(true)} className="bg-pink-600 hover:bg-pink-700">
            <Plus className="w-4 h-4 mr-2" /> {t('add_work')}
          </Button>
        </div>

        {clientGallery.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientGallery.map(entry => (
              <div key={entry.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 group relative">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleDeleteGalleryEntry(entry.id)}
                    className="p-2 bg-white/90 hover:bg-red-50 rounded-lg text-red-600 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-px bg-gray-200 h-48">
                  <div className="relative">
                    <img src={entry.before_photo} alt="Before" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {t('before')}
                    </div>
                  </div>
                  <div className="relative">
                    <img src={entry.after_photo} alt="After" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-pink-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {t('after')}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-medium mb-1">{entry.category || t('procedure')}</p>
                  <p className="text-xs text-gray-600 italic line-clamp-2">{entry.notes || t('no_notes')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-gray-500">{t('no_gallery_entries')}</p>
          </div>
        )}
      </div>

      {/* Gallery Entry Modal */}
      <Dialog open={isGalleryModalOpen} onOpenChange={setIsGalleryModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('add_to_gallery')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <Label>{t('photo_before')}</Label>
              <div className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden bg-gray-50">
                {galleryFormData.before_photo ? (
                  <img src={galleryFormData.before_photo} className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-300" />
                )}
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleUploadGalleryPhoto('before', e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingBefore}
                />
                {uploadingBefore && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                    <Loader className="animate-spin text-pink-600" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <Label>{t('photo_after')}</Label>
              <div className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden bg-gray-50">
                {galleryFormData.after_photo ? (
                  <img src={galleryFormData.after_photo} className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-300" />
                )}
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleUploadGalleryPhoto('after', e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingAfter}
                />
                {uploadingAfter && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                    <Loader className="animate-spin text-pink-600" />
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2 space-y-4">
              <div>
                <Label>{t('notes_description')}</Label>
                <Input
                  value={galleryFormData.notes}
                  onChange={e => setGalleryFormData({ ...galleryFormData, notes: e.target.value })}
                  placeholder={t('notes_placeholder')}
                />
              </div>
              <div>
                <Label>{t('category')}</Label>
                <Input
                  value={galleryFormData.category}
                  onChange={e => setGalleryFormData({ ...galleryFormData, category: e.target.value })}
                  placeholder={t('category_placeholder')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGalleryModalOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleSaveGalleryEntry}
              disabled={saving || uploadingBefore || uploadingAfter || !galleryFormData.before_photo || !galleryFormData.after_photo}
              className="bg-pink-600"
            >
              {saving ? t('common:saving') : t('add_to_gallery')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}