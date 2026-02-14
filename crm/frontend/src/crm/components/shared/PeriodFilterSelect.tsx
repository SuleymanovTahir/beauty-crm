// /frontend/src/components/shared/PeriodFilterSelect.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Calendar } from 'lucide-react';

interface PeriodFilterSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function PeriodFilterSelect({ value, onChange }: PeriodFilterSelectProps) {
    const { t } = useTranslation(['common', 'admin/clients']);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getPeriodLabel = (period: string) => {
        const applyCountInterpolation = (value: string, count: number) => {
            return value.replace(/\{\{\s*count\s*\}\}/g, String(count));
        };

        const getCountPeriodLabel = (key: string, count: number, fallbackTemplate: string) => {
            const translated = t(key, { count, defaultValue: fallbackTemplate });
            const periodFallback = t('common:for_period', { defaultValue: '' });
            if (translated.trim().toLowerCase() === periodFallback.trim().toLowerCase() && periodFallback.trim().length > 0) {
                return applyCountInterpolation(fallbackTemplate, count);
            }
            return applyCountInterpolation(translated, count);
        };

        switch (period) {
            case 'all':
                return t('common:all_periods', 'Все периоды');
            case 'today':
                return t('common:today', 'Сегодня');
            case '7':
                return getCountPeriodLabel('common:last_7_days', 7, 'Последние {{count}} дней');
            case '14':
                return getCountPeriodLabel('common:last_14_days', 14, 'Последние {{count}} дней');
            case '30':
                return getCountPeriodLabel('common:last_7_days', 30, 'Последние {{count}} дней');
            case '90':
                return getCountPeriodLabel('common:last_3_months', 3, 'Последние {{count}} месяца');
            default:
                return t('common:all_periods', 'Все периоды');
        }
    };

    const handleSelect = (newValue: string) => {
        onChange(newValue);
        setIsOpen(false);
    };

    const periods = ['all', 'today', '7', '14', '30', '90'];

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-2 cursor-pointer h-[42px] px-2.5 sm:px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all w-full shadow-sm"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-gray-700 truncate">{getPeriodLabel(value)}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {periods.map((period) => (
                        <div
                            key={period}
                            onClick={() => handleSelect(period)}
                            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${value === period ? 'bg-pink-50 text-pink-600 font-medium' : 'text-gray-900'
                                }`}
                        >
                            <span>{getPeriodLabel(period)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
