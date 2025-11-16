import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';

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
  return (
    <div className={`flex flex-wrap gap-4 items-center ${className}`}>
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-full md:w-[200px]">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Период" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">Все периоды</SelectItem>}
          <SelectItem value="today">Сегодня</SelectItem>
          <SelectItem value="7">Последние 7 дней</SelectItem>
          <SelectItem value="14">Последние 14 дней</SelectItem>
          <SelectItem value="30">Последний месяц</SelectItem>
          <SelectItem value="90">Последние 3 месяца</SelectItem>
          <SelectItem value="custom">Свой период</SelectItem>
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            placeholder="От"
            className="w-full md:w-[180px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            placeholder="До"
            className="w-full md:w-[180px]"
          />
        </>
      )}
    </div>
  );
}