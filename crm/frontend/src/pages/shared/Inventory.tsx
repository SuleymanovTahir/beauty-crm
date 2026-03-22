import { useEffect, useState } from 'react';
import { Package, Plus, AlertTriangle, TrendingUp, TrendingDown, History, RefreshCw, Search, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { buildApiUrl } from '../../api/client';

interface Item {
  id: number; name: string; sku?: string; category: string; unit: string;
  quantity: number; min_quantity: number; cost_price: number; sale_price: number;
  supplier?: string; notes?: string; is_active: boolean;
}

interface Summary { total_items: number; low_stock: number; total_cost_value: number; total_sale_value: number; }

export default function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [txForm, setTxForm] = useState<{ itemId: number | null; type: string; qty: string; reason: string }>({ itemId: null, type: 'income', qty: '', reason: '' });
  const [form, setForm] = useState({ name:'',sku:'',category:'general',unit:'шт',quantity:'0',min_quantity:'0',cost_price:'0',sale_price:'0',supplier:'',notes:'' });

  const load = async () => {
    setLoading(true);
    try {
      const url = `/api/inventory?${lowStock ? 'low_stock=true' : ''}`;
      const [r1, r2] = await Promise.all([
        fetch(buildApiUrl(url), { credentials: 'include' }),
        fetch(buildApiUrl('/api/inventory/report/summary'), { credentials: 'include' }),
      ]);
      const d1 = await r1.json(); setItems(d1.items || []);
      const d2 = await r2.json(); setSummary(d2);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [lowStock]);

  const save = async () => {
    const res = await fetch(buildApiUrl('/api/inventory'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, quantity: +form.quantity, min_quantity: +form.min_quantity, cost_price: +form.cost_price, sale_price: +form.sale_price }),
    });
    const d = await res.json();
    if (d.success) { toast.success('Товар добавлен'); setShowForm(false); load(); }
    else toast.error(d.error);
  };

  const addTx = async () => {
    if (!txForm.itemId || !txForm.qty) return;
    const res = await fetch(buildApiUrl('/api/inventory/transaction'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: txForm.itemId, type: txForm.type, quantity: +txForm.qty, reason: txForm.reason }),
    });
    const d = await res.json();
    if (d.success) { toast.success('Операция записана'); setTxForm({ itemId:null,type:'income',qty:'',reason:'' }); load(); }
    else toast.error(d.error);
  };

  const deleteItem = async (id: number) => {
    await fetch(buildApiUrl(`/api/inventory/${id}`), { method: 'DELETE', credentials: 'include' });
    load();
  };

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package size={22} className="text-orange-500" /> Склад
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Товар</Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Позиций', value: summary.total_items, icon: Package, color:'blue' },
            { label:'Мало на складе', value: summary.low_stock, icon: AlertTriangle, color:'red' },
            { label:'Стоимость (себест.)', value: `${summary.total_cost_value?.toLocaleString()} ₽`, icon: TrendingDown, color:'gray' },
            { label:'Стоимость (продажа)', value: `${summary.total_sale_value?.toLocaleString()} ₽`, icon: TrendingUp, color:'green' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
              <s.icon size={20} className={`text-${s.color}-500`} />
              <div><p className="text-xs text-gray-500">{s.label}</p><p className="font-bold text-gray-900 dark:text-white">{s.value}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <Input className="pl-8" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={lowStock ? 'default' : 'outline'} size="sm" onClick={() => setLowStock(!lowStock)}>
          <AlertTriangle size={13} /> Мало
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="font-semibold">Новый товар</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[['name','Название *'],['sku','Артикул'],['category','Категория'],['unit','Ед. изм.'],['quantity','Количество'],['min_quantity','Мин. остаток'],['cost_price','Себестоимость'],['sale_price','Цена продажи'],['supplier','Поставщик']].map(([k,l]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 mb-1 block">{l}</label>
                <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={save}>Сохранить</Button>
          </div>
        </div>
      )}

      {/* Transaction form */}
      {txForm.itemId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 space-y-3">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200">Операция со складом</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тип</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                value={txForm.type} onChange={e => setTxForm(p => ({...p,type:e.target.value}))}>
                <option value="income">Приход</option>
                <option value="expense">Расход</option>
                <option value="adjustment">Корректировка</option>
                <option value="write_off">Списание</option>
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Количество</label>
              <Input type="number" value={txForm.qty} onChange={e => setTxForm(p => ({...p,qty:e.target.value}))} /></div>
            <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Причина</label>
              <Input value={txForm.reason} onChange={e => setTxForm(p => ({...p,reason:e.target.value}))} placeholder="Причина..." /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setTxForm({ itemId:null,type:'income',qty:'',reason:'' })}>Отмена</Button>
            <Button onClick={addTx}>Провести</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500">
              <tr>{['Название','Категория','Остаток','Ед.','Мин.','Себест.','Продажа',''].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const low = item.quantity <= item.min_quantity && item.min_quantity > 0;
                return (
                  <tr key={item.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {item.name}{item.sku && <span className="text-xs text-gray-400 ml-1">({item.sku})</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${low ? 'text-red-600' : 'text-green-600'}`}>{item.quantity}</span>
                      {low && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3 text-gray-500">{item.min_quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{item.cost_price} ₽</td>
                    <td className="px-4 py-3 text-gray-500">{item.sale_price} ₽</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1 text-blue-500 hover:text-blue-700" title="Операция" onClick={() => setTxForm(p => ({...p,itemId:item.id}))}>
                          <History size={14} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600" onClick={() => deleteItem(item.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400">Товары не найдены</div>}
        </div>
      )}
    </div>
  );
}
