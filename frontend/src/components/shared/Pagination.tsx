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
        <div className="flex items-center justify-between px-2 py-4">
            <div className="flex-1 text-sm text-gray-700">
                {totalItems > 0 ? (
                    <span>
                        {t('showing_range', { start: startItem, end: endItem, total: totalItems, defaultValue: `Showing ${startItem}-${endItem} of ${totalItems}` })}
                    </span>
                ) : (
                    <span>{t('no_items', { defaultValue: 'No items' })}</span>
                )}
            </div>

            <div className="flex items-center" style={{ gap: '1.5rem' }}>
                {showItemsPerPage && (
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-700">{t('rows_per_page', { defaultValue: 'Rows per page' })}:</p>
                        <div style={{ marginLeft: '0.5rem' }}>
                            <Select
                                value={`${itemsPerPage}`}
                                onValueChange={(value) => onItemsPerPageChange(Number(value))}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
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
                    </div>
                )}

                <div className="flex items-center" style={{ gap: '1rem' }}>
                    <Button
                        variant="outline"
                        className="h-8 w-24"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        {t('previous', { defaultValue: 'Previous' })}
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-24"
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
