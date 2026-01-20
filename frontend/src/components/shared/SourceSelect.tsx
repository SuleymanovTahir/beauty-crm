// /frontend/src/components/shared/SourceSelect.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Instagram, MessageCircle, User, Link, ChevronDown, Plus, Check } from 'lucide-react';

interface SourceSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function SourceSelect({ value, onChange }: SourceSelectProps) {
    const { t } = useTranslation(['admin/bookings', 'common', 'components']);
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsAdding(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sources = [
        { id: 'manual', label: t('admin/bookings:source.manual'), icon: <User className="w-3.5 h-3.5" /> },
        { id: 'instagram', label: t('admin/bookings:source.instagram'), icon: <Instagram className="w-3.5 h-3.5 text-pink-500" /> },
        { id: 'telegram', label: t('admin/bookings:source.telegram'), icon: <Send className="w-3.5 h-3.5 text-blue-500" /> },
        { id: 'whatsapp', label: t('admin/bookings:source.whatsapp'), icon: <MessageCircle className="w-3.5 h-3.5 text-green-500" /> },
        { id: 'account', label: t('admin/bookings:source.account'), icon: <User className="w-3.5 h-3.5 text-indigo-500" /> },
        { id: 'guest_link', label: t('admin/bookings:source.guest_link'), icon: <Link className="w-3.5 h-3.5 text-gray-500" /> },
    ];

    const currentSource = sources.find(s => s.id === value) || { id: value, label: value || t('admin/bookings:source.manual'), icon: <Send className="w-3.5 h-3.5 text-gray-400" /> };

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
    };

    const handleAddCustom = () => {
        if (customValue.trim()) {
            onChange(customValue.trim());
            setCustomValue('');
            setIsAdding(false);
            setIsOpen(false);
        }
    };

    const getSourceColor = (sourceId: string) => {
        const colors: Record<string, string> = {
            manual: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
            instagram: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
            telegram: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
            whatsapp: 'bg-green-100 text-green-800 hover:bg-green-200',
            account: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
            guest_link: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        };
        return colors[sourceId] || 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ring-1 ring-gray-200 hover:ring-2 hover:ring-offset-1 hover:ring-gray-200 w-fit ${getSourceColor(value)}`}
            >
                <div className="shrink-0">{currentSource.icon}</div>
                <span className="truncate">{currentSource.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-50 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {
                isOpen && (
                    <div className="absolute top-full left-0 mt-1 min-w-[140px] w-auto bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                            {sources.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSelect(s.id)}
                                    className={`flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${value === s.id ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-50">{s.icon}</div>
                                        <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                                    </div>
                                    {value === s.id && <Check className="w-3 h-3 text-blue-500" />}
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 mt-1 pt-1 mx-2 mb-1">
                            {isAdding ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={customValue}
                                        onChange={(e) => setCustomValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                                        placeholder={t('admin/bookings:source.custom_placeholder')}
                                        className="flex-1 text-[10px] px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={handleAddCustom}
                                        className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setIsAdding(true)}
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg text-blue-600 transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('admin/bookings:source.custom')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}
