import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { useTranslation } from 'react-i18next';

interface PeriodFilterProps {
  period: string;
  dateFrom: string;
  dateTo: string;
  onPeriodChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  className?: string;
  showAllOption?: boolean;
}

export function PeriodFilter({
  period,
  dateFrom,
  dateTo,
  onPeriodChange,
  onDateFromChange,
  onDateToChange,
  className = '',
  showAllOption = true
}: PeriodFilterProps) {
  const { t } = useTranslation('common');

  return (
    <div className={`flex flex-wrap gap-4 items-center ${className}`}>
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-full md:w-[200px]">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue placeholder={t('period')} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">{t('all_periods')}</SelectItem>}
          <SelectItem value="today">{t('today')}</SelectItem>
          <SelectItem value="7">{t('last_7_days')}</SelectItem>
          <SelectItem value="14">{t('last_14_days')}</SelectItem>
          <SelectItem value="30">{t('last_month')}</SelectItem>
          <SelectItem value="90">{t('last_3_months')}</SelectItem>
          <SelectItem value="custom">{t('custom_period')}</SelectItem>
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            placeholder={t('from')}
            className="w-full md:w-[180px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            placeholder={t('to')}
            className="w-full md:w-[180px]"
          />
        </>
      )}
    </div>
  );
}