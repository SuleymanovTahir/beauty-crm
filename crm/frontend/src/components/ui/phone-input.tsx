// /frontend/src/components/ui/phone-input.tsx
import React, { useEffect, useState } from 'react';
import { PhoneInput as ReactPhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { detectCountry as detectBrowserCountry } from '@crm/utils/languageDetection';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '',
  className = ''
}) => {
  const [defaultCountry, setDefaultCountry] = useState<string>('ae'); // Default to UAE

  useEffect(() => {
    // Auto-detect country based on user's location
    const resolveDefaultCountry = async () => {
      try {
        const countryCode = (await detectBrowserCountry())?.toLowerCase();

        if (countryCode) {
          setDefaultCountry(countryCode);
        }
      } catch (_error) {
        // Keep the initial default country when browser context is insufficient.
      }
    };

    // Only detect country if no value is provided
    if (!value || value === '' || value === '+971') {
      resolveDefaultCountry();
    }
  }, []);

  return (
    <div className={className}>
      <ReactPhoneInput
        defaultCountry={defaultCountry}
        value={value}
        onChange={(phone) => onChange(phone)}
        disabled={disabled}
        placeholder={placeholder}
        inputClassName="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
};
