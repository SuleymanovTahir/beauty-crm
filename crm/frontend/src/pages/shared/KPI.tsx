import { useEffect, useState } from 'react';
import { BarChart2, Plus, Trophy, Target, RefreshCw, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { buildApiUrl } from '@crm/api/client';

interface KPIRow {
  id:number; employee_id:number; employee_name:string;
  period_start:string; period_end:string; period_type:string;
  target_bookings:number; target_revenue:number; target_avg_check:number;
  bonus_threshold:number; bonus_amount:number;
  actual_bookings:number; actual_revenue:number; actual_avg_check:number; actual_clients:number;
  pct_bookings:number; pct_revenue:number; bonus_earned:number;
}

interface Leader { id:number; full_name:string; bookings:number; revenue:number; avg_check:number; unique_clients:number; rank:number; }

function Pct({ value }: { value: number }) {
  const clr = value >= 100 ? 'text-green-600' : value >= 70 ? 'text-yellow-600' : 'text-red-600';
  return <span className={`font-semibold ${clr}`}>{value}%</span>;
}

export default function KPI() {
  const { t } = useTranslation(['common', 'layouts/mainlayout']);
  const [targets, setTargets] = useState<KPIRow[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'targets'|'leaderboard'>('leaderboard');
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).toISOString().split('T')[0];
  const [periodFrom, setPeriodFrom] = useState(firstOfMonth);
  const [periodTo, setPeriodTo] = useState(lastOfMonth);
  const [form, setForm] = useState({ employee_id:'', period_start:firstOfMonth, period_end:lastOfMonth, target_bookings:'0', target_revenue:'0', bonus_threshold:'0', bonus_amount:'0' });

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(buildApiUrl(`/api/kpi?period_start=${periodFrom}&period_end=${periodTo}`), { credentials:'include' }),
        fetch(buildApiUrl(`/api/kpi/leaderboard?period_start=${periodFrom}&period_end=${periodTo}`), { credentials:'include' }),
        fetch(buildApiUrl('/api/employees'), { credentials:'include' }),
      ]);
      const d1 = await r1.json(); setTargets(d1.targets ?? []);
      const d2 = await r2.json(); setLeaders(d2.leaderboard ?? []);
      const d3 = await r3.json(); setEmployees(Array.isArray(d3) ? d3 : (d3.employees ?? []));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [periodFrom, periodTo]);

  const save = async () => {
    if (!form.employee_id) { toast.error(t('kpi_select_employee', { defaultValue: 'Выберите сотрудника' })); return; }
    const res = await fetch(buildApiUrl('/api/kpi'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, employee_id:+form.employee_id, target_bookings:+form.target_bookings, target_revenue:+form.target_revenue, bonus_threshold:+form.bonus_threshold, bonus_amount:+form.bonus_amount }),
    });
    const d = await res.json();
    if (d.success) { toast.success(t('kpi_created', { defaultValue: 'KPI создан' })); setShowForm(false); load(); }
    else toast.error(d.error);
  };

  const remove = async (id:number) => {
    await fetch(buildApiUrl(`/api/kpi/${id}`), { method:'DELETE', credentials:'include' });
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart2 size={22} className="text-indigo-500" /> {t('kpi_title', { defaultValue: 'KPI сотрудников' })}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> {t('kpi_add_target_button', { defaultValue: 'Цель' })}</Button>
        </div>
      </div>

      {/* Period */}
      <div className="flex items-center gap-2">
        <Input type="date" className="w-36 h-8 text-sm" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
        <span className="text-gray-400">-</span>
        <Input type="date" className="w-36 h-8 text-sm" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
        <div className="flex gap-1 ml-2">
          {(['leaderboard','targets'] as const).map((tabKey) => (
            <Button key={tabKey} size="sm" variant={tab===tabKey?'default':'outline'} onClick={() => setTab(tabKey)}>
              {tabKey==='leaderboard'
                ? <><Trophy size={13}/> {t('kpi_tab_leaderboard', { defaultValue: 'Рейтинг' })}</>
                : <><Target size={13}/> {t('kpi_tab_targets', { defaultValue: 'Цели' })}</>}
            </Button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="font-semibold">{t('kpi_new_target', { defaultValue: 'Новая цель KPI' })}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t('employee')}</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                value={form.employee_id} onChange={e => setForm(p => ({...p,employee_id:e.target.value}))}>
                <option value="">{t('kpi_select_employee_placeholder', { defaultValue: 'Выбрать...' })}</option>
                {employees.map((e:any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('kpi_period_from', { defaultValue: 'Период с' })}</label><Input type="date" value={form.period_start} onChange={e => setForm(p => ({...p,period_start:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('kpi_period_to', { defaultValue: 'Период до' })}</label><Input type="date" value={form.period_end} onChange={e => setForm(p => ({...p,period_end:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('kpi_target_bookings', { defaultValue: 'Цель записей' })}</label><Input type="number" value={form.target_bookings} onChange={e => setForm(p => ({...p,target_bookings:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('kpi_target_revenue', { defaultValue: 'Цель выручки (₽)' })}</label><Input type="number" value={form.target_revenue} onChange={e => setForm(p => ({...p,target_revenue:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('kpi_bonus_threshold', { defaultValue: 'Порог бонуса (₽)' })}</label><Input type="number" value={form.bonus_threshold} onChange={e => setForm(p => ({...p,bonus_threshold:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('kpi_bonus_amount', { defaultValue: 'Размер бонуса (₽)' })}</label><Input type="number" value={form.bonus_amount} onChange={e => setForm(p => ({...p,bonus_amount:e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button onClick={save}>{t('save')}</Button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div> : (
        tab === 'leaderboard' ? (
          <div className="space-y-3">
            {leaders.map(l => (
              <div key={l.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${l.rank===1?'bg-yellow-400':l.rank===2?'bg-gray-400':l.rank===3?'bg-orange-400':'bg-gray-200 text-gray-600'}`}>
                  {l.rank===1?<Trophy size={14}/>:l.rank}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{l.full_name}</p>
                  <p className="text-xs text-gray-500">{t('kpi_leaderboard_summary', { defaultValue: '{{bookings}} записей · {{clients}} клиентов', bookings: l.bookings, clients: l.unique_clients })}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{l.revenue?.toLocaleString()} ₽</p>
                  <p className="text-xs text-gray-500">{t('kpi_average_check', { defaultValue: 'ср. чек {{value}} ₽', value: Math.round(l.avg_check) })}</p>
                </div>
              </div>
            ))}
            {leaders.length === 0 && <div className="text-center py-8 text-gray-400">{t('kpi_empty_leaderboard', { defaultValue: 'Нет данных за период' })}</div>}
          </div>
        ) : (
          <div className="space-y-3">
            {targets.map((targetRow) => (
              <div key={targetRow.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{targetRow.employee_name}</p>
                    <p className="text-xs text-gray-500">{targetRow.period_start} - {targetRow.period_end}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {targetRow.bonus_earned > 0 && <Badge className="bg-yellow-100 text-yellow-700"><Star size={11} className="inline mr-0.5" />{t('kpi_bonus_badge', { defaultValue: 'Бонус {{amount}} ₽', amount: targetRow.bonus_earned })}</Badge>}
                    <button className="text-gray-400 hover:text-red-600 text-xs" onClick={() => remove(targetRow.id)} title={t('delete')}>✕</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: t('kpi_metric_bookings', { defaultValue: 'Записи' }), actual: targetRow.actual_bookings, target: targetRow.target_bookings, pct: targetRow.pct_bookings },
                    { label: t('kpi_metric_revenue', { defaultValue: 'Выручка' }), actual: `${targetRow.actual_revenue?.toLocaleString()} ₽`, target: `${targetRow.target_revenue?.toLocaleString()} ₽`, pct: targetRow.pct_revenue },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 col-span-2 md:col-span-1">
                      <p className="text-xs text-gray-500">{metric.label}</p>
                      <p className="font-bold">{metric.actual} / {metric.target}</p>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full">
                        <div className={`h-1.5 rounded-full ${metric.pct >= 100 ? 'bg-green-500' : metric.pct >= 70 ? 'bg-yellow-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(metric.pct,100)}%` }} />
                      </div>
                      <Pct value={metric.pct} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {targets.length === 0 && <div className="text-center py-8 text-gray-400">{t('kpi_empty_targets', { defaultValue: 'Нет целей за период' })}</div>}
          </div>
        )
      )}
    </div>
  );
}
