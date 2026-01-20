// /frontend/src/components/shared/DateFilterDropdown.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Calendar } from 'lucide-react';

type DateFilter = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

interface DateFilterDropdownProps {
    value: DateFilter;
    onChange: (value: DateFilter) => void;
}

export function DateFilterDropdown({ value, onChange }: DateFilterDropdownProps) {
    const { t } = useTranslation('admin/dashboard');
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

    const getPeriodLabel = (period: DateFilter) => {
        switch (period) {
            case 'today':
                return t('filter_today', 'Сегодня');
            case 'yesterday':
                return t('filter_yesterday', 'Вчера');
            case 'last7days':
                return t('filter_last7days', { count: 7, defaultValue: 'Последние 7 дней' });
            case 'last30days':
                return t('filter_last30days', { count: 30, defaultValue: 'Последние 30 дней' });
            case 'thisMonth':
                return t('filter_this_month', 'Этот месяц');
            case 'lastMonth':
                return t('filter_last_month', 'Прошлый месяц');
            case 'custom':
                return t('filter_custom', 'Свой период');
            default:
                return t('filter_last30days', 'Последние 30 дней');
        }
    };

    const handleSelect = (newValue: DateFilter) => {
        onChange(newValue);
        setIsOpen(false);
    };

    const periods: DateFilter[] = ['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'custom'];

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-2 cursor-pointer py-2 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[200px]"
            >
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{getPeriodLabel(value)}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
