import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DropdownButton } from './DropdownButton';

interface ExportDropdownProps {
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ExportDropdown({ onExport, disabled, loading }: ExportDropdownProps) {
  const options = [
    {
      label: 'Экспорт в CSV',
      value: 'csv',
      icon: <FileText className="w-4 h-4 text-gray-600" />,
      onClick: () => onExport('csv')
    },
    {
      label: 'Экспорт в Excel',
      value: 'excel',
      icon: <FileSpreadsheet className="w-4 h-4 text-green-600" />,
      onClick: () => onExport('excel')
    },
    {
      label: 'Экспорт в PDF',
      value: 'pdf',
      icon: <FileText className="w-4 h-4 text-red-600" />,
      onClick: () => onExport('pdf')
    }
  ];

  return (
    <DropdownButton
      label={loading ? 'Экспорт...' : 'Экспорт'}
      icon={<Download className="w-4 h-4" />}
      options={options}
      disabled={disabled}
      loading={loading}
    />
  );
}