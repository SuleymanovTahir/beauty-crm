// /frontend/src/components/shared/PeriodFilterSelect.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Calendar } from 'lucide-react';

interface PeriodFilterSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function PeriodFilterSelect({ value, onChange }: PeriodFilterSelectProps) {
    const { t } = useTranslation('common');
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
        switch (period) {
            case 'all':
                return t('all_periods', 'Все периоды');
            case 'today':
                return t('today', 'Сегодня');
            case '7':
                return t('last_7_days', 'Последние 7 дней');
            case '14':
                return t('last_14_days', 'Последние 14 дней');
            case '30':
                return t('last_month', 'Прошлый месяц');
            case '90':
                return t('last_3_months', 'Последние 3 месяца');
            default:
                return t('all_periods', 'Все периоды');
        }
    };

    const handleSelect = (newValue: string) => {
        onChange(newValue);
        setIsOpen(false);
    };

    const periods = ['all', 'today', '7', '14', '30', '90'];

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-2 cursor-pointer py-2 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[160px]"
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
                            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${
                                value === period ? 'bg-pink-50 text-pink-600 font-medium' : 'text-gray-900'
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
