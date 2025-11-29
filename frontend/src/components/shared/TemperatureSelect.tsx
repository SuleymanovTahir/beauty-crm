// /frontend/src/components/shared/TemperatureSelect.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Snowflake, ChevronDown, Sun } from 'lucide-react';

interface TemperatureSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function TemperatureSelect({ value, onChange }: TemperatureSelectProps) {
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
                    label: t('select_temperature'),
                    icon: null,
                    color: 'text-gray-400'
                };
        }
    };

    const currentConfig = getTemperatureConfig(value);

    const handleSelect = (newValue: string) => {
        onChange(newValue);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-gray-50 transition-colors ${currentConfig.color}`}
            >
                {currentConfig.icon}
                <span className="text-sm font-medium">{currentConfig.label}</span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSelect('hot');
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-900"
                    >
                        <Flame className="w-4 h-4" style={{ color: '#ef4444', fill: '#ef4444' }} />
                        <span>{t('hot')}</span>
                    </div>
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSelect('warm');
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-900"
                    >
                        <Sun className="w-4 h-4" style={{ color: '#f97316' }} />
                        <span>{t('warm')}</span>
                    </div>
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSelect('cold');
                        }}
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
