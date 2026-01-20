// /frontend/src/components/shared/TemperatureSelect.tsx
import { useTranslation } from 'react-i18next';
import { Flame, Snowflake, ChevronDown, Sun } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface TemperatureSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function TemperatureSelect({ value, onChange }: TemperatureSelectProps) {
    const { t } = useTranslation(['clients', 'admin/Clients']);

    const getTemperatureConfig = (temp: string) => {
        // Default to 'warm' if value is missing
        const currentTemp = temp || 'warm';

        switch (currentTemp) {
            case 'hot':
                return {
                    label: t('hot'),
                    icon: <Flame className="w-4 h-4" style={{ color: 'var(--temp-hot)', fill: 'var(--temp-hot)' }} />,
                    color: 'text-gray-900'
                };
            case 'warm':
                return {
                    label: t('warm'),
                    icon: <Sun className="w-4 h-4" style={{ color: 'var(--temp-warm)' }} />,
                    color: 'text-gray-900'
                };
            case 'cold':
                return {
                    label: t('cold'),
                    icon: <Snowflake className="w-4 h-4" style={{ color: 'var(--temp-cold)', fill: 'var(--temp-cold)' }} />,
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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-2 cursor-pointer py-1 px-3 rounded-full hover:bg-gray-100 transition-colors w-fit border border-gray-100 ${currentConfig.color}`}
                >
                    {currentConfig.icon}
                    <span className="text-sm font-medium whitespace-nowrap">{currentConfig.label}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32 z-[100]">
                <DropdownMenuItem onClick={() => onChange('hot')} className="gap-2 cursor-pointer">
                    <Flame className="w-4 h-4" style={{ color: 'var(--temp-hot)', fill: 'var(--temp-hot)' }} />
                    <span>{t('hot')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange('warm')} className="gap-2 cursor-pointer">
                    <Sun className="w-4 h-4" style={{ color: 'var(--temp-warm)' }} />
                    <span>{t('warm')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange('cold')} className="gap-2 cursor-pointer">
                    <Snowflake className="w-4 h-4" style={{ color: 'var(--temp-cold)', fill: 'var(--temp-cold)' }} />
                    <span>{t('cold')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
