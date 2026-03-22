import { useEffect, useState } from 'react';
import { Package, Plus, AlertTriangle, TrendingUp, TrendingDown, History, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { buildApiUrl } from '@crm/api/client';

interface Item {
  id: number; name: string; sku?: string; category: string; unit: string;
  quantity: number; min_quantity: number; cost_price: number; sale_price: number;
  supplier?: string; notes?: string; is_active: boolean;
}

interface Summary { total_items: number; low_stock: number; total_cost_value: number; total_sale_value: number; }

export default function Inventory() {
  const { t } = useTranslation(['common', 'layouts/mainlayout']);
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
      const d1 = await r1.json(); setItems(d1.items ?? []);
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
    if (d.success) { toast.success(t('inventory_item_added', { defaultValue: 'Товар добавлен' })); setShowForm(false); load(); }
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
    if (d.success) { toast.success(t('inventory_transaction_saved', { defaultValue: 'Операция записана' })); setTxForm({ itemId:null,type:'income',qty:'',reason:'' }); load(); }
    else toast.error(d.error);
  };

  const deleteItem = async (id: number) => {
    await fetch(buildApiUrl(`/api/inventory/${id}`), { method: 'DELETE', credentials: 'include' });
    load();
  };

  const filtered = items.filter(
    (item) =>
      search.length === 0
      || item.name.toLowerCase().includes(search.toLowerCase())
      || (item.sku ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const transactionTypeOptions = [
    { value: 'income', label: t('inventory_transaction_income', { defaultValue: 'Приход' }) },
    { value: 'expense', label: t('inventory_transaction_expense', { defaultValue: 'Расход' }) },
    { value: 'adjustment', label: t('inventory_transaction_adjustment', { defaultValue: 'Корректировка' }) },
    { value: 'write_off', label: t('inventory_transaction_write_off', { defaultValue: 'Списание' }) },
  ];

  const itemFieldLabels: Array<[keyof typeof form, string]> = [
    ['name', t('inventory_field_name', { defaultValue: 'Название *' })],
    ['sku', t('inventory_field_sku', { defaultValue: 'Артикул' })],
    ['category', t('inventory_field_category', { defaultValue: 'Категория' })],
    ['unit', t('inventory_field_unit', { defaultValue: 'Ед. изм.' })],
    ['quantity', t('inventory_field_quantity', { defaultValue: 'Количество' })],
    ['min_quantity', t('inventory_field_min_quantity', { defaultValue: 'Мин. остаток' })],
    ['cost_price', t('inventory_field_cost_price', { defaultValue: 'Себестоимость' })],
    ['sale_price', t('inventory_field_sale_price', { defaultValue: 'Цена продажи' })],
    ['supplier', t('inventory_field_supplier', { defaultValue: 'Поставщик' })],
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package size={22} className="text-orange-500" /> {t('layouts/mainlayout:menu.inventory')}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> {t('inventory_add_item_button', { defaultValue: 'Товар' })}</Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('inventory_summary_items', { defaultValue: 'Позиций' }), value: summary.total_items, icon: Package, color:'blue' },
            { label: t('inventory_summary_low_stock', { defaultValue: 'Мало на складе' }), value: summary.low_stock, icon: AlertTriangle, color:'red' },
            { label: t('inventory_summary_cost_value', { defaultValue: 'Стоимость (себест.)' }), value: `${summary.total_cost_value?.toLocaleString()} ₽`, icon: TrendingDown, color:'gray' },
            { label: t('inventory_summary_sale_value', { defaultValue: 'Стоимость (продажа)' }), value: `${summary.total_sale_value?.toLocaleString()} ₽`, icon: TrendingUp, color:'green' },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
              <card.icon size={20} className={`text-${card.color}-500`} />
              <div><p className="text-xs text-gray-500">{card.label}</p><p className="font-bold text-gray-900 dark:text-white">{card.value}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <Input className="pl-8" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={lowStock ? 'default' : 'outline'} size="sm" onClick={() => setLowStock(!lowStock)}>
          <AlertTriangle size={13} /> {t('inventory_low_stock_short', { defaultValue: 'Мало' })}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="font-semibold">{t('inventory_new_item', { defaultValue: 'Новый товар' })}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {itemFieldLabels.map(([fieldKey, label]) => (
              <div key={fieldKey}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <Input value={form[fieldKey]} onChange={e => setForm(p => ({...p,[fieldKey]:e.target.value}))} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button onClick={save}>{t('save')}</Button>
          </div>
        </div>
      )}

      {/* Transaction form */}
      {txForm.itemId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 space-y-3">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200">{t('inventory_transaction_title', { defaultValue: 'Операция со складом' })}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t('inventory_transaction_type', { defaultValue: 'Тип' })}</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                value={txForm.type} onChange={e => setTxForm(p => ({...p,type:e.target.value}))}>
                {transactionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('inventory_field_quantity', { defaultValue: 'Количество' })}</label>
              <Input type="number" value={txForm.qty} onChange={e => setTxForm(p => ({...p,qty:e.target.value}))} /></div>
            <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">{t('inventory_reason_label', { defaultValue: 'Причина' })}</label>
              <Input value={txForm.reason} onChange={e => setTxForm(p => ({...p,reason:e.target.value}))} placeholder={t('inventory_reason_placeholder', { defaultValue: 'Причина...' })} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setTxForm({ itemId:null,type:'income',qty:'',reason:'' })}>{t('cancel')}</Button>
            <Button onClick={addTx}>{t('inventory_submit_transaction', { defaultValue: 'Провести' })}</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm whitespace-normal min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500">
              <tr>{[
                t('name'),
                t('inventory_field_category', { defaultValue: 'Категория' }),
                t('inventory_column_stock', { defaultValue: 'Остаток' }),
                t('inventory_column_unit', { defaultValue: 'Ед.' }),
                t('inventory_column_min', { defaultValue: 'Мин.' }),
                t('inventory_column_cost', { defaultValue: 'Себест.' }),
                t('inventory_column_sale', { defaultValue: 'Продажа' }),
                '',
              ].map((heading) => <th key={heading} className="px-4 py-3 text-left font-medium">{heading}</th>)}</tr>
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
                        <button className="p-1 text-blue-500 hover:text-blue-700" title={t('inventory_action_transaction', { defaultValue: 'Операция' })} onClick={() => setTxForm(p => ({...p,itemId:item.id}))}>
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
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400">{t('inventory_empty', { defaultValue: 'Товары не найдены' })}</div>}
        </div>
      )}
    </div>
  );
}
