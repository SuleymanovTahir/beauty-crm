import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Trash2, Plus, Loader2, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Currency {
    code: string;
    name: string;
    symbol: string;
    is_active: boolean;
}

interface ManageCurrenciesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ManageCurrenciesDialog({ open, onOpenChange, onSuccess }: ManageCurrenciesDialogProps) {
    const { t } = useTranslation(['admin/settings', 'common']);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    const [newCurrency, setNewCurrency] = useState({
        code: '',
        name: '',
        symbol: ''
    });
    const [editingCurrencyCode, setEditingCurrencyCode] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            loadCurrencies();
        }
    }, [open]);

    const loadCurrencies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/settings/currencies');
            setCurrencies(response.currencies || []);
        } catch (error) {
            console.error('Failed to load currencies:', error);
            toast.error(t('error_loading_currencies'));
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
            toast.error(t('fill_currency_fields'));
            return;
        }

        try {
            setAdding(true);
            await api.post('/api/settings/currencies', newCurrency);
            toast.success(editingCurrencyCode ? t('currency_updated') : t('currency_added'));
            setNewCurrency({ code: '', name: '', symbol: '' });
            setEditingCurrencyCode(null);
            await loadCurrencies();
            onSuccess();
        } catch (error) {
            console.error('Failed to add currency:', error);
            toast.error(t('error_adding_currency'));
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (code: string) => {
        if (!confirm(t('delete_currency_confirm'))) return;
        try {
            await api.delete(`/api/settings/currencies/${code}`);
            toast.success(t('currency_deleted'));
            await loadCurrencies();
            onSuccess();
        } catch (error) {
            console.error('Failed to delete currency:', error);
            toast.error(t('error_deleting_currency'));
        }
    };

    const handleEdit = (currency: Currency) => {
        setNewCurrency({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol
        });
        setEditingCurrencyCode(currency.code);
    };

    const cancelEdit = () => {
        setNewCurrency({ code: '', name: '', symbol: '' });
        setEditingCurrencyCode(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('manage_currencies_title')}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Add New Currency Form */}
                    <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-2 col-span-1">
                                <Label className="text-xs">{t('currency_code')}</Label>
                                <Input
                                    value={newCurrency.code}
                                    onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                                    placeholder={t('currency_code_placeholder')}
                                    required
                                    maxLength={3}
                                    disabled={!!editingCurrencyCode}
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <Label className="text-xs">{t('currency_symbol')}</Label>
                                <Input
                                    value={newCurrency.symbol}
                                    onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                                    placeholder={t('currency_symbol_placeholder')}
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label className="text-xs">{t('currency_name')}</Label>
                                <Input
                                    value={newCurrency.name}
                                    onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                                    placeholder={t('currency_name_placeholder')}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            {editingCurrencyCode && (
                                <Button type="button" variant="outline" onClick={cancelEdit} className="w-10 px-0 shrink-0">
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                            <Button type="submit" className="flex-1 bg-pink-600 hover:bg-pink-700" disabled={adding}>
                                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCurrencyCode ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                                {editingCurrencyCode ? t('save_changes') : t('add_currency')}
                            </Button>
                        </div>
                    </form>

                    {/* List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        <Label>{t('available_currencies')}</Label>
                        {loading ? (
                            <div className="text-center py-4 text-gray-500">{t('loading')}</div>
                        ) : currencies.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-sm">{t('no_currencies_found')}</div>
                        ) : (
                            <div className="space-y-2">
                                {currencies.map((currency) => (
                                    <div key={currency.code} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-pink-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-700 font-bold text-xs">
                                                {currency.symbol}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-gray-900">{currency.code}</div>
                                                <div className="text-xs text-gray-500">{currency.name}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => handleEdit(currency)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(currency.code)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common:close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
