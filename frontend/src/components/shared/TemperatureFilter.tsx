// /frontend/src/components/shared/TemperatureFilter.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Snowflake, ChevronDown, Sun } from 'lucide-react';

interface TemperatureFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export function TemperatureFilter({ value, onChange }: TemperatureFilterProps) {
    const { t } = useTranslation('clients');
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

    const getTemperatureConfig = (temp: string) => {
        switch (temp) {
            case 'hot':
                return {
                    label: t('hot'),
                    icon: <Flame className="w-4 h-4" style={{ color: '#ef4444', fill: '#ef4444' }} />,
                    color: 'text-gray-900'
                };
            case 'warm':
                return {
                    label: t('warm'),
                    icon: <Sun className="w-4 h-4" style={{ color: '#f97316' }} />,
                    color: 'text-gray-900'
                };
            case 'cold':
                return {
                    label: t('cold'),
                    icon: <Snowflake className="w-4 h-4" style={{ color: '#06b6d4', fill: '#06b6d4' }} />,
                    color: 'text-gray-900'
                };
            default:
                return {
                    label: 'Темп.',
                    icon: null,
                    color: 'text-gray-600'
                };
        }
    };

    const currentConfig = getTemperatureConfig(value);

    const handleSelect = (newValue: string) => {
        onChange(newValue);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-2 cursor-pointer h-[42px] px-2.5 sm:px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all w-full shadow-sm"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="shrink-0">{currentConfig.icon}</div>
                    <span className="text-xs sm:text-sm font-bold text-gray-700 truncate">{currentConfig.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div
                        onClick={() => handleSelect('all')}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-900"
                    >
                        <span>{t('all_temperatures')}</span>
                    </div>
                    <div
                        onClick={() => handleSelect('hot')}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-900"
                    >
                        <Flame className="w-4 h-4" style={{ color: '#ef4444', fill: '#ef4444' }} />
                        <span>{t('hot')}</span>
                    </div>
                    <div
                        onClick={() => handleSelect('warm')}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-900"
                    >
                        <Sun className="w-4 h-4" style={{ color: '#f97316' }} />
                        <span className="text-gray-900">{t('warm')}</span>
                    </div>
                    <div
                        onClick={() => handleSelect('cold')}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-900"
                    >
                        <Snowflake className="w-4 h-4" style={{ color: '#06b6d4', fill: '#06b6d4' }} />
                        <span>{t('cold')}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
