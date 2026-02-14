// /frontend/src/components/shared/ExportDropdown.tsx
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DropdownButton } from './DropdownButton';
import { useTranslation } from 'react-i18next';

interface ExportDropdownProps {
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ExportDropdown({ onExport, disabled, loading }: ExportDropdownProps) {
  const { t } = useTranslation('common');

  const options = [
    {
      label: t('export_to_csv'),
      value: 'csv',
      icon: <FileText className="w-4 h-4 text-gray-600" />,
      onClick: () => onExport('csv')
    },
    {
      label: t('export_to_excel'),
      value: 'excel',
      icon: <FileSpreadsheet className="w-4 h-4 text-green-600" />,
      onClick: () => onExport('excel')
    },
    {
      label: t('export_to_pdf'),
      value: 'pdf',
      icon: <FileText className="w-4 h-4 text-red-600" />,
      onClick: () => onExport('pdf')
    }
  ];

  return (
    <DropdownButton
      label={loading ? t('exporting') : t('export')}
      icon={<Download className="w-4 h-4" />}
      options={options}
      disabled={disabled}
      loading={loading}
    />
  );
}