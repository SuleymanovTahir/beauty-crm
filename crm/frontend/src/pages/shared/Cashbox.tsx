import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { buildApiUrl } from '../../api/client';

interface Operation { id:number; type:string; category:string; amount:number; description?:string; payment_method:string; employee_name?:string; operation_date:string; document_number?:string; }
interface Totals { income:number; expense:number; profit:number; }

const PM_LABELS: Record<string,string> = { cash:'Наличные', card:'Карта', transfer:'Перевод', online:'Онлайн' };

export default function Cashbox() {
  const [ops, setOps] = useState<Operation[]>([]);
  const [totals, setTotals] = useState<Totals>({ income:0, expense:0, profit:0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ type:'income', category:'other_income', amount:'', description:'', payment_method:'cash', operation_date:'' });
  const [cats, setCats] = useState<{income:string[];expense:string[]}>({income:[],expense:[]});

  const load = async () => {
    setLoading(true);
    try {
      let url = '/api/cashbox?limit=300';
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      const [r1, r2] = await Promise.all([
        fetch(buildApiUrl(url), { credentials: 'include' }),
        fetch(buildApiUrl('/api/cashbox/categories'), { credentials: 'include' }),
      ]);
      const d1 = await r1.json(); setOps(d1.operations || []); setTotals(d1.totals || {income:0,expense:0,profit:0});
      const d2 = await r2.json(); setCats(d2);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [dateFrom, dateTo, typeFilter]);

  const save = async () => {
    if (!form.amount) { toast.error('Укажите сумму'); return; }
    const res = await fetch(buildApiUrl('/api/cashbox'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...form, amount:+form.amount}),
    });
    const d = await res.json();
    if (d.success) { toast.success('Операция записана'); setShowForm(false); load(); }
    else toast.error(d.error);
  };

  const remove = async (id:number) => {
    await fetch(buildApiUrl(`/api/cashbox/${id}`), { method:'DELETE', credentials:'include' });
    load();
  };

  const downloadCSV = async () => {
    let url = '/api/cashbox?format=csv&limit=10000';
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    const res = await fetch(buildApiUrl(url), { credentials:'include' });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cashbox.csv'; a.click();
  };

  const catOptions = form.type === 'income' ? cats.income : cats.expense;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet size={22} className="text-green-500" /> Касса
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download size={14} /></Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Операция</Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 font-medium">Доходы</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{totals.income?.toLocaleString()} ₽</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 font-medium">Расходы</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{totals.expense?.toLocaleString()} ₽</p>
        </div>
        <div className={`${totals.profit >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'} rounded-xl p-4 border`}>
          <p className={`text-xs font-medium ${totals.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Прибыль</p>
          <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>{totals.profit?.toLocaleString()} ₽</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input type="date" className="w-36 h-8 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="text-gray-400">—</span>
        <Input type="date" className="w-36 h-8 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {(['','income','expense'] as const).map(t => (
          <Button key={t} variant={typeFilter===t?'default':'outline'} size="sm" onClick={() => setTypeFilter(t)}>
            {t===''?'Все':t==='income'?'Доходы':'Расходы'}
          </Button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="font-semibold">Новая операция</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тип</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                value={form.type} onChange={e => setForm(p => ({...p,type:e.target.value,category:e.target.value==='income'?'other_income':'other_expense'}))}>
                <option value="income">Доход</option>
                <option value="expense">Расход</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Категория</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                value={form.category} onChange={e => setForm(p => ({...p,category:e.target.value}))}>
                {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Сумма *</label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({...p,amount:e.target.value}))} /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Способ оплаты</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                value={form.payment_method} onChange={e => setForm(p => ({...p,payment_method:e.target.value}))}>
                {Object.entries(PM_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Дата</label>
              <Input type="date" value={form.operation_date} onChange={e => setForm(p => ({...p,operation_date:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Описание</label>
              <Input value={form.description} onChange={e => setForm(p => ({...p,description:e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={save}>Сохранить</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500">
              <tr>{['Дата','Тип','Категория','Сумма','Способ','Описание',''].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {ops.map(op => (
                <tr key={op.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-gray-500">{op.operation_date}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 font-medium ${op.type==='income'?'text-green-600':'text-red-600'}`}>
                      {op.type==='income'?<TrendingUp size={13}/>:<TrendingDown size={13}/>}
                      {op.type==='income'?'Доход':'Расход'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{op.category}</td>
                  <td className={`px-4 py-3 font-semibold ${op.type==='income'?'text-green-700':'text-red-700'}`}>{op.amount?.toLocaleString()} ₽</td>
                  <td className="px-4 py-3 text-gray-500">{PM_LABELS[op.payment_method]||op.payment_method}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{op.description}</td>
                  <td className="px-4 py-3">
                    <button className="text-gray-400 hover:text-red-600" onClick={() => remove(op.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ops.length === 0 && <div className="text-center py-8 text-gray-400">Нет операций</div>}
        </div>
      )}
    </div>
  );
}
