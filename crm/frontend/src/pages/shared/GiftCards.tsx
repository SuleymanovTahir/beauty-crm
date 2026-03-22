import { useEffect, useState } from 'react';
import { Gift, Plus, Copy, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { buildApiUrl } from '../../api/client';

interface Card { id:number; code:string; amount:number; balance:number; issued_to?:string; valid_until?:string; is_active:boolean; created_at:string; purchased_by_client?:string; notes?:string; }

export default function GiftCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [validCard, setValidCard] = useState<Card | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ amount:'', issued_to:'', valid_until:'', notes:'' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/gift-cards?active_only=false'), { credentials:'include' });
      const d = await res.json(); setCards(d.cards || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.amount) { toast.error('Укажите сумму'); return; }
    const res = await fetch(buildApiUrl('/api/gift-cards'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...form, amount:+form.amount}),
    });
    const d = await res.json();
    if (d.success) { toast.success(`Сертификат создан: ${d.code}`); setShowForm(false); load(); }
    else toast.error(d.error);
  };

  const validate = async () => {
    if (!redeemCode) return;
    const res = await fetch(buildApiUrl(`/api/gift-cards/validate?code=${redeemCode}`), { credentials:'include' });
    const d = await res.json();
    if (d.valid) { setValidCard(d.card); toast.success(`Баланс: ${d.card.balance} ₽`); }
    else { toast.error(d.error); setValidCard(null); }
  };

  const redeem = async () => {
    if (!redeemAmount || !redeemCode) return;
    const res = await fetch(buildApiUrl('/api/gift-cards/redeem'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code:redeemCode, amount:+redeemAmount }),
    });
    const d = await res.json();
    if (d.success) { toast.success(`Списано ${d.amount_used} ₽. Остаток: ${d.remaining_balance} ₽`); setRedeemCode(''); setRedeemAmount(''); setValidCard(null); load(); }
    else toast.error(d.error);
  };

  const deactivate = async (id:number) => {
    await fetch(buildApiUrl(`/api/gift-cards/${id}/deactivate`), { method:'PATCH', credentials:'include' });
    load();
  };

  const copy = (code:string) => { navigator.clipboard.writeText(code); toast.success('Код скопирован'); };

  const filtered = cards.filter(c => !search || c.code.includes(search.toUpperCase()) || (c.issued_to||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Gift size={22} className="text-pink-500" /> Подарочные сертификаты
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Создать</Button>
        </div>
      </div>

      {/* Redeem */}
      <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-800 p-4">
        <h3 className="font-semibold text-pink-800 dark:text-pink-200 mb-3">Погасить сертификат</h3>
        <div className="flex gap-2 flex-wrap">
          <Input className="w-52" placeholder="Код сертификата" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} />
          <Button variant="outline" onClick={validate}>Проверить</Button>
          {validCard && <>
            <Input className="w-32" type="number" placeholder="Сумма" value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} />
            <Button onClick={redeem} className="bg-pink-600 hover:bg-pink-700">Списать</Button>
          </>}
        </div>
        {validCard && (
          <p className="text-sm text-pink-700 dark:text-pink-300 mt-2">
            ✓ Сертификат действителен · Баланс: <strong>{validCard.balance} ₽</strong>
            {validCard.issued_to && ` · Кому: ${validCard.issued_to}`}
          </p>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="font-semibold">Новый сертификат</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Сумма (₽) *</label><Input type="number" value={form.amount} onChange={e => setForm(p => ({...p,amount:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Кому выдан</label><Input value={form.issued_to} onChange={e => setForm(p => ({...p,issued_to:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Действителен до</label><Input type="date" value={form.valid_until} onChange={e => setForm(p => ({...p,valid_until:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Примечание</label><Input value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={create}>Создать</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
        <Input className="pl-8" placeholder="Поиск по коду..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {loading ? <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => (
            <div key={c.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${!c.is_active ? 'opacity-60 border-gray-200' : 'border-pink-200 dark:border-pink-800'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-pink-600 dark:text-pink-400 text-sm">{c.code}</code>
                  <button className="text-gray-400 hover:text-gray-700" onClick={() => copy(c.code)}><Copy size={12} /></button>
                </div>
                <Badge className={c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {c.is_active ? 'Активен' : 'Погашен'}
                </Badge>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.balance} ₽</p>
                  {c.balance !== c.amount && <p className="text-xs text-gray-500">из {c.amount} ₽</p>}
                </div>
                <div className="text-right text-xs text-gray-500">
                  {c.issued_to && <p>{c.issued_to}</p>}
                  {c.valid_until && <p>до {c.valid_until}</p>}
                </div>
              </div>
              {c.is_active && (
                <button className="text-xs text-gray-400 hover:text-red-600 mt-2" onClick={() => deactivate(c.id)}>Деактивировать</button>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-center py-8 text-gray-400">Сертификатов нет</div>}
        </div>
      )}
    </div>
  );
}
