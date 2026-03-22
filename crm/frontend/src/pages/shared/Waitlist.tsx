import { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, CheckCircle, Bell, RefreshCw, Phone, Scissors } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { buildApiUrl } from '@crm/api/client';

interface WaitEntry {
  id: number; client_name?: string; client_phone?: string;
  service_name?: string; employee_name?: string;
  preferred_date?: string; preferred_time_from?: string; preferred_time_to?: string;
  notes?: string; status: string; created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  waiting:   { label: 'Ожидает',   color: 'bg-yellow-100 text-yellow-700' },
  notified:  { label: 'Уведомлён', color: 'bg-blue-100 text-blue-700' },
  booked:    { label: 'Записан',   color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Отменён',   color: 'bg-red-100 text-red-700' },
};

export default function Waitlist() {
  const [entries, setEntries] = useState<WaitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    client_name: '', client_phone: '', service_name: '',
    preferred_date: '', preferred_time_from: '', preferred_time_to: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(buildApiUrl('/api/waitlist'), { credentials: 'include' }),
        fetch(buildApiUrl('/api/waitlist/stats'), { credentials: 'include' }),
      ]);
      const d1 = await r1.json(); setEntries(d1.entries || []);
      const d2 = await r2.json(); setStats(d2);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.client_name && !form.client_phone) { toast.error('Укажите имя или телефон'); return; }
    const res = await fetch(buildApiUrl('/api/waitlist'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) { toast.success('Добавлено в лист ожидания'); setShowForm(false); setForm({ client_name:'',client_phone:'',service_name:'',preferred_date:'',preferred_time_from:'',preferred_time_to:'',notes:'' }); load(); }
    else toast.error(d.error);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(buildApiUrl(`/api/waitlist/${id}/status?status=${status}`), { method: 'PUT', credentials: 'include' });
    load();
  };

  const remove = async (id: number) => {
    await fetch(buildApiUrl(`/api/waitlist/${id}`), { method: 'DELETE', credentials: 'include' });
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock size={22} className="text-yellow-500" /> Лист ожидания
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Клиенты, ожидающие свободного слота</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Добавить</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats[k] || 0}</p>
            <p className="text-xs text-gray-500">{v.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Новая запись в очередь</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Имя клиента</label>
              <Input value={form.client_name} onChange={e => setForm(p => ({...p,client_name:e.target.value}))} placeholder="Имя" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label>
              <Input value={form.client_phone} onChange={e => setForm(p => ({...p,client_phone:e.target.value}))} placeholder="+7..." /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Услуга</label>
              <Input value={form.service_name} onChange={e => setForm(p => ({...p,service_name:e.target.value}))} placeholder="Название услуги" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Желаемая дата</label>
              <Input type="date" value={form.preferred_date} onChange={e => setForm(p => ({...p,preferred_date:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Время с</label>
              <Input type="time" value={form.preferred_time_from} onChange={e => setForm(p => ({...p,preferred_time_from:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Время до</label>
              <Input type="time" value={form.preferred_time_to} onChange={e => setForm(p => ({...p,preferred_time_to:e.target.value}))} /></div>
          </div>
          <Input value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} placeholder="Примечания" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={add}>Добавить в очередь</Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Clock size={36} className="mx-auto mb-2 opacity-30" /><p>Лист ожидания пуст</p></div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{e.client_name || '—'}</span>
                  {e.client_phone && <span className="text-sm text-gray-500 flex items-center gap-1"><Phone size={11} />{e.client_phone}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[e.status]?.color || 'bg-gray-100'}`}>
                    {STATUS_LABELS[e.status]?.label || e.status}
                  </span>
                </div>
                {e.service_name && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Scissors size={11} />{e.service_name}</p>}
                {e.preferred_date && <p className="text-xs text-gray-400 mt-0.5">📅 {e.preferred_date} {e.preferred_time_from && `${e.preferred_time_from}${e.preferred_time_to ? ` — ${e.preferred_time_to}` : ''}`}</p>}
                {e.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{e.notes}</p>}
              </div>
              <div className="flex gap-1">
                {e.status === 'waiting' && (
                  <button title="Уведомить" className="p-1.5 text-blue-500 hover:text-blue-700" onClick={() => updateStatus(e.id, 'notified')}><Bell size={14} /></button>
                )}
                {e.status !== 'booked' && (
                  <button title="Записан" className="p-1.5 text-green-500 hover:text-green-700" onClick={() => updateStatus(e.id, 'booked')}><CheckCircle size={14} /></button>
                )}
                <button title="Удалить" className="p-1.5 text-gray-400 hover:text-red-600" onClick={() => remove(e.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
