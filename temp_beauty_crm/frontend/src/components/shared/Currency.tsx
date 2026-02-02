import React from 'react';
import { useCurrency } from '../hooks/useSalonSettings';

interface CurrencyProps {
    amount: number | string;
    showSymbol?: boolean;
}

/**
 * Component to display currency with salon settings
 */
export const Currency: React.FC<CurrencyProps> = ({ amount, showSymbol = true }) => {
    const { currency } = useCurrency();

    const formattedAmount = typeof amount === 'number'
        ? amount.toLocaleString()
        : amount;

    return (
        <span>
            {formattedAmount} {showSymbol && currency}
        </span>
    );
};

/**
 * Hook to get formatted currency string
 */
export function useFormattedCurrency(amount: number | string): string {
    const { currency } = useCurrency();
    const formattedAmount = typeof amount === 'number'
        ? amount.toLocaleString()
        : amount;

    return `${formattedAmount} ${currency}`;
}
