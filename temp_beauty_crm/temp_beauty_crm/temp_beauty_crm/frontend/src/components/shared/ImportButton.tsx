// /frontend/src/components/shared/ImportButton.tsx
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

interface ImportButtonProps {
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'default' | 'outline';
}

export function ImportButton({ onClick, disabled, loading, variant = 'outline' }: ImportButtonProps) {
    const { t } = useTranslation('common');

    return (
        <Button
            variant={variant}
            onClick={onClick}
            disabled={disabled || loading}
            className={variant === 'outline' ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : ''}
        >
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{loading ? t('importing') : t('import')}</span>
        </Button>
    );
}
