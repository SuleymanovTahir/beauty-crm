/**
 * Utility to format currency values consistently across the application.
 */
export function formatCurrency(amount: number | string, currency: string = 'AED', locale: string = 'en-US'): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return `0 ${currency}`;

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(numericAmount) + ` ${currency}`;
}
