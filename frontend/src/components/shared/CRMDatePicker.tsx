import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';

// Import date-fns locales
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { arSA } from 'date-fns/locale/ar-SA';
import { de } from 'date-fns/locale/de';
import { fr } from 'date-fns/locale/fr';
import { hi } from 'date-fns/locale/hi';
import { kk } from 'date-fns/locale/kk';
import { pt } from 'date-fns/locale/pt';
import { ru } from 'date-fns/locale/ru';

interface CRMDatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (value: string) => void;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
    className?: string;
    required?: boolean;
    disabled?: boolean;
}

export const CRMDatePicker = ({
    value,
    onChange,
    minDate,
    maxDate,
    placeholder,
    className = '',
    required = false,
    disabled = false
}: CRMDatePickerProps) => {
    const { i18n } = useTranslation();

    const getLocale = () => {
        switch (i18n.language) {
            case 'en': return enUS;
            case 'es': return es;
            case 'ar': return arSA;
            case 'de': return de;
            case 'fr': return fr;
            case 'hi': return hi;
            case 'kk': return kk;
            case 'pt': return pt;
            default: return ru;
        }
    };

    const getPlaceholder = () => {
        if (placeholder) return placeholder;
        switch (i18n.language) {
            case 'en': return 'MM/DD/YYYY';
            case 'ru': return 'ДД/ММ/ГГГГ';
            case 'es': return 'DD/MM/AAAA';
            case 'ar': return 'YYYY/MM/DD';
            case 'de': return 'TT.MM.JJJJ';
            case 'fr': return 'JJ/MM/AAAA';
            case 'hi': return 'DD/MM/YYYY';
            case 'kk': return 'КК/АА/ЖЖЖЖ';
            case 'pt': return 'DD/MM/AAAA';
            default: return 'DD/MM/YYYY';
        }
    };

    const handleChange = (date: Date | null) => {
        if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            onChange(`${year}-${month}-${day}`);
        } else {
            onChange('');
        }
    };

    // Создаем кастомный инпут для соответствия стилям CRM
    const CustomInput = forwardRef(({ value, onClick, placeholder }: any, ref: any) => (
        <input
            className={`w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl !text-[12px] !font-normal focus:outline-none focus:ring-2 focus:ring-pink-500/10 transition-all ${className}`}
            onClick={onClick}
            value={value}
            placeholder={placeholder}
            ref={ref}
            readOnly
            required={required}
            disabled={disabled}
        />
    ));

    return (
        <div className="crm-datepicker-wrapper relative w-full">
            <DatePicker
                selected={value ? new Date(value) : null}
                onChange={handleChange}
                minDate={minDate}
                maxDate={maxDate}
                dateFormat="dd/MM/yyyy"
                locale={getLocale()}
                placeholderText={getPlaceholder()}
                customInput={<CustomInput />}
                popperPlacement="bottom-start"
                popperClassName="crm-calendar-popper"
            />
        </div>
    );
};
