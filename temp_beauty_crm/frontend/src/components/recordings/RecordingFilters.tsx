import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Filters {
  search: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  sort_by: 'name' | 'date' | 'duration';
  order: 'asc' | 'desc';
}

interface RecordingFiltersProps {
  filters: Filters;
  onChange: (filters: Partial<Filters>) => void;
}

const RecordingFilters: React.FC<RecordingFiltersProps> = ({ filters, onChange }) => {
  const { t } = useTranslation(['telephony']);

  const handleClearDates = () => {
    onChange({ date_from: undefined, date_to: undefined });
  };

  const hasDateFilters = filters.date_from || filters.date_to;

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Date From */}
        <div className="space-y-2">
          <Label htmlFor="date-from">{t('telephony:from', 'От')}</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => onChange({ date_from: e.target.value || undefined })}
          />
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label htmlFor="date-to">{t('telephony:to', 'До')}</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => onChange({ date_to: e.target.value || undefined })}
          />
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label htmlFor="sort-by">Сортировка</Label>
          <Select
            value={filters.sort_by}
            onValueChange={(value) => onChange({ sort_by: value as 'name' | 'date' | 'duration' })}
          >
            <SelectTrigger id="sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">
                {t('telephony:sort_by_date', 'По дате')}
              </SelectItem>
              <SelectItem value="name">
                {t('telephony:sort_by_name', 'По названию')}
              </SelectItem>
              <SelectItem value="duration">
                {t('telephony:sort_by_duration', 'По длительности')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Order */}
        <div className="space-y-2">
          <Label htmlFor="order">Порядок</Label>
          <Select
            value={filters.order}
            onValueChange={(value) => onChange({ order: value as 'asc' | 'desc' })}
          >
            <SelectTrigger id="order">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">По убыванию</SelectItem>
              <SelectItem value="asc">По возрастанию</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick actions */}
      {hasDateFilters && (
        <div className="mt-4 flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={handleClearDates}>
            <X className="h-3 w-3 mr-1" />
            Очистить даты
          </Button>
        </div>
      )}
    </Card>
  );
};

export default RecordingFilters;
