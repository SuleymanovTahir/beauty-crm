import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Calendar, Search, MessageSquare, Eye, Loader, RefreshCw, AlertCircle, Plus,
    Upload, Edit, Trash2, Clock, CheckCircle2,
    CalendarDays, DollarSign, ChevronDown, Users, X, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '../../components/shared/ExportDropdown';
import { StatusSelect } from '../../components/shared/StatusSelect';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Button } from '../../components/ui/button';
import { useBookingStatuses } from '../../hooks/useStatuses';
import { useCurrency } from '../../hooks/useSalonSettings';
import { useAuth } from '../../contexts/AuthContext';

import { getDynamicAvatar } from '../../utils/avatarUtils';
import { Pagination } from '../../components/shared/Pagination';
import { CRMDatePicker } from '../../components/shared/CRMDatePicker';
import '../admin/Bookings.css';

// Local API wrapper for consistency with original Bookings.tsx
const api = {
    baseURL: import.meta.env.VITE_API_URL || window.location.origin,

    async getBookings(params: any = {}) {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.status && params.status !== 'all') searchParams.append('status', params.status);
        if (params.master && params.master !== 'all') searchParams.append('master', params.master);
        if (params.dateFrom) searchParams.append('date_from', params.dateFrom);
        if (params.dateTo) searchParams.append('date_to', params.dateTo);
        if (params.sort) searchParams.append('sort', params.sort);
        if (params.order) searchParams.append('order', params.order);
        if (params.language) searchParams.append('language', params.language);

        const res = await fetch(`${this.baseURL}/api/bookings?${searchParams.toString()}`, { credentials: 'include' });
        return res.json();
    },

    async getClients() {
        const res = await fetch(`${this.baseURL}/api/clients`, { credentials: 'include' });
        return res.json();
    },

    async getServices(lang: string = 'ru', activeOnly: boolean = false) {
        const searchParams = new URLSearchParams();
        searchParams.append('language', lang);
        searchParams.append('active_only', activeOnly ? 'true' : 'false');
        const res = await fetch(`${this.baseURL}/api/services?${searchParams.toString()}`, { credentials: 'include' });
        return res.json();
    },

    async updateBooking(id: number, data: any) {
        const res = await fetch(`${this.baseURL}/api/bookings/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('update_failed');
        return res.json();
    },

    async exportBookings(format: string, dateFrom?: string, dateTo?: string) {
        let url = `${this.baseURL}/api/export/bookings?format=${format}`;
        if (dateFrom && dateTo) {
            url += `&date_from=${dateFrom}&date_to=${dateTo}`;
        }
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('export_failed');
        return res.blob();
    },

    async importBookings(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${this.baseURL}/api/import/bookings`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!res.ok) throw new Error('import_failed');
        return res.json();
    },

    async downloadImportTemplate(format: 'csv' | 'excel') {
        const res = await fetch(`${this.baseURL}/api/import/bookings/template?format=${format}`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error('template_download_failed');
        return res.blob();
    },

    async deleteBooking(id: number) {
        const res = await fetch(`${this.baseURL}/api/bookings/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('delete_failed');
        return res.json();
    },

    async getUsers(lang: string = 'ru') {
        const res = await fetch(`${this.baseURL}/api/users?language=${lang}`, { credentials: 'include' });
        return res.json();
    },

    async createBooking(data: any) {
        const res = await fetch(`${this.baseURL}/api/bookings`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            const error: any = new Error(body.error || body.message || 'create_booking_failed');
            error.error = body.error;
            error.reason = body.reason;
            error.nearest_slots = body.nearest_slots;
            error.status = res.status;
            throw error;
        }
        return body;
    },

    async updateBookingStatus(id: number, status: string) {
        const res = await fetch(`${this.baseURL}/api/bookings/${id}/status`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.success === false) {
            throw new Error(body?.error || body?.message || 'status_update_failed');
        }
        return body;
    },

    async getEmployeesForService(serviceId: number, lang: string = 'ru') {
        const res = await fetch(`${this.baseURL}/api/services/${serviceId}/employees?language=${lang}`, {
            credentials: 'include'
        });
        return res.json();
    },

    async getEmployeeBusySlots(employeeId: number, date: string) {
        const res = await fetch(`${this.baseURL}/api/employees/${employeeId}/busy-slots?date=${date}`, {
            credentials: 'include'
        });
        return res.json();
    }
};

type BookingStats = {
    pending: number;
    completed: number;
    total: number;
    revenue: number;
};

type TrendDirection = 'up' | 'down' | 'neutral';

type StatTrend = {
    value: number;
    direction: TrendDirection;
};

type StatTrendMap = {
    pending: StatTrend;
    completed: StatTrend;
    total: StatTrend;
    revenue: StatTrend;
};

type DateRange = {
    from: Date;
    to: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_OPTIONS = ['all', 'today', '7', '14', '30', '90'] as const;

const EMPTY_BOOKING_STATS: BookingStats = {
    pending: 0,
    completed: 0,
    total: 0,
    revenue: 0
};

const EMPTY_STAT_TRENDS: StatTrendMap = {
    pending: { value: 0, direction: 'neutral' },
    completed: { value: 0, direction: 'neutral' },
    total: { value: 0, direction: 'neutral' },
    revenue: { value: 0, direction: 'neutral' }
};

const toStartOfDay = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

const toEndOfDay = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 0);
};

const formatDateTimeForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const parseStoredDate = (value: string): Date | null => {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3) {
        return null;
    }
    const [year, month, day] = parts;
    if (!Number.isFinite(year)) {
        return null;
    }
    if (!Number.isFinite(month)) {
        return null;
    }
    if (!Number.isFinite(day)) {
        return null;
    }
    return new Date(year, month - 1, day);
};

const parseDurationToMinutes = (rawDuration: unknown): number => {
    if (typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0) {
        return Math.max(1, Math.trunc(rawDuration));
    }

    if (typeof rawDuration !== 'string') {
        return 60;
    }

    const normalized = rawDuration.trim();
    if (normalized.length === 0) {
        return 60;
    }

    if (/^\d+$/.test(normalized)) {
        const parsed = Number(normalized);
        return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 60;
    }

    const hoursMatch = normalized.match(/(\d+)\s*(h|hr|час|ч)/i);
    const minsMatch = normalized.match(/(\d+)\s*(m|min|мин)/i);
    const hours = hoursMatch && hoursMatch[1] ? Number(hoursMatch[1]) : 0;
    const mins = minsMatch && minsMatch[1] ? Number(minsMatch[1]) : 0;
    const total = hours * 60 + mins;
    return total > 0 ? Math.trunc(total) : 60;
};

const buildDateRangeFromPeriod = (
    period: string,
    customDateFrom: string,
    customDateTo: string
): DateRange | null => {
    const today = new Date();
    const todayStart = toStartOfDay(today);
    const todayEnd = toEndOfDay(today);

    if (period === 'today') {
        return { from: todayStart, to: todayEnd };
    }

    if (['7', '14', '30', '90'].includes(period)) {
        const days = Number.parseInt(period, 10);
        if (!Number.isFinite(days)) {
            return null;
        }
        if (days <= 0) {
            return null;
        }
        const from = new Date(todayStart);
        from.setDate(from.getDate() - (days - 1));
        return { from, to: todayEnd };
    }

    if (period === 'custom' && customDateFrom && customDateTo) {
        const parsedFrom = parseStoredDate(customDateFrom);
        const parsedTo = parseStoredDate(customDateTo);
        if (!parsedFrom) {
            return null;
        }
        if (!parsedTo) {
            return null;
        }
        return {
            from: toStartOfDay(parsedFrom),
            to: toEndOfDay(parsedTo)
        };
    }

    return null;
};

const buildPreviousDateRange = (range: DateRange): DateRange => {
    const currentDays = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS) + 1);
    const previousTo = new Date(range.from.getTime() - 1);
    const previousToDay = toEndOfDay(previousTo);
    const previousFromDay = toStartOfDay(previousToDay);
    previousFromDay.setDate(previousFromDay.getDate() - (currentDays - 1));
    return {
        from: previousFromDay,
        to: previousToDay
    };
};

const toNumeric = (value: unknown): number => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
};

const calculateTrend = (currentValue: number, previousValue: number): StatTrend => {
    if (previousValue <= 0) {
        if (currentValue <= 0) {
            return { value: 0, direction: 'neutral' };
        }
        return { value: 100, direction: 'up' };
    }

    const rawDiff = ((currentValue - previousValue) / previousValue) * 100;
    const roundedDiff = Math.round(rawDiff * 10) / 10;
    if (roundedDiff > 0) {
        return { value: roundedDiff, direction: 'up' };
    }
    if (roundedDiff < 0) {
        return { value: roundedDiff, direction: 'down' };
    }
    return { value: 0, direction: 'neutral' };
};

const calculateStatTrends = (
    currentStats: BookingStats,
    previousStats: Partial<BookingStats> | null
): StatTrendMap => {
    if (!previousStats) {
        return EMPTY_STAT_TRENDS;
    }

    return {
        pending: calculateTrend(currentStats.pending, toNumeric(previousStats.pending)),
        completed: calculateTrend(currentStats.completed, toNumeric(previousStats.completed)),
        total: calculateTrend(currentStats.total, toNumeric(previousStats.total)),
        revenue: calculateTrend(currentStats.revenue, toNumeric(previousStats.revenue))
    };
};

export default function UniversalBookings() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { statuses: statusConfig } = useBookingStatuses();

    const { currency } = useCurrency();
    const [bookings, setBookings] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const { t, i18n } = useTranslation(['admin/bookings', 'admin/services', 'common', 'public_landing']);
    const [services, setServices] = useState<any[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [statusFilter, setStatusFilter] = useState(() => {
        return localStorage.getItem('bookings_status_filter') || 'all';
    });

    const isEmployee = currentUser?.role === 'employee';
    const isSales = currentUser?.role === 'sales';
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'director';
    const isManager = currentUser?.role === 'manager';
    const canEdit = isAdmin || isSales || isManager;
    const canDelete = isAdmin;

    const [masterFilter, setMasterFilter] = useState(() => {
        if (isEmployee) return currentUser?.full_name || currentUser?.username || 'all';
        return localStorage.getItem('bookings_master_filter') || 'all';
    });

    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState<BookingStats>(EMPTY_BOOKING_STATS);
    const [statTrends, setStatTrends] = useState<StatTrendMap>(EMPTY_STAT_TRENDS);

    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [masters, setMasters] = useState<any[]>([]);

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [addingBooking, setAddingBooking] = useState(false);
    const [editingBooking, setEditingBooking] = useState<any>(null);

    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);

    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);

    // Form state
    const [addForm, setAddForm] = useState({
        phone: '',
        date: '',
        time: '',
        revenue: 0,
        master: '',
        status: 'confirmed',
        source: 'manual'
    });

    // Export/Import states
    const [exporting, setExporting] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<any>(null);

    const [period, setPeriod] = useState(() => {
        return localStorage.getItem('bookings_period_filter') || 'all';
    });
    const dateFrom = useMemo(() => localStorage.getItem('bookings_date_from') || '', []);
    const dateTo = useMemo(() => localStorage.getItem('bookings_date_to') || '', []);

    // Sorting states
    const [sortField, setSortField] = useState<'name' | 'service_name' | 'datetime' | 'revenue' | 'source' | 'created_at'>('datetime');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const getPeriodLabel = (periodValue: string) => {
        const applyCountInterpolation = (value: string, count: number) => {
            return value.replace(/\{\{\s*count\s*\}\}/g, String(count));
        };

        const getCountPeriodLabel = (key: string, count: number, fallbackTemplate: string) => {
            const translated = t(key, { count, defaultValue: fallbackTemplate });
            const periodFallback = t('common:for_period', { defaultValue: '' });
            if (translated.trim().toLowerCase() === periodFallback.trim().toLowerCase() && periodFallback.trim().length > 0) {
                return applyCountInterpolation(fallbackTemplate, count);
            }
            return applyCountInterpolation(translated, count);
        };

        if (periodValue === 'all') {
            return t('common:all_time');
        }
        if (periodValue === 'today') {
            return t('common:today');
        }
        if (periodValue === '7') {
            return getCountPeriodLabel('common:last_7_days', 7, 'Последние {{count}} дней');
        }
        if (periodValue === '14') {
            return getCountPeriodLabel('common:last_14_days', 14, 'Последние {{count}} дней');
        }
        if (periodValue === '30') {
            return getCountPeriodLabel('common:last_7_days', 30, 'Последние {{count}} дней');
        }
        if (periodValue === '90') {
            return getCountPeriodLabel('common:last_3_months', 3, 'Последние {{count}} месяца');
        }
        if (periodValue === 'custom' && dateFrom && dateTo) {
            return `${dateFrom} - ${dateTo}`;
        }
        return t('common:all_periods');
    };

    const periodLabel = useMemo(() => getPeriodLabel(period), [dateFrom, dateTo, period, t]);

    const renderTrendBadge = (trend: StatTrend) => {
        const absoluteValue = Math.abs(trend.value);

        if (trend.direction === 'up') {
            return (
                <div className="bookings-stat-trend bookings-stat-trend-up">
                    <TrendingUp className="bookings-stat-trend-icon" />
                    <span>{absoluteValue}%</span>
                </div>
            );
        }

        if (trend.direction === 'down') {
            return (
                <div className="bookings-stat-trend bookings-stat-trend-down">
                    <TrendingDown className="bookings-stat-trend-icon" />
                    <span>{absoluteValue}%</span>
                </div>
            );
        }

        return (
            <div className="bookings-stat-trend bookings-stat-trend-neutral">
                <Minus className="bookings-stat-trend-icon" />
                <span>0%</span>
            </div>
        );
    };

    useEffect(() => {
        loadData();
    }, [itemsPerPage, currentPage, searchTerm, statusFilter, masterFilter, period, dateFrom, dateTo, sortField, sortDirection]);

    useEffect(() => {
        setFilteredBookings(bookings);
    }, [bookings]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, masterFilter, period, sortField, sortDirection, itemsPerPage]);

    useEffect(() => {
        localStorage.setItem('bookings_status_filter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        if (!isEmployee) {
            localStorage.setItem('bookings_master_filter', masterFilter);
        }
    }, [masterFilter, isEmployee]);

    useEffect(() => {
        if (isEmployee || masterFilter === 'all' || masters.length === 0) {
            return;
        }

        const hasCurrentValue = masters.some((master: any) => String(master.id) === masterFilter);
        if (hasCurrentValue) {
            return;
        }

        const normalizedFilter = masterFilter.trim().toLowerCase();
        const matchedByName = masters.find((master: any) => {
            const fullName = String(master?.full_name ?? '').trim().toLowerCase();
            const username = String(master?.username ?? '').trim().toLowerCase();
            return normalizedFilter === fullName || normalizedFilter === username;
        });

        if (matchedByName?.id) {
            setMasterFilter(String(matchedByName.id));
            return;
        }

        setMasterFilter('all');
    }, [isEmployee, masterFilter, masters]);

    useEffect(() => {
        localStorage.setItem('bookings_period_filter', period);
    }, [period]);

    const handleSort = (field: 'name' | 'service_name' | 'datetime' | 'revenue' | 'source' | 'created_at') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const selectedRange = buildDateRangeFromPeriod(period, dateFrom, dateTo);
            const previousRange = selectedRange ? buildPreviousDateRange(selectedRange) : null;

            const selectedMaster = isEmployee
                ? (currentUser?.full_name ?? currentUser?.username ?? '')
                : masterFilter;

            const baseParams = {
                search: searchTerm,
                status: statusFilter,
                master: selectedMaster,
                sort: sortField,
                order: sortDirection,
                language: i18n.language
            };

            const currentParams = {
                ...baseParams,
                page: currentPage,
                limit: itemsPerPage,
                dateFrom: selectedRange ? formatDateTimeForApi(selectedRange.from) : '',
                dateTo: selectedRange ? formatDateTimeForApi(selectedRange.to) : ''
            };

            const previousParams = previousRange
                ? {
                    ...baseParams,
                    page: 1,
                    limit: 1,
                    dateFrom: formatDateTimeForApi(previousRange.from),
                    dateTo: formatDateTimeForApi(previousRange.to)
                }
                : null;

            const [bookingsData, clientsData, servicesData, usersData, previousPeriodData] = await Promise.all([
                api.getBookings(currentParams),
                api.getClients(),
                api.getServices(i18n.language, false),
                api.getUsers(i18n.language),
                previousParams ? api.getBookings(previousParams) : Promise.resolve(null)
            ]);

            const bookingRows = Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : [];
            const totalResults = toNumeric(bookingsData?.total);

            setBookings(bookingRows);
            setTotalItems(totalResults);
            setTotalPages(Math.ceil(totalResults / itemsPerPage));

            const currentStats: BookingStats = {
                pending: toNumeric(bookingsData?.stats?.pending),
                completed: toNumeric(bookingsData?.stats?.completed),
                total: toNumeric(bookingsData?.stats?.total),
                revenue: toNumeric(bookingsData?.stats?.revenue)
            };
            setStats(currentStats);

            const previousStats = previousPeriodData?.stats ? previousPeriodData.stats : null;
            setStatTrends(calculateStatTrends(currentStats, previousStats));

            const clientsList = Array.isArray(clientsData?.clients)
                ? clientsData.clients
                : (Array.isArray(clientsData) ? clientsData : []);
            const servicesList = Array.isArray(servicesData?.services)
                ? servicesData.services
                : (Array.isArray(servicesData) ? servicesData : []);
            const allUsers = Array.isArray(usersData)
                ? usersData
                : (Array.isArray(usersData?.users) ? usersData.users : []);

            setClients(clientsList);
            setServices(servicesList);
            setMasters(
                allUsers.filter((u: any) => Boolean(u.is_service_provider) && !['admin', 'director'].includes(String(u.role ?? '').toLowerCase()))
            );

        } catch (err: any) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            toast.error(`${t('common:error_loading_data')}: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        try {
            await api.updateBookingStatus(id, newStatus);
            setBookings((prevBookings: any[]) =>
                prevBookings.map((b: any) => b.id === id ? { ...b, status: newStatus } : b)
            );
            await loadData();
            toast.success(t('bookings:status_updated'));
        } catch (err) {
            toast.error(t('bookings:error_updating_status'));
        }
    };

    const formatNearestSlots = (slots: any[]): string => {
        if (!Array.isArray(slots) || slots.length === 0) {
            return '';
        }

        const formatted = slots.slice(0, 4).map((slot: any) => {
            const slotDate = String(slot?.date || '');
            const slotTime = String(slot?.time || '');
            if (!slotDate || !slotTime) {
                return '';
            }
            const parsedDate = new Date(`${slotDate}T${slotTime}:00`);
            const dateLabel = Number.isNaN(parsedDate.getTime())
                ? slotDate
                : parsedDate.toLocaleDateString(i18n.language);
            return `${dateLabel} ${slotTime}`;
        }).filter((item: string) => item.length > 0);

        return formatted.join(', ');
    };

    const getMasterSelectValue = (booking: any) => {
        const masterUserId = booking?.master_user_id;
        if (masterUserId !== null && masterUserId !== undefined) {
            return String(masterUserId);
        }

        const normalizedMaster = String(booking?.master ?? '').trim();
        if (normalizedMaster.length === 0) {
            return '';
        }

        const matchedMaster = masters.find((master: any) => {
            const fullName = String(master?.full_name ?? '').trim().toLowerCase();
            const username = String(master?.username ?? '').trim().toLowerCase();
            const target = normalizedMaster.toLowerCase();
            return target === fullName || target === username;
        });

        if (!matchedMaster) {
            return '';
        }

        return String(matchedMaster.id);
    };

    const getMasterDisplayName = (booking: any): string => {
        const rawMaster = String(booking?.master ?? '').trim();
        if (rawMaster.length > 0) {
            return rawMaster;
        }

        const masterUserId = booking?.master_user_id !== null && booking?.master_user_id !== undefined
            ? String(booking.master_user_id)
            : '';

        let matchedMaster = masterUserId
            ? masters.find((master: any) => String(master?.id) === masterUserId)
            : null;

        if (!matchedMaster && rawMaster.length > 0) {
            const normalizedMaster = rawMaster.toLowerCase();
            matchedMaster = masters.find((master: any) => {
                const fullName = String(master?.full_name ?? '').trim().toLowerCase();
                const username = String(master?.username ?? '').trim().toLowerCase();
                return normalizedMaster === fullName || normalizedMaster === username;
            });
        }

        if (matchedMaster) {
            return String(matchedMaster.full_name || matchedMaster.username || '-');
        }

        return '-';
    };

    const getSourceLabel = (sourceValue: unknown): string => {
        const normalized = String(sourceValue ?? '').trim().toLowerCase();
        if (!normalized) {
            return t('bookings:source.manual');
        }
        return t(`bookings:source.${normalized}`, { defaultValue: normalized });
    };

    const getDiscountLabel = (booking: any): string => {
        const promoCode = String(booking?.promo_code ?? '').trim();
        if (promoCode.length > 0) {
            return `${t('admin/services:promo_code')}: ${promoCode}`;
        }

        const discountSource = String(booking?.discount_source ?? '').trim().toLowerCase();
        if (discountSource.length > 0) {
            return `${t('common:discount')}: ${getSourceLabel(discountSource)}`;
        }

        return '';
    };

    const handleAddBooking = async () => {
        const manualClientName = clientSearch.trim();
        if ((!selectedClient && !manualClientName) || !selectedService || !addForm.date || !addForm.time) {
            toast.error(t('bookings:fill_all_required_fields'));
            return;
        }

        try {
            setAddingBooking(true);
            const selectedClientName = selectedClient?.display_name ?? selectedClient?.name ?? '';
            const bookingName = selectedClientName || manualClientName;
            const selectedClientInstagram = selectedClient?.instagram_id;
            const selectedClientPhone = selectedClient?.phone ?? '';
            const serviceDuration = Number(selectedService?.duration);

            const bookingData = {
                instagram_id: selectedClientInstagram,
                name: bookingName,
                phone: addForm.phone || selectedClientPhone,
                service: selectedService.name,
                date: addForm.date,
                time: addForm.time,
                revenue: addForm.revenue || selectedService.price,
                master: addForm.master,
                source: addForm.source,
                duration_minutes: Number.isFinite(serviceDuration) && serviceDuration > 0 ? serviceDuration : undefined,
            };

            if (editingBooking) {
                await api.updateBooking(editingBooking.id, bookingData);
                toast.success(t('bookings:booking_updated'));
            } else {
                await api.createBooking(bookingData);
                toast.success(t('bookings:booking_created'));
            }

            setShowAddDialog(false);
            resetForm();
            await loadData();
        } catch (err: any) {
            if (err?.error === 'slot_unavailable') {
                const reason = String(err?.reason ?? 'slot_unavailable').replace(/_/g, ' ');
                toast.error(`${t('bookings:error')}: ${reason}`);
                const nearestSlots = formatNearestSlots(err?.nearest_slots ?? []);
                if (nearestSlots) {
                    toast.info(nearestSlots);
                }
                return;
            }
            toast.error(`${t('bookings:error')}: ${err.message}`);
        } finally {
            setAddingBooking(false);
        }
    };

    const handleDeleteBooking = async (id: number, name: string) => {
        if (!window.confirm(t('bookings:delete_booking_confirm', { name }))) {
            return;
        }

        try {
            await api.deleteBooking(id);
            toast.success(t('bookings:booking_deleted'));
            loadData();
        } catch (err: any) {
            toast.error(err.message || t('bookings:delete_booking_error'));
        }
    };

    const handleEditBooking = (booking: any) => {
        const client = clients.find(c => c.instagram_id === booking.client_id || c.id === booking.client_id);
        const service = services.find(s => s.name === booking.service_name || s.name === booking.service);

        setEditingBooking(booking);
        setSelectedClient(client || { display_name: booking.name, instagram_id: booking.client_id, phone: booking.phone });
        setSelectedService(service);

        const datetime = new Date(booking.datetime);
        const date = datetime.toISOString().split('T')[0];
        const time = datetime.toTimeString().slice(0, 5);

        setAddForm({
            phone: booking.phone || '',
            date: date,
            time: time,
            revenue: booking.revenue || 0,
            master: getMasterSelectValue(booking),
            status: booking.status || 'confirmed',
            source: booking.source || 'manual'
        });

        if (!client && booking.name) {
            setClientSearch(String(booking.name));
        }

        setShowAddDialog(true);
    };

    const resetForm = () => {
        setClientSearch('');
        setServiceSearch('');
        setSelectedClient(null);
        setSelectedService(null);
        setAddForm({ phone: '', date: '', time: '', revenue: 0, master: '', status: 'confirmed', source: 'manual' });
        setEditingBooking(null);
    };

    const filteredClients = clients.filter((c: any) =>
        (c.display_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.phone || '').includes(clientSearch)
    );

    const filteredServices = services.filter((serviceItem: any) => {
        const serviceQuery = serviceSearch.trim().toLowerCase();
        if (serviceQuery.length === 0) {
            return true;
        }

        const serviceName = String(serviceItem?.name ?? '').toLowerCase();
        if (serviceName.includes(serviceQuery)) {
            return true;
        }

        const serviceKey = String(serviceItem?.key ?? serviceItem?.service_key ?? '').toLowerCase();
        if (serviceKey.includes(serviceQuery)) {
            return true;
        }

        const serviceCategory = String(serviceItem?.category ?? '').toLowerCase();
        if (serviceCategory.includes(serviceQuery)) {
            return true;
        }

        return false;
    });

    const getBookingDurationMinutes = (booking: any): number => {
        const directDuration = booking?.duration_minutes ?? booking?.duration;
        if (directDuration !== undefined && directDuration !== null) {
            return parseDurationToMinutes(directDuration);
        }

        const serviceLabel = String(booking?.service_name ?? booking?.service ?? '').trim().toLowerCase();
        if (serviceLabel.length === 0) {
            return 60;
        }

        const matchedService = services.find((serviceItem: any) => {
            const serviceName = String(serviceItem?.name ?? '').trim().toLowerCase();
            const serviceKey = String(serviceItem?.service_key ?? serviceItem?.key ?? '').trim().toLowerCase();
            return serviceLabel === serviceName || serviceLabel === serviceKey;
        });

        if (!matchedService) {
            return 60;
        }

        return parseDurationToMinutes(matchedService?.duration);
    };

    const formatBookingTimeRange = (booking: any): string => {
        const startDate = new Date(booking?.datetime);
        if (Number.isNaN(startDate.getTime())) {
            return '';
        }

        const durationMinutes = getBookingDurationMinutes(booking);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        const startLabel = startDate.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
        const endLabel = endDate.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
        return `${startLabel} - ${endLabel}`;
    };

    const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
        try {
            setExporting(true);
            const blob = await api.exportBookings(format, '', '');

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const ext = format === 'excel' ? 'xlsx' : format;
            link.download = `bookings.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(t('bookings:file_downloaded', { format: format.toUpperCase() }));
        } catch (err) {
            toast.error(t('bookings:error_exporting'));
        } finally {
            setExporting(false);
        }
    };

    const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
                toast.error(t('bookings:only_csv_and_excel_files_supported'));
                return;
            }
            setImportFile(file);
            setImportResult(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;
        try {
            setImporting(true);
            const result = await api.importBookings(importFile);
            setImportResult(result);
            if (result.imported > 0) {
                toast.success(t('bookings:imported_bookings', { count: result.imported }));
                await loadData();
            }
        } catch (err: any) {
            toast.error(t('bookings:import_error', { message: err.message }));
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = async (format: 'csv' | 'excel') => {
        try {
            const blob = await api.downloadImportTemplate(format);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bookings_template.${format === 'excel' ? 'xlsx' : 'csv'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(t('bookings:template_downloaded'));
        } catch (err) {
            toast.error(t('bookings:error_downloading_template'));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">{t('common:error')}</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={handleRefresh}>{t('bookings:refresh')}</Button>
            </div>
        );
    }

    return (
        <div className="bookings-container">
            <div className="bookings-header">
                <div className="bookings-title-group">
                    <h1 className="bookings-title">
                        <div className="bookings-title-icon-wrapper">
                            <Calendar className="bookings-title-icon" />
                        </div>
                        {isEmployee ? t('bookings:my_bookings', 'Мои записи') : t('bookings:title')}
                    </h1>
                    <p className="bookings-count-label">
                        <span className="bookings-count-dot" />
                        {t('bookings:records_count', { count: totalItems })}
                    </p>
                </div>
                <button onClick={handleRefresh} disabled={refreshing} className="bookings-refresh-button">
                    <RefreshCw className={`bookings-refresh-icon ${refreshing ? 'animate-spin' : ''}`} />
                    {t('bookings:refresh')}
                </button>
            </div>

            <div className="bookings-stats-grid">
                <div className="bookings-stat-card">
                    <div className="bookings-stat-main">
                        <div className="bookings-stat-info">
                            <p className="bookings-stat-label">{t('bookings:pending')}</p>
                            <h3 className="bookings-stat-value">{stats.pending}</h3>
                            <p className="bookings-stat-period">{periodLabel}</p>
                            {renderTrendBadge(statTrends.pending)}
                        </div>
                        <div className="bookings-stat-icon-wrapper stat-yellow"><Clock className="bookings-stat-icon" /></div>
                    </div>
                </div>
                <div className="bookings-stat-card">
                    <div className="bookings-stat-main">
                        <div className="bookings-stat-info">
                            <p className="bookings-stat-label">{t('bookings:completed')}</p>
                            <h3 className="bookings-stat-value">{stats.completed}</h3>
                            <p className="bookings-stat-period">{periodLabel}</p>
                            {renderTrendBadge(statTrends.completed)}
                        </div>
                        <div className="bookings-stat-icon-wrapper stat-green"><CheckCircle2 className="bookings-stat-icon" /></div>
                    </div>
                </div>
                <div className="bookings-stat-card">
                    <div className="bookings-stat-main">
                        <div className="bookings-stat-info">
                            <p className="bookings-stat-label">{t('bookings:total')}</p>
                            <h3 className="bookings-stat-value">{stats.total}</h3>
                            <p className="bookings-stat-period">{periodLabel}</p>
                            {renderTrendBadge(statTrends.total)}
                        </div>
                        <div className="bookings-stat-icon-wrapper stat-blue"><CalendarDays className="bookings-stat-icon" /></div>
                    </div>
                </div>
                <div className="bookings-stat-card">
                    <div className="bookings-stat-main">
                        <div className="bookings-stat-info">
                            <p className="bookings-stat-label">{t('bookings:revenue')}</p>
                            <h3 className="bookings-stat-value">{stats.revenue} {currency}</h3>
                            <p className="bookings-stat-period">{periodLabel}</p>
                            {renderTrendBadge(statTrends.revenue)}
                        </div>
                        <div className="bookings-stat-icon-wrapper stat-emerald"><DollarSign className="bookings-stat-icon" /></div>
                    </div>
                </div>
            </div>

            <div className="bookings-filter-bar">
                <div className="bookings-filter-row">
                    <div className="bookings-search-wrapper">
                        <Search className="bookings-search-icon" />
                        <input
                            type="text"
                            placeholder={t('bookings:search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bookings-search-input"
                        />
                    </div>

                    <div className="bookings-controls">
                        {!isEmployee && (
                            <button onClick={() => setShowAddDialog(true)} className="bookings-control-button bookings-add-button">
                                <Plus className="w-4 h-4" />
                                <span>{t('bookings:add')}</span>
                            </button>
                        )}

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`bookings-control-button bookings-outline-button ${showFilters ? 'bookings-outline-button-active-pink' : ''}`}
                        >
                            <Users className={`w-4 h-4 ${showFilters ? 'text-pink-500' : 'text-gray-400'}`} />
                            <span>{t('bookings:filters')}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>

                        {!isEmployee && (
                            <button
                                onClick={() => setShowActions(!showActions)}
                                className={`bookings-control-button bookings-outline-button ${showActions ? 'bookings-outline-button-active-blue' : ''}`}
                            >
                                <Upload className={`w-4 h-4 ${showActions ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span>{t('bookings:options')}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActions ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>

                    {showActions && !isEmployee && (
                        <div className="pt-4 border-t w-full">
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowImportDialog(true)} className="bookings-control-button bookings-outline-button">
                                    <Upload className="w-4 h-4 text-gray-400" />
                                    <span>{t('bookings:import')}</span>
                                </button>
                                <ExportDropdown onExport={handleExport} loading={exporting} />
                            </div>
                        </div>
                    )}

                    {showFilters && (
                        <div className="pt-4 border-t w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{t('bookings:status')}</span>
                                <StatusSelect value={statusFilter} onChange={setStatusFilter} options={statusConfig} showAllOption={true} variant="filter" />
                            </div>

                            {!isEmployee && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{t('bookings:master')}</span>
                                    <select
                                        value={masterFilter}
                                        onChange={(e) => setMasterFilter(e.target.value)}
                                        className="w-full h-[42px] px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-pink-500/10"
                                    >
                                        <option value="all">{t('bookings:all_masters')}</option>
                                        {masters.map((m: any) => (
                                            <option key={m.id} value={String(m.id)}>{m.full_name || m.username}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{t('bookings:period')}</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-[42px] justify-between border-gray-200 rounded-xl font-bold bg-white">
                                            <CalendarDays className="w-4 h-4 text-pink-500 shrink-0 mr-2" />
                                            <span className="truncate">{periodLabel}</span>
                                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-3 rounded-2xl shadow-xl border-gray-100" align="start">
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {PERIOD_OPTIONS.map(id => (
                                                <button
                                                    key={id}
                                                    onClick={() => setPeriod(id)}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${period === id ? 'bg-pink-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                                >
                                                    <span>{getPeriodLabel(id)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bookings-table-container">
                {filteredBookings.length > 0 ? (
                    <div className="bookings-table-wrapper">
                        <table className="bookings-table">
                            <thead className="bookings-thead">
                                <tr>
                                    <th onClick={() => handleSort('name')} className="bookings-th">{t('bookings:client')}</th>
                                    <th onClick={() => handleSort('service_name')} className="bookings-th">{t('bookings:service')}</th>
                                    <th onClick={() => handleSort('datetime')} className="bookings-th">{t('bookings:date')}</th>
                                    <th className="bookings-th">{t('bookings:master')}</th>
                                    <th onClick={() => handleSort('revenue')} className="bookings-th">{t('bookings:amount')}</th>
                                    <th className="bookings-th">{t('bookings:status')}</th>
                                    <th className="bookings-th">{t('bookings:actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.map((booking: any) => (
                                    <tr key={booking.id} className="bookings-tr">
                                        <td className="bookings-td">
                                            <div className="flex items-center gap-3 text-left">
                                                <img src={getDynamicAvatar(booking.name, 'cold')} alt="" className="avatar-circle" />
                                                <span className="font-medium text-gray-900">{booking.name || t('bookings:no_name')}</span>
                                            </div>
                                        </td>
                                        <td className="bookings-td">{booking.service_name || booking.service || '-'}</td>
                                        <td className="bookings-td">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{new Date(booking.datetime).toLocaleDateString()}</span>
                                                <span className="text-xs text-gray-500">{formatBookingTimeRange(booking)}</span>
                                            </div>
                                        </td>
                                        <td className="bookings-td">{getMasterDisplayName(booking)}</td>
                                        <td className="bookings-td">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-semibold">{booking.revenue || 0} {currency}</span>
                                                {getDiscountLabel(booking).length > 0 && (
                                                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                                        {getDiscountLabel(booking)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="bookings-td">
                                            {canEdit ? (
                                                <StatusSelect value={booking.status} onChange={(newStatus) => handleStatusChange(booking.id, newStatus)} options={statusConfig} />
                                            ) : (
                                                <span className="bookings-badge" style={{
                                                    '--badge-bg': statusConfig[booking.status]?.color ? `var(--${statusConfig[booking.status].color}-100)` : '#f3f4f6',
                                                    '--badge-color': statusConfig[booking.status]?.color ? `var(--${statusConfig[booking.status].color}-700)` : '#374151'
                                                } as any}>
                                                    {statusConfig[booking.status]?.label || booking.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="bookings-td">
                                            <div className="action-button-group">
                                                <button onClick={() => navigate(`/crm/bookings/${booking.id}`)} className="action-button action-button-view"><Eye className="icon-16" /></button>
                                                {canEdit && <button onClick={() => handleEditBooking(booking)} className="action-button action-button-edit"><Edit className="icon-16" /></button>}
                                                <button onClick={() => navigate(`/crm/chat?client_id=${booking.client_id}`)} className="action-button action-button-chat"><MessageSquare className="icon-16" /></button>
                                                {canDelete && <button onClick={() => handleDeleteBooking(booking.id, booking.name)} className="action-button action-button-red"><Trash2 className="icon-16" /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="border-t">
                            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <Calendar className="empty-state-icon" />
                        <p>{t('bookings:no_bookings')}</p>
                    </div>
                )}
            </div>

            {showAddDialog && (
                <div
                    className="modal-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowAddDialog(false);
                            resetForm();
                        }
                    }}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{editingBooking ? t('bookings:edit_booking') : t('bookings:add_booking')}</h3>
                            <button className="modal-close" onClick={() => { setShowAddDialog(false); resetForm(); }}>×</button>
                        </div>
                        <div className="modal-body space-y-4">
                            {/* Client Search */}
                            <div className="relative">
                                <label className="input-label">{t('bookings:client')} *</label>
                                <input
                                    type="text"
                                    placeholder={t('bookings:search_client')}
                                    value={clientSearch}
                                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                                    onFocus={() => setShowClientDropdown(true)}
                                    className="input-field"
                                />
                                {selectedClient && (
                                    <div className="mt-2 flex items-center justify-between p-2 bg-pink-50 border border-pink-200 rounded-lg">
                                        <span className="text-sm font-medium">{selectedClient.display_name || selectedClient.name} {selectedClient.phone && `(${selectedClient.phone})`}</span>
                                        <button onClick={() => { setSelectedClient(null); setClientSearch(''); }}><X size={14} /></button>
                                    </div>
                                )}
                                {showClientDropdown && clientSearch && !selectedClient && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {filteredClients.map(c => (
                                            <div key={c.id} onClick={() => {
                                                setSelectedClient(c);
                                                setShowClientDropdown(false);
                                                setClientSearch('');
                                                setAddForm((prev) => ({ ...prev, phone: c.phone ?? prev.phone }));
                                            }} className="p-3 hover:bg-gray-50 cursor-pointer">
                                                {c.display_name} ({c.phone})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Service Search */}
                            <div className="relative">
                                <label className="input-label">{t('bookings:service')} *</label>
                                <input
                                    type="text"
                                    placeholder={t('bookings:search_service')}
                                    value={serviceSearch}
                                    onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                                    onFocus={() => setShowServiceDropdown(true)}
                                    className="input-field"
                                />
                                {selectedService && (
                                    <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                        <span className="text-sm font-medium">{selectedService.name} ({selectedService.price} {currency})</span>
                                        <button onClick={() => { setSelectedService(null); setServiceSearch(''); }}><X size={14} /></button>
                                    </div>
                                )}
                                {showServiceDropdown && !selectedService && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {filteredServices.slice(0, 100).map(s => (
                                            <div key={s.id} onClick={() => { setSelectedService(s); setShowServiceDropdown(false); setServiceSearch(''); setAddForm(f => ({ ...f, revenue: s.price })); }} className="p-3 hover:bg-gray-50 cursor-pointer">
                                                {s.name} - {s.price} {currency}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">{t('bookings:date')} *</label>
                                    <CRMDatePicker value={addForm.date} onChange={(v) => setAddForm(f => ({ ...f, date: v }))} className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">{t('bookings:time')} *</label>
                                    <input type="time" value={addForm.time} onChange={(e) => setAddForm(f => ({ ...f, time: e.target.value }))} className="input-field" />
                                </div>
                            </div>

                            <div>
                                <label className="input-label">{t('bookings:master')}</label>
                                <select value={addForm.master} onChange={(e) => setAddForm(f => ({ ...f, master: e.target.value }))} className="input-field">
                                    <option value="">{t('bookings:select_master')}</option>
                                    {masters.map(m => <option key={m.id} value={String(m.id)}>{m.full_name || m.username}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="input-label">{t('bookings:price')} ({currency})</label>
                                <input type="number" value={addForm.revenue} onChange={(e) => setAddForm(f => ({ ...f, revenue: parseFloat(e.target.value) || 0 }))} className="input-field" />
                            </div>

                            <div>
                                <label className="input-label">{t('bookings:phone')}</label>
                                <input type="tel" value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => { setShowAddDialog(false); resetForm(); }}>{t('common:cancel')}</button>
                            <button className="btn-primary" onClick={handleAddBooking} disabled={addingBooking}>{addingBooking ? t('common:saving') : t('common:save')}</button>
                        </div>
                    </div>
                </div>
            )}

            {showImportDialog && (
                <div
                    className="modal-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowImportDialog(false);
                        }
                    }}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{t('bookings:import_title')}</h3>
                            <button className="modal-close" onClick={() => setShowImportDialog(false)}>×</button>
                        </div>
                        <div className="modal-body space-y-6">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold mb-1">{t('bookings:file_format')}</p>
                                    <p>{t('bookings:supported_formats')}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleDownloadTemplate('csv')} className="text-sm text-pink-600 hover:underline">{t('bookings:csv_template')}</button>
                                <button onClick={() => handleDownloadTemplate('excel')} className="text-sm text-pink-600 hover:underline">{t('bookings:excel_template')}</button>
                            </div>
                            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFileSelect} className="w-full p-4 border-2 border-dashed rounded-xl" />
                            {importResult && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <p className="font-bold">{t('bookings:import_results')}:</p>
                                    <p>{t('bookings:imported')}: {importResult.imported}</p>
                                    <p>{t('bookings:skipped')}: {importResult.skipped}</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowImportDialog(false)}>{t('common:close')}</button>
                            <button className="btn-primary" onClick={handleImport} disabled={importing || !importFile}>{importing ? t('bookings:importing') : t('bookings:import')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
