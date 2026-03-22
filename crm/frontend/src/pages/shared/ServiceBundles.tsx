import { useEffect, useState } from 'react';
import { Layers, Plus, Tag, Clock, RefreshCw, Check, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { buildApiUrl } from '@crm/api/client';

interface Bundle { id:number; name:string; description?:string; price:number; original_price?:number; sessions_count:number; valid_days:number; category:string; is_active:boolean; services:any[]; }

export default function ServiceBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', price:'', original_price:'', sessions_count:'1', valid_days:'365', category:'general', selectedServices:[] as {service_id:number,sessions:number}[] });

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(buildApiUrl('/api/service-bundles?active_only=false'), { credentials:'include' }),
        fetch(buildApiUrl('/api/services'), { credentials:'include' }),
      ]);
      const d1 = await r1.json(); setBundles(d1.bundles || []);
      const d2 = await r2.json(); setServices(d2.services || d2 || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id:number) => {
    await fetch(buildApiUrl(`/api/service-bundles/${id}/toggle`), { method:'PATCH', credentials:'include' });
    load();
  };

  const save = async () => {
    if (!form.name || !form.price) { toast.error('Заполните название и цену'); return; }
    const res = await fetch(buildApiUrl('/api/service-bundles'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        name:form.name, description:form.description, price:+form.price,
        original_price:form.original_price?+form.original_price:undefined,
        sessions_count:+form.sessions_count, valid_days:+form.valid_days,
        category:form.category, services:form.selectedServices,
      }),
    });
    const d = await res.json();
    if (d.success) { toast.success('Пакет создан'); setShowForm(false); load(); }
    else toast.error(d.error);
  };

  const addService = (svcId: number) => {
    if (form.selectedServices.find(s => s.service_id === svcId)) return;
    setForm(p => ({...p, selectedServices:[...p.selectedServices,{service_id:svcId,sessions:1}]}));
  };

  const removeService = (svcId:number) => setForm(p => ({...p,selectedServices:p.selectedServices.filter(s=>s.service_id!==svcId)}));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Layers size={22} className="text-teal-500" /> Пакеты услуг
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Пакет</Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-semibold">Новый пакет</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Название *</label><Input value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Категория</label><Input value={form.category} onChange={e => setForm(p => ({...p,category:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Цена (₽) *</label><Input type="number" value={form.price} onChange={e => setForm(p => ({...p,price:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Цена до скидки</label><Input type="number" value={form.original_price} onChange={e => setForm(p => ({...p,original_price:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Кол-во сеансов</label><Input type="number" value={form.sessions_count} onChange={e => setForm(p => ({...p,sessions_count:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Срок (дней)</label><Input type="number" value={form.valid_days} onChange={e => setForm(p => ({...p,valid_days:e.target.value}))} /></div>
            <div className="col-span-2 md:col-span-3"><label className="text-xs text-gray-500 mb-1 block">Описание</label><Input value={form.description} onChange={e => setForm(p => ({...p,description:e.target.value}))} /></div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Услуги в пакете</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.selectedServices.map(s => {
                const svc = services.find((x:any) => x.id === s.service_id);
                return (
                  <div key={s.service_id} className="flex items-center gap-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full px-3 py-1 text-xs">
                    {svc?.name || s.service_id}
                    <button onClick={() => removeService(s.service_id)}><X size={11} /></button>
                  </div>
                );
              })}
            </div>
            <select className="border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              onChange={e => { if(e.target.value) addService(+e.target.value); e.target.value=''; }}>
              <option value="">Добавить услугу...</option>
              {services.filter((s:any) => !form.selectedServices.find(x => x.service_id===s.id)).map((s:any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={save}>Создать</Button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles.map(b => (
            <div key={b.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${b.is_active ? 'border-teal-200 dark:border-teal-800' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{b.name}</h3>
                <button onClick={() => toggle(b.id)}>
                  <Badge className={b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {b.is_active ? 'Активен' : 'Скрыт'}
                  </Badge>
                </button>
              </div>
              {b.description && <p className="text-sm text-gray-500 mb-2">{b.description}</p>}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-teal-600">{b.price} ₽</span>
                {b.original_price && b.original_price > b.price && (
                  <span className="text-sm text-gray-400 line-through">{b.original_price} ₽</span>
                )}
                {b.original_price && b.original_price > b.price && (
                  <Badge className="bg-red-100 text-red-700 text-xs">-{Math.round((1-b.price/b.original_price)*100)}%</Badge>
                )}
              </div>
              <div className="flex gap-3 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1"><Check size={11} className="text-teal-500" />{b.sessions_count} сеансов</span>
                <span className="flex items-center gap-1"><Clock size={11} className="text-teal-500" />{b.valid_days} дней</span>
                <span className="flex items-center gap-1"><Tag size={11} />{b.category}</span>
              </div>
              {b.services?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {b.services.map((s:any) => (
                    <span key={s.service_id} className="text-xs bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                      {s.service_name} ×{s.sessions}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {bundles.length === 0 && <div className="col-span-2 text-center py-8 text-gray-400">Пакеты услуг не созданы</div>}
        </div>
      )}
    </div>
  );
}
