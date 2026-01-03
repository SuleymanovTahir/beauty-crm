// /frontend/src/components/shared/DropdownButton.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
  onClick: () => void;
}

interface DropdownButtonProps {
  label: string;
  icon?: React.ReactNode;
  options: DropdownOption[];
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function DropdownButton({
  label,
  icon,
  options,
  disabled = false,
  loading = false,
  variant = 'outline',
  className = ''
}: DropdownButtonProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseStyles = 'relative inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm';
  const variantStyles = {
    default: 'bg-pink-600 text-white hover:bg-pink-700',
    outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100'
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${className} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
      >
        {icon}
        <span>{loading ? t('loading') : label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
          {options.map((option, index) => (
            <button
              key={option.value}
              onClick={() => {
                option.onClick();
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${index < options.length - 1 ? 'border-b border-gray-100' : ''
                }`}
            >
              {option.icon}
              <span className={`text-sm ${option.color || 'text-gray-900'}`}>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}