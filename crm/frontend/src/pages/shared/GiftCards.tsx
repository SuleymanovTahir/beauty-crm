import { useEffect, useState } from 'react';
import { Gift, Plus, Copy, RefreshCw, Search, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { buildApiUrl } from '@crm/api/client';

interface Card { id:number; code:string; amount:number; balance:number; issued_to?:string; valid_until?:string; is_active:boolean; created_at:string; purchased_by_client?:string; notes?:string; }

export default function GiftCards() {
  const { t } = useTranslation(['common', 'layouts/mainlayout']);
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
      const d = await res.json(); setCards(d.cards ?? []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.amount) { toast.error(t('gift_cards_amount_required', { defaultValue: 'Укажите сумму' })); return; }
    const res = await fetch(buildApiUrl('/api/gift-cards'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...form, amount:+form.amount}),
    });
    const d = await res.json();
    if (d.success) { toast.success(t('gift_cards_created', { defaultValue: 'Сертификат создан: {{code}}', code: d.code })); setShowForm(false); load(); }
    else toast.error(d.error);
  };

  const validate = async () => {
    if (!redeemCode) return;
    const res = await fetch(buildApiUrl(`/api/gift-cards/validate?code=${redeemCode}`), { credentials:'include' });
    const d = await res.json();
    if (d.valid) { setValidCard(d.card); toast.success(t('gift_cards_balance_toast', { defaultValue: 'Баланс: {{value}} ₽', value: d.card.balance })); }
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
    if (d.success) { toast.success(t('gift_cards_redeemed', { defaultValue: 'Списано {{used}} ₽. Остаток: {{remaining}} ₽', used: d.amount_used, remaining: d.remaining_balance })); setRedeemCode(''); setRedeemAmount(''); setValidCard(null); load(); }
    else toast.error(d.error);
  };

  const deactivate = async (id:number) => {
    await fetch(buildApiUrl(`/api/gift-cards/${id}/deactivate`), { method:'PATCH', credentials:'include' });
    load();
  };

  const copy = (code:string) => { navigator.clipboard.writeText(code); toast.success(t('gift_cards_code_copied', { defaultValue: 'Код скопирован' })); };

  const filtered = cards.filter(
    (card) =>
      search.length === 0
      || card.code.includes(search.toUpperCase())
      || (card.issued_to ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Gift size={22} className="text-pink-500" /> {t('layouts/mainlayout:menu.gift_cards')}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> {t('create')}</Button>
        </div>
      </div>

      {/* Redeem */}
      <div className="settings-bg-primary-light dark:bg-pink-900/20 rounded-xl border brand-border dark:border-pink-800 p-4">
        <h3 className="font-semibold text-pink-800 dark:text-pink-200 mb-3">{t('gift_cards_redeem_title', { defaultValue: 'Погасить сертификат' })}</h3>
        <div className="flex gap-2 flex-wrap">
          <Input className="w-52" placeholder={t('gift_cards_code_placeholder', { defaultValue: 'Код сертификата' })} value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} />
          <Button variant="outline" onClick={validate}>{t('gift_cards_validate', { defaultValue: 'Проверить' })}</Button>
          {validCard && <>
            <Input className="w-32" type="number" placeholder={t('crm/users:amount')} value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} />
            <Button onClick={redeem} className="settings-bg-primary settings-bg-primary-hover">{t('gift_cards_redeem_button', { defaultValue: 'Списать' })}</Button>
          </>}
        </div>
        {validCard && (
          <div className="text-sm text-pink-700 dark:text-pink-300 mt-2 flex flex-wrap items-center gap-2">
            <CheckCircle2 size={14} className="settings-text-primary dark:text-pink-300" />
            <span>{t('gift_cards_valid_card', { defaultValue: 'Сертификат действителен' })}</span>
            <strong>{t('gift_cards_balance_label', { defaultValue: 'Баланс: {{value}} ₽', value: validCard.balance })}</strong>
            {validCard.issued_to ? <span>{t('gift_cards_issued_to_value', { defaultValue: 'Кому: {{value}}', value: validCard.issued_to })}</span> : null}
          </div>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="font-semibold">{t('gift_cards_new_card', { defaultValue: 'Новый сертификат' })}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">{t('crm/users:amount')} (₽) *</label><Input type="number" value={form.amount} onChange={e => setForm(p => ({...p,amount:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('gift_cards_issued_to', { defaultValue: 'Кому выдан' })}</label><Input value={form.issued_to} onChange={e => setForm(p => ({...p,issued_to:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('gift_cards_valid_until', { defaultValue: 'Действителен до' })}</label><Input type="date" value={form.valid_until} onChange={e => setForm(p => ({...p,valid_until:e.target.value}))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">{t('gift_cards_note', { defaultValue: 'Примечание' })}</label><Input value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button onClick={create}>{t('create')}</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
        <Input className="pl-8" placeholder={t('gift_cards_search_placeholder', { defaultValue: 'Поиск по коду...' })} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {loading ? <div className="flex justify-center py-12"><RefreshCw size={22} className="animate-spin text-gray-400" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => (
            <div key={c.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${!c.is_active ? 'opacity-60 border-gray-200' : 'brand-border dark:border-pink-800'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold settings-text-primary dark:text-pink-400 text-sm">{c.code}</code>
                  <button className="text-gray-400 hover:text-gray-700" onClick={() => copy(c.code)}><Copy size={12} /></button>
                </div>
                <Badge className={c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {c.is_active
                    ? t('gift_cards_status_active', { defaultValue: 'Активен' })
                    : t('gift_cards_status_redeemed', { defaultValue: 'Погашен' })}
                </Badge>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.balance} ₽</p>
                  {c.balance !== c.amount && <p className="text-xs text-gray-500">{t('gift_cards_from_amount', { defaultValue: 'из {{value}} ₽', value: c.amount })}</p>}
                </div>
                <div className="text-right text-xs text-gray-500">
                  {c.issued_to && <p>{c.issued_to}</p>}
                  {c.valid_until && <p>{t('gift_cards_valid_until_value', { defaultValue: 'до {{value}}', value: c.valid_until })}</p>}
                </div>
              </div>
              {c.is_active && (
                <button className="text-xs text-gray-400 hover:text-red-600 mt-2" onClick={() => deactivate(c.id)}>{t('gift_cards_deactivate', { defaultValue: 'Деактивировать' })}</button>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-center py-8 text-gray-400">{t('gift_cards_empty', { defaultValue: 'Сертификатов нет' })}</div>}
        </div>
      )}
    </div>
  );
}
