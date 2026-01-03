// /frontend/src/components/shared/StatusSelect.tsx
import { Plus, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../ui/dropdown-menu";

interface StatusConfig {
  label: string;
  color: string;
}

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Record<string, StatusConfig>;
  allowAdd?: boolean;
  onAddStatus?: (key: string, label: string, color: string) => void;
  showAllOption?: boolean;
  variant?: 'default' | 'filter';
}

export function StatusSelect({ value, onChange, options, allowAdd, onAddStatus, showAllOption, variant = 'default' }: StatusSelectProps) {
  const { t } = useTranslation(['components', 'common', 'clients', 'admin/Clients']);

  const currentStatus = value === 'all'
    ? { label: t('all_statuses', 'Все') || 'Все', color: 'gray' }
    : (options[value] || { label: value, color: 'gray' });

  // Helper to get color classes because the backend might return simplified color names
  const getColorClasses = (color: string) => {
    if (color && color.includes('bg-')) return color; // Already has classes

    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
      purple: 'bg-purple-100 text-purple-800',
      pink: 'bg-pink-100 text-pink-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return colors[color] || colors.gray;
  };

  const getCircleColor = (color: string) => {
    if (!color) return 'bg-gray-400';

    // Normalize color string
    const lowerColor = color.toLowerCase();

    // Static map for tailwind JIT to see these classes
    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      orange: 'bg-orange-500',
      gray: 'bg-gray-500',
      indigo: 'bg-indigo-500',
      teal: 'bg-teal-500',
      emerald: 'bg-emerald-500',
      cyan: 'bg-cyan-500',
      amber: 'bg-amber-500',
      lime: 'bg-lime-500',
      violet: 'bg-violet-500',
      fuchsia: 'bg-fuchsia-500',
      rose: 'bg-rose-500',
      sky: 'bg-sky-500'
    };

    // 1. Check for color name in map
    for (const [name, className] of Object.entries(colorMap)) {
      if (lowerColor.includes(name)) return className;
    }

    return 'bg-gray-400';
  };

  const buttonClasses = variant === 'filter'
    ? `inline-flex items-center justify-between gap-2 px-2.5 sm:px-4 h-[42px] rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all border shadow-sm ${value === 'all'
      ? 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600 shadow-blue-100'
      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
    }`
    : `inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-pink-200 w-fit ${getColorClasses(currentStatus.color)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          onClick={(e) => e.stopPropagation()}
          className={buttonClasses}
        >
          <span className="truncate">{value === 'all' ? (t('all_statuses', 'Все') || 'Все') : currentStatus.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${value === 'all' ? 'text-blue-100' : 'opacity-50'}`} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 z-[100]">
        {showAllOption && (
          <DropdownMenuItem onClick={() => onChange('all')}>
            {t('all_statuses', 'Все') || 'Все'}
          </DropdownMenuItem>
        )}

        <div className="max-h-60 overflow-y-auto">
          {Object.entries(options).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onChange(key)}
              className="gap-2 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${getCircleColor(config.color)}`} />
              {config.label}
            </DropdownMenuItem>
          ))}
        </div>

        {allowAdd && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAddStatus?.('', '', '')}
              className="gap-2 text-pink-600 focus:text-pink-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('add_status', 'Добавить статус') || 'Добавить статус'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}