// /frontend/src/components/shared/Pagination.tsx
import React from 'react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    showItemsPerPage?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPage = true,
}) => {
    const { t } = useTranslation('common');

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 bg-white border-t border-gray-100 font-sans">
            <div className="text-sm text-gray-500 font-medium text-center sm:text-left order-2 sm:order-1">
                {totalItems > 0 ? (
                    <span>
                        {t('showing_range', { start: startItem, end: endItem, total: totalItems, defaultValue: `Showing ${startItem}-${endItem} of ${totalItems}` })}
                    </span>
                ) : (
                    <span>{t('no_items', { defaultValue: 'No items' })}</span>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 order-1 sm:order-2">
                {showItemsPerPage && (
                    <div className="flex items-center justify-center gap-3">
                        <p className="text-sm text-gray-600 whitespace-nowrap">{t('rows_per_page', { defaultValue: 'Rows per page' })}:</p>
                        <Select
                            value={`${itemsPerPage}`}
                            onValueChange={(value) => onItemsPerPageChange(Number(value))}
                        >
                            <SelectTrigger className="h-9 w-[80px] bg-white border-gray-300 rounded-lg">
                                <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        className="h-9 min-w-[100px] border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg shadow-sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        {t('previous', { defaultValue: 'Previous' })}
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 min-w-[100px] border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg shadow-sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        {t('next', { defaultValue: 'Next' })}
                    </Button>
                </div>
            </div>
        </div>
    );
};
