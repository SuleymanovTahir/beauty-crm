import { useState, useRef, useEffect } from 'react';
import { usePhoneInput, defaultCountries, parseCountry, FlagImage } from 'react-international-phone';
import { Search, ChevronDown } from 'lucide-react';
import 'react-international-phone/style.css';

interface PhoneInputWithSearchProps {
    value: string;
    onChange: (phone: string) => void;
    defaultCountry?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    error?: boolean;
}

export function PhoneInputWithSearch({
    value,
    onChange,
    defaultCountry = 'ae',
    placeholder = '',
    searchPlaceholder = 'Поиск страны...',
    error = false
}: PhoneInputWithSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
        defaultCountry,
        value,
        countries: defaultCountries,
        disableDialCodePrefill: true,
        disableCountryGuess: true, // Prevent country change while typing
        disableDialCodeAndPrefix: true, // Remove + and dial code from input since it's in the button
        onChange: (data) => {
            onChange(data.phone);
        },
    });

    // Get country iso2 code (country can be string or object)
    const countryIso2 = typeof country === 'string' ? country : (country as any)?.iso2 || '';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Parse and filter countries
    const parsedCountries = defaultCountries.map(c => parseCountry(c));

    const filteredCountries = parsedCountries.filter(c => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        // Allow searching by dial code even if user includes '+'
        const searchClean = search.startsWith('+') ? search.slice(1) : search;

        return (
            c.name.toLowerCase().includes(searchLower) ||
            c.iso2.toLowerCase().includes(searchLower) ||
            c.dialCode.startsWith(searchClean)
        );
    });

    // Custom formatting for display (e.g., 888-33-33 or 999-123-45-67)
    const formatValue = (v: string) => {
        const d = v.replace(/\D/g, '');
        if (d.length <= 3) return d;
        if (d.length <= 7) {
            return `${d.slice(0, 3)}-${d.slice(3, 5)}${d.length > 5 ? '-' : ''}${d.slice(5)}`;
        }
        return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 8)}${d.length > 8 ? '-' : ''}${d.slice(8)}`;
    };

    const selectedCountry = parsedCountries.find(c => c.iso2 === countryIso2);

    return (
        <div className="flex gap-2" ref={dropdownRef}>
            {/* Country Selector Button */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 h-10 sm:h-11 px-3 rounded-md border transition-colors ${error ? 'border-destructive bg-destructive/5' : 'border-primary/20 bg-slate-50 hover:bg-slate-100'
                        }`}
                >
                    {selectedCountry && (
                        <FlagImage iso2={selectedCountry.iso2} size={20} />
                    )}
                    <span className="text-sm text-muted-foreground">+{selectedCountry?.dialCode}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown with Search */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        {/* Country List */}
                        <div className="max-h-60 overflow-y-auto">
                            {filteredCountries.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Страна не найдена
                                </div>
                            ) : (
                                filteredCountries.map((c) => (
                                    <button
                                        key={c.iso2}
                                        type="button"
                                        onClick={() => {
                                            setCountry(c.iso2);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted transition-colors ${c.iso2 === countryIso2 ? 'bg-primary/10 text-primary' : ''
                                            }`}
                                    >
                                        <FlagImage iso2={c.iso2} size={20} />
                                        <span className="flex-1 text-left">{c.name}</span>
                                        <span className="text-muted-foreground">+{c.dialCode}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Phone Input */}
            <input
                ref={inputRef}
                type="tel"
                value={formatValue(inputValue)}
                onChange={handlePhoneValueChange}
                placeholder={placeholder}
                className={`flex-1 h-10 sm:h-11 px-3 rounded-md border transition-all ${error
                    ? 'border-destructive bg-destructive/5 ring-destructive/20'
                    : 'border-primary/20 bg-slate-50 focus:ring-primary/20 focus:border-primary'
                    } focus:outline-none focus:ring-2 text-base md:text-sm`}
            />
        </div>
    );
}

