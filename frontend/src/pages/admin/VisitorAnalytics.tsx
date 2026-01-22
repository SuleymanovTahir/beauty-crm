// /frontend/src/pages/admin/VisitorAnalytics.tsx
import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { MapPin, RefreshCw, Download, Loader, ChevronLeft, ChevronRight, Home, Globe, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { visitorApi } from '../../services/visitorApi';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PeriodFilter } from '../../components/shared/PeriodFilter';
import { useTranslation } from 'react-i18next';
// Removed heavy import: import * as Flags from 'country-flag-icons/react/3x2';
import { getCountryCode } from '../../utils/countryCodes';
import './VisitorAnalytics.css';

interface Visitor {
    ip_hash: string;
    city: string;
    country: string;
    distance_km: number;
    is_local: boolean;
    page_url: string;
    visited_at: string;
    ip_address?: string;
    referrer?: string;
    device_type?: string;
    browser?: string;
}

const COLORS = [
    'var(--chart-pink)',
    'var(--chart-purple)',
    'var(--chart-cyan)',
    'var(--chart-green)',
    'var(--chart-amber)',
    'var(--chart-red)',
    '#3b82f6', // blue
    '#14b8a6'  // teal
];

// Optimized: Uses CDN images instead of bundling 200+ React components
const CountryFlag = ({ countryName, className }: { countryName: string, className?: string }) => {
    const code = getCountryCode(countryName);
    if (!code) return <Globe className={className || "w-4 h-4 text-gray-400"} />;

    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
            width="20"
            height="15"
            alt={countryName}
            className={`${className || "w-5 h-4"} object-cover rounded-sm`}
            // @ts-ignore
            loading="lazy"
        />
    );
};

export default function VisitorAnalytics() {
    const { t } = useTranslation('admin/visitoranalytics');
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [locationBreakdown, setLocationBreakdown] = useState<any>(null);
    const [countryBreakdown, setCountryBreakdown] = useState<any[]>([]);
    const [cityBreakdown, setCityBreakdown] = useState<any[]>([]);
    const [distanceBreakdown, setDistanceBreakdown] = useState<any>(null);
    const [visitorTrend, setVisitorTrend] = useState<any[]>([]);
    const [landingSections, setLandingSections] = useState<any[]>([]);
    const [peakHours, setPeakHours] = useState<any[]>([]);

    // New metrics state
    const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
    const [browserBreakdown, setBrowserBreakdown] = useState<any[]>([]);
    const [retentionStats, setRetentionStats] = useState<any[]>([]);
    const [funnelStats, setFunnelStats] = useState<any[]>([]);
    const [referrers, setReferrers] = useState<any[]>([]);
    const [realtimeVisitors, setRealtimeVisitors] = useState<number>(0);
    const [durationStats, setDurationStats] = useState<any[]>([]);
    const [loyaltyStats, setLoyaltyStats] = useState<any[]>([]);
    const [deviceBounces, setDeviceBounces] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [sourceConversion, setSourceConversion] = useState<any[]>([]);
    const [exitPages, setExitPages] = useState<any[]>([]);

    // Period filter states
    const [period, setPeriod] = useState('7');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Distance selector states - FROM and TO
    const [distanceFrom, setDistanceFrom] = useState('0');
    const [distanceTo, setDistanceTo] = useState('20');
    const [showCustomDistance, setShowCustomDistance] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Unified filter state
    const [distanceFilter, setDistanceFilter] = useState<{ min: number; max: number } | null>(null);
    const [dateFilter, setDateFilter] = useState<string | null>(null);
    const [hourFilter, setHourFilter] = useState<string | null>(null);
    const [sectionFilter, setSectionFilter] = useState<string | null>(null);
    const [cityFilter, setCityFilter] = useState<string | null>(null);
    const [countryFilter, setCountryFilter] = useState<string | null>(null);
    const [sourceFilter, setSourceFilter] = useState<string | null>(null);
    const [deviceFilter, setDeviceFilter] = useState<string | null>(null);
    const [browserFilter, setBrowserFilter] = useState<string | null>(null);

    // Sorting states
    const [sortField, setSortField] = useState<'ip_address' | 'city' | 'country' | 'distance_km' | 'visited_at' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Ref for scrolling to table
    const visitorsTableRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (period !== 'custom') {
            // Use startTransition to mark data loading as non-urgent
            // This prevents blocking the initial render
            startTransition(() => {
                loadData();
            });
        }
    }, [period, distanceTo]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Map period identifiers
            const periodMap: Record<string, string> = {
                'today': 'day',
                '3': '3',
                '7': 'week',
                '14': '14',
                '30': 'month',
                '90': '90'
            };

            const periodValue = periodMap[period] || 'week';
            const maxDist = Number(distanceTo);

            console.log('⏱️ [VisitorAnalytics] Requesting dashboard data...');
            const startTime = performance.now();

            // Используем консолидированный endpoint для оптимизации (1 запрос вместо 8)
            // Передаем dateFrom и dateTo только если выбран 'custom'
            const dashboardData = await visitorApi.getDashboard(
                periodValue,
                maxDist,
                period === 'custom' ? dateFrom : undefined,
                period === 'custom' ? dateTo : undefined
            );

            const endTime = performance.now();
            console.log(`⏱️ [VisitorAnalytics] Request took ${(endTime - startTime).toFixed(2)}ms`);

            // Hide loading immediately after API response - BEFORE processing data
            setLoading(false);

            if (dashboardData.success && dashboardData.data) {
                const data = dashboardData.data;
                
                // Helper to translate chart data
                const translateData = (arr: any[], keyMap: Record<string, string>) =>
                    arr.map(item => ({
                        ...item,
                        name: keyMap[item.name] ? t(keyMap[item.name]) : (item.name || t('other'))
                    }));

                const translateFunnel = (arr: any[], keyMap: Record<string, string>) =>
                    arr.map(item => ({
                        ...item,
                        step: keyMap[item.step] ? t(keyMap[item.step]) : (item.step)
                    }));

                // Use startTransition to mark state updates as non-urgent
                // This allows React to keep UI responsive while processing data
                startTransition(() => {
                    const deviceMap: Record<string, string> = {
                        'Desktop': 'desktop', 'Mobile': 'mobile', 'Tablet': 'tablet', 'Other': 'other'
                    };
                    
                    setVisitors(data.visitors || []);
                    setLocationBreakdown(data.location_breakdown);
                    setCountryBreakdown(data.countries || []);
                    setCityBreakdown(data.cities || []);
                    setDistanceBreakdown(data.distance_breakdown);
                    setVisitorTrend(data.trend || []);
                    setLandingSections(data.sections || []);
                    setPeakHours(data.hours || []);
                    setDeviceBreakdown(translateData(data.devices || [], deviceMap));
                    setBrowserBreakdown((data.browsers || []).map((b: any) => ({
                        ...b,
                        name: b.name === 'Other' || b.name === 'Unknown' ? t('other') : b.name
                    })));

                    const retentionMap: Record<string, string> = {
                        'New Visitors': 'new_visitors',
                        'Returning Visitors': 'returning_visitors'
                    };
                    setRetentionStats(translateData(data.retention || [], retentionMap));

                    const funnelMap: Record<string, string> = {
                        'Landed': 'landed',
                        'Viewed Services': 'viewed_services',
                        'Clicked Book': 'clicked_book',
                        'Completed': 'completed'
                    };
                    setFunnelStats(translateFunnel(data.funnel || [], funnelMap));

                    const loyaltyMap: Record<string, string> = {
                        '1_visit': '1_visit',
                        '2_4_visits': '2_4_visits',
                        '5_plus_visits': '5_plus_visits'
                    };
                    setLoyaltyStats(translateData(data.loyalty || [], loyaltyMap));

                    setDeviceBounces(data.device_bounces || []);
                    setHeatmapData(data.heatmap || []);
                    setSourceConversion(data.source_conversion || []);
                    setExitPages(data.exit_pages || []);

                    const durationMap: Record<string, string> = {
                        'single_page': 'single_page',
                        'less_30s': 'less_30s',
                        '1_5m': '1_5m',
                        '5_10m': '5_10m',
                        '10_15m': '10_15m',
                        'more_15m': 'more_15m'
                    };
                    setDurationStats(translateData(data.durations || [], durationMap));

                    setReferrers(data.referrers || []);
                    setRealtimeVisitors(data.realtime_visitors || 0);
                    setCurrentPage(1);
                    // Reset filters on reload
                    setDistanceFilter(null);
                    setDateFilter(null);
                    setHourFilter(null);
                    setSectionFilter(null);
                    setCityFilter(null);
                    setCountryFilter(null);
                    setSourceFilter(null);
                    setDeviceFilter(null);
                    setBrowserFilter(null);
                });
            } else {
                setCurrentPage(1);
                // Reset filters on reload
                setDistanceFilter(null);
                setDateFilter(null);
                setHourFilter(null);
                setSectionFilter(null);
                setCityFilter(null);
                setCountryFilter(null);
                setSourceFilter(null);
                setDeviceFilter(null);
                setBrowserFilter(null);
            }
        } catch (error) {
            console.error('Error loading visitor data:', error);
            toast.error(t('error_loading'));
            setLoading(false);
        }
    };

    const handlePeriodChange = (value: string) => {
        setPeriod(value);
        if (value !== 'custom') {
            setDateFrom('');
            setDateTo('');
        }
    };

    const handleApplyCustomDates = () => {
        if (!dateFrom || !dateTo) {
            toast.error(t('select_both_dates'));
            return;
        }
        if (dateFrom > dateTo) {
            toast.error(t('invalid_date_range'));
            return;
        }
        loadData();
    };

    const handleExportCSV = async () => {
        try {
            setExporting(true);
            const periodValue = period === 'today' ? 'day' : period === '7' ? 'week' : period === '30' ? 'month' : 'week';
            const blob = await visitorApi.exportVisitorAnalytics(periodValue);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `visitor_analytics_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(t('file_downloaded'));
        } catch (err) {
            console.error('Export error:', err);
            toast.error(t('export_failed'));
        } finally {
            setExporting(false);
        }
    };



    // Distance ranges for chart click filtering
    const distanceRanges = useMemo(() => {
        const maxDist = Number(distanceTo);
        if (maxDist <= 5) {
            return [
                { min: 0, max: 1 },
                { min: 1, max: 2 },
                { min: 2, max: 5 },
            ];
        } else if (maxDist <= 20) {
            return [
                { min: 0, max: 1 },
                { min: 1, max: 2 },
                { min: 2, max: 5 },
                { min: 5, max: 10 },
                { min: 10, max: 15 },
                { min: 15, max: 20 },
            ];
        } else {
            return [
                { min: 0, max: 1 },
                { min: 1, max: 2 },
                { min: 2, max: 5 },
                { min: 5, max: 10 },
                { min: 10, max: 15 },
                { min: 15, max: 20 },
                { min: 20, max: maxDist },
            ];
        }
    }, [distanceTo]);

    // Prepare chart data with memoization
    const distanceChartData = useMemo(() => {
        const maxDist = Number(distanceTo);
        // Helper function for ranges
        const getRanges = () => {
            if (maxDist <= 5) {
                return [
                    { name: t('distance_range_under', { count: 1 }), value: distanceBreakdown?.within_1km || 0, fill: COLORS[0], rangeIndex: 0 },
                    { name: t('distance_range_between', { min: 1, max: 2 }), value: distanceBreakdown?.within_2km || 0, fill: COLORS[1], rangeIndex: 1 },
                    { name: t('distance_range_between', { min: 2, max: 5 }), value: distanceBreakdown?.within_5km || 0, fill: COLORS[2], rangeIndex: 2 },
                ];
            } else if (maxDist <= 20) {
                return [
                    { name: t('distance_range_under', { count: 1 }), value: distanceBreakdown?.within_1km || 0, fill: COLORS[0], rangeIndex: 0 },
                    { name: t('distance_range_between', { min: 1, max: 2 }), value: distanceBreakdown?.within_2km || 0, fill: COLORS[1], rangeIndex: 1 },
                    { name: t('distance_range_between', { min: 2, max: 5 }), value: distanceBreakdown?.within_5km || 0, fill: COLORS[2], rangeIndex: 2 },
                    { name: t('distance_range_between', { min: 5, max: 10 }), value: distanceBreakdown?.within_10km || 0, fill: COLORS[3], rangeIndex: 3 },
                    { name: t('distance_range_between', { min: 10, max: 15 }), value: distanceBreakdown?.within_15km || 0, fill: COLORS[4], rangeIndex: 4 },
                    { name: t('distance_range_between', { min: 15, max: 20 }), value: distanceBreakdown?.within_20km || 0, fill: COLORS[5], rangeIndex: 5 },
                ];
            } else {
                return [
                    { name: t('distance_range_under', { count: 1 }), value: distanceBreakdown?.within_1km || 0, fill: COLORS[0], rangeIndex: 0 },
                    { name: t('distance_range_between', { min: 1, max: 2 }), value: distanceBreakdown?.within_2km || 0, fill: COLORS[1], rangeIndex: 1 },
                    { name: t('distance_range_between', { min: 2, max: 5 }), value: distanceBreakdown?.within_5km || 0, fill: COLORS[2], rangeIndex: 2 },
                    { name: t('distance_range_between', { min: 5, max: 10 }), value: distanceBreakdown?.within_10km || 0, fill: COLORS[3], rangeIndex: 3 },
                    { name: t('distance_range_between', { min: 10, max: 15 }), value: distanceBreakdown?.within_15km || 0, fill: COLORS[4], rangeIndex: 4 },
                    { name: t('distance_range_between', { min: 15, max: 20 }), value: distanceBreakdown?.within_20km || 0, fill: COLORS[5], rangeIndex: 5 },
                    { name: t('distance_range_between', { min: 20, max: maxDist }), value: distanceBreakdown?.[`within_${maxDist}km`] || 0, fill: COLORS[6], rangeIndex: 6 },
                ];
            }
        };
        return getRanges();
    }, [distanceTo, distanceBreakdown, t]);

    // Handle click on distance chart bar
    const handleDistanceBarClick = (data: any, index: number) => {
        // Try to get range from index first, then from payload
        let rangeIndex = index;
        if (data && data.activePayload && data.activePayload[0]) {
            rangeIndex = data.activePayload[0].payload.rangeIndex ?? index;
        }

        const range = distanceRanges[rangeIndex];
        if (range) {
            setDistanceFilter(range);
            setCurrentPage(1);
            scrollToTable();
        }
    };

    // Reliable scroll helper
    const scrollToTable = () => {
        // Use a slightly longer timeout to ensure UI has updated and ref is stable
        setTimeout(() => {
            if (visitorsTableRef.current) {
                // Determine if we need to scroll (e.g. if table is not in view) or just force it
                visitorsTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    };

    const clearDistanceFilter = () => {
        setDistanceFilter(null);
        setCurrentPage(1);
    };

    const clearDateFilter = () => {
        setDateFilter(null);
        setCurrentPage(1);
    };

    const clearHourFilter = () => {
        setHourFilter(null);
        setCurrentPage(1);
    };

    const clearSectionFilter = () => {
        setSectionFilter(null);
        setCurrentPage(1);
    };

    const clearCityFilter = () => {
        setCityFilter(null);
        setCurrentPage(1);
    };

    const clearCountryFilter = () => {
        setCountryFilter(null);
        setCurrentPage(1);
    };

    const clearSourceFilter = () => {
        setSourceFilter(null);
        setCurrentPage(1);
    };

    const clearDeviceFilter = () => {
        setDeviceFilter(null);
        setCurrentPage(1);
    };

    const clearBrowserFilter = () => {
        setBrowserFilter(null);
        setCurrentPage(1);
    };

    // Chart Click Handlers
    const handleTrendClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            // Reconstruct full date string from payload if needed
            // The payload usually contains the full data object passed to the chart
            // We need the original 'date' string (not the formatted one if possible, but we formatted it in useMemo)
            // Let's rely on finding the matching item from visitorTrend
            const visibleDate = data.activePayload[0].payload.date; // "10 окт." or similar
            // Find the original date in visitorTrend
            const originalItem = visitorTrend.find(item =>
                new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) === visibleDate
            );

            if (originalItem) {
                setDateFilter(originalItem.date.split('T')[0]); // YYYY-MM-DD
                setCurrentPage(1);
                scrollToTable();
            }
        }
    };

    const handleSectionClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const sectionName = data.activePayload[0].payload.name;
            // Find section key by matching the translated name back to the original section
            const matchedSection = landingSections.find(s =>
                (t(`section.${s.section.toLowerCase()}`) === sectionName) ||
                s.section === sectionName
            );

            const sectionKey = matchedSection?.section;
            if (sectionKey) {
                setSectionFilter(sectionKey);
                setCurrentPage(1);
                scrollToTable();
            }
        }
    };

    const handleHourClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const hourStr = data.activePayload[0].payload.hour; // "14:00"
            setHourFilter(hourStr);
            setCurrentPage(1);
            scrollToTable();
        }
    };

    const handleCityClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const cityName = data.activePayload[0].payload.name;
            setCityFilter(cityName);
            setCurrentPage(1);
            scrollToTable();
        }
    };

    const handleCountryClick = (_: any, index: number) => {
        // Pie chart click handler provides payload differently or we use index and data source
        // Recharts Pie onClick provides (data, index)
        const countryName = countryPieData[index]?.name;
        if (countryName) {
            setCountryFilter(countryName);
            setCurrentPage(1);
            scrollToTable();
        }
    };

    // Handle sort
    const handleSort = (field: 'ip_address' | 'city' | 'country' | 'distance_km' | 'visited_at') => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else {
                setSortField(null);
                setSortDirection('asc'); // Reset direction for next time
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    // Get sort icon
    const getSortIcon = (field: string) => {
        if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="w-4 h-4 ml-1" />
            : <ArrowDown className="w-4 h-4 ml-1" />;
    };

    const cityChartData = useMemo(() => cityBreakdown.slice(0, 10).map((city, index) => ({
        name: city.city,
        visitors: city.count,
        fill: COLORS[index % COLORS.length]
    })), [cityBreakdown]);

    const countryPieData = useMemo(() => countryBreakdown.slice(0, 6).map((country) => ({
        name: country.country,
        value: country.count,
        percentage: country.percentage
    })), [countryBreakdown]);

    const trendChartData = useMemo(() => visitorTrend.map(item => ({
        date: new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        visitors: item.count,
        fullDate: item.date // Keep original date for filtering
    })), [visitorTrend]);

    const sectionsChartData = useMemo(() => landingSections.slice(0, 8).map((section, index) => ({
        name: t(`section.${section.section.toLowerCase()}`) || section.section,
        visitors: section.count,
        fill: COLORS[index % COLORS.length],
        originalSection: section.section // Keep original key for filtering
    })), [landingSections, t]);

    const hoursChartData = useMemo(() => peakHours.map(item => ({
        hour: item.hour,
        visitors: item.count
    })), [peakHours]);

    const conversionRate = useMemo(() => locationBreakdown?.total > 0
        ? ((locationBreakdown?.local / locationBreakdown?.total) * 100).toFixed(1)
        : 0, [locationBreakdown]);

    // Filter and sort visitors
    const filteredAndSortedVisitors = useMemo(() => {
        let result = [...visitors];

        // Apply distance filter from chart click
        if (distanceFilter) {
            result = result.filter(v => {
                const dist = v.distance_km || 0;
                return dist >= distanceFilter.min && dist < distanceFilter.max;
            });
        }

        // Apply date filter
        if (dateFilter) {
            result = result.filter(v => {
                if (!v.visited_at) return false;
                return v.visited_at.startsWith(dateFilter);
            });
        }

        // Apply hour filter
        if (hourFilter) {
            result = result.filter(v => {
                if (!v.visited_at) return false;
                const d = new Date(v.visited_at);
                const h = d.getHours(); // 0-23
                const filterH = parseInt(hourFilter.split(':')[0], 10);
                return h === filterH;
            });
        }

        // Apply section filter
        if (sectionFilter) {
            result = result.filter(v => {
                // Approximate match for section
                const url = v.page_url || '';
                if (sectionFilter.toLowerCase() === 'hero') {
                    return url === '/' || url.endsWith('/') || !url;
                }
                return url.toLowerCase().includes(sectionFilter.toLowerCase());
            });
        }

        // Apply city filter
        if (cityFilter) {
            result = result.filter(v => v.city === cityFilter);
        }

        // Apply country filter
        if (countryFilter) {
            result = result.filter(v => v.country === countryFilter);
        }

        // Apply source filter
        if (sourceFilter) {
            result = result.filter(v => v.referrer === sourceFilter);
        }

        // Apply device filter
        if (deviceFilter) {
            result = result.filter(v => v.device_type === deviceFilter);
        }

        // Apply browser filter
        if (browserFilter) {
            result = result.filter(v => v.browser === browserFilter);
        }

        // Apply sorting
        if (sortField) {
            result.sort((a, b) => {
                let aVal: any = a[sortField];
                let bVal: any = b[sortField];

                // Handle null/undefined
                if (aVal == null) aVal = '';
                if (bVal == null) bVal = '';

                // Handle dates
                if (sortField === 'visited_at') {
                    aVal = new Date(aVal).getTime();
                    bVal = new Date(bVal).getTime();
                }

                // Handle numbers
                if (sortField === 'distance_km') {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                }

                // Compare
                if (typeof aVal === 'string') {
                    const cmp = aVal.localeCompare(bVal);
                    return sortDirection === 'asc' ? cmp : -cmp;
                }
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            });
        }

        return result;
    }, [visitors, distanceFilter, dateFilter, hourFilter, sectionFilter, cityFilter, countryFilter, sourceFilter, deviceFilter, browserFilter, sortField, sortDirection]);

    // Pagination
    const { totalPages, currentVisitors, startIndex, endIndex, totalFiltered } = useMemo(() => {
        const totalFiltered = filteredAndSortedVisitors.length;
        const totalPages = Math.ceil(totalFiltered / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentVisitors = filteredAndSortedVisitors.slice(startIndex, endIndex);
        return { totalPages, currentVisitors, startIndex, endIndex, totalFiltered };
    }, [filteredAndSortedVisitors, currentPage, itemsPerPage]);

    if (loading) {
        return (
            <div className="visitor-analytics-loader-container p-4 md:p-8 flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="visitor-analytics-loader-icon w-8 h-8 text-pink-600 animate-spin" />
                    <p className="visitor-analytics-loader-text text-base text-gray-600">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="visitor-analytics-container p-4 md:p-8 pb-20 md:pb-8">
            {/* Header */}
            <div className="visitor-analytics-header mb-6 md:mb-8">
                <h1 className="visitor-analytics-title text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-3">
                    <MapPin className="visitor-analytics-title-icon w-8 h-8" />
                    <span>{t('title')}</span>
                </h1>
                <p className="visitor-analytics-subtitle text-sm md:text-base text-gray-600">
                    {t('subtitle')}
                </p>
            </div>

            {/* Filters */}
            <div className="visitor-analytics-filter-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="visitor-analytics-filter-row flex flex-col sm:flex-row gap-3 sm:gap-4 sm:flex-wrap sm:items-end">
                    <PeriodFilter
                        period={period}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onPeriodChange={handlePeriodChange}
                        onDateFromChange={setDateFrom}
                        onDateToChange={setDateTo}
                        showAllOption={false}
                    />

                    {period === 'custom' && (
                        <Button onClick={handleApplyCustomDates} className="visitor-analytics-apply-button bg-pink-600 hover:bg-pink-700 w-full sm:w-auto">
                            {t('apply')}
                        </Button>
                    )}

                    <Button variant="outline" onClick={loadData} className="visitor-analytics-refresh-button md:ml-auto">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t('refresh')}
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="visitor-analytics-export-button bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {exporting ? t('exporting') : t('export_csv')}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{t('live_now')}</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-gray-900">{realtimeVisitors}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t('active_visitors')}</p>
                </div>

                <div className="visitor-analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {locationBreakdown?.total || 0}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{t('total_visitors')}</p>
                    <div className="text-xs md:text-sm text-pink-600">
                        {period === 'custom'
                            ? `${dateFrom ? new Date(dateFrom).toLocaleDateString() : ''} - ${dateTo ? new Date(dateTo).toLocaleDateString() : ''}`
                            : period === 'today'
                                ? t('today', { defaultValue: 'Сегодня' })
                                : t('last_n_days', { count: parseInt(period) || 7 })
                        }
                    </div>
                </div>

                <div className="visitor-analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {conversionRate}%
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{t('local_visitors', { max: distanceTo })}</p>
                    <div className="visitor-analytics-local-visitors text-xs md:text-sm text-green-600">
                        {t('visitors_count', { count: locationBreakdown?.local || 0 })}
                    </div>
                </div>

                <div className="visitor-analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {countryBreakdown.length}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{t('countries')}</p>
                    <div className="visitor-analytics-geographic-reach text-xs md:text-sm text-blue-600">
                        {t('geographic_reach')}
                    </div>
                </div>

                <div className="visitor-analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {cityBreakdown.length}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{t('cities')}</p>
                    <div className="visitor-analytics-unique-locations text-xs md:text-sm text-blue-600">
                        {t('unique_locations')}
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
                {/* Distance Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col gap-4 mb-6">
                        <h2 className="text-xl text-gray-900">{t('distance_distribution')}</h2>
                        <div className="flex gap-2 items-center flex-wrap">
                            <select
                                value={showCustomDistance ? 'custom' : distanceTo}
                                onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setShowCustomDistance(true);
                                    } else {
                                        setShowCustomDistance(false);
                                        setDistanceTo(e.target.value);
                                    }
                                }}
                                className="visitor-analytics-distance-select px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                            >
                                <option value="1">{t('distance_up_to', { count: 1 })}</option>
                                <option value="2">{t('distance_up_to', { count: 2 })}</option>
                                <option value="5">{t('distance_up_to', { count: 5 })}</option>
                                <option value="10">{t('distance_up_to', { count: 10 })}</option>
                                <option value="15">{t('distance_up_to', { count: 15 })}</option>
                                <option value="20">{t('distance_up_to', { count: 20 })}</option>
                                <option value="50">{t('distance_up_to', { count: 50 })}</option>
                                <option value="100">{t('distance_up_to', { count: 100 })}</option>
                                <option value="custom">{t('custom_range')}</option>
                            </select>
                            {showCustomDistance && (
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm text-gray-600">{t('from')}:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1000"
                                        placeholder="0"
                                        value={distanceFrom}
                                        onChange={(e) => setDistanceFrom(e.target.value)}
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                    <span className="text-sm text-gray-600">{t('to')}:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        placeholder="20"
                                        value={distanceTo}
                                        onChange={(e) => setDistanceTo(e.target.value)}
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                    <span className="text-sm text-gray-600">{t('km')}</span>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const from = Number(distanceFrom);
                                            const to = Number(distanceTo);
                                            if (from >= 0 && to > from && to <= 1000) {
                                                setShowCustomDistance(false);
                                                loadData();
                                            } else {
                                                toast.error(t('check_range'));
                                            }
                                        }}
                                    >
                                        OK
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{t('click_to_filter')}</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={distanceChartData} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--visitor-chart-grid)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar
                                dataKey="value"
                                name={t('visitors')}
                                radius={[8, 8, 0, 0]}
                                onClick={(data, index) => handleDistanceBarClick(data, index)}
                            >
                                {distanceChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer hover:opacity-80" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Visitor Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-2">{t('visitor_trend')}</h2>
                    <p className="text-sm text-gray-600 mb-4">{t('trend_subtitle')}</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendChartData} onClick={handleTrendClick} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--visitor-chart-grid)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="visitors"
                                name={t('visitors')}
                                stroke="#ec4899"
                                strokeWidth={2}
                                dot={{ fill: '#ec4899' }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Cities */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('top_cities')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cityChartData} layout="vertical" onClick={handleCityClick} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--visitor-chart-grid)" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                            <Tooltip />
                            <Bar dataKey="visitors" name={t('visitors')} radius={[0, 4, 4, 0]}>
                                {cityChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer hover:opacity-80" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Country Distribution with Flags */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('country_distribution')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={countryPieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                onClick={handleCountryClick}
                                style={{ cursor: 'pointer' }}
                            >
                                {countryPieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer hover:opacity-80" />
                                ))}
                            </Pie>
                            <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md flex items-center gap-2">
                                            <CountryFlag countryName={data.name} className="w-5 h-5 shadow-sm rounded-sm" />
                                            <span className="font-medium">{data.name}</span>
                                            <span className="text-gray-600">: {data.value} ({data.percentage}%)</span>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Landing Sections */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-2">{t('landing_sections')}</h2>
                    <p className="text-sm text-gray-600 mb-4">{t('sections_subtitle')}</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sectionsChartData} onClick={handleSectionClick} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--visitor-chart-grid)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="visitors" name={t('visitors')} radius={[8, 8, 0, 0]}>
                                {sectionsChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer hover:opacity-80" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Peak Hours */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-2">{t('peak_hours')}</h2>
                    <p className="text-sm text-gray-600 mb-4">{t('peak_hours_subtitle')}</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={hoursChartData} onClick={handleHourClick} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--visitor-chart-grid)" />
                            <XAxis
                                dataKey="hour"
                                tick={{ fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="visitors" name={t('visitors')} fill="#f59e0b" radius={[4, 4, 0, 0]} className="cursor-pointer hover:opacity-80" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Retention & Funnel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('retention_analysis')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={retentionStats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" name={t('visitors')} fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('conversion_funnel')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={funnelStats} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="step" type="category" width={120} style={{ fontSize: '11px' }} />
                            <Tooltip />
                            <Bar dataKey="value" name={t('count')} fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Device & Browser */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('device_breakdown')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={deviceBreakdown}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {deviceBreakdown.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('browser_breakdown')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={browserBreakdown}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {browserBreakdown.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Session Duration & Referrers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('session_duration')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={durationStats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" name={t('visitors')} fill="#ffc658" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('top_referrers')}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 font-medium text-gray-500">{t('source')}</th>
                                    <th className="text-right py-2 font-medium text-gray-500">{t('visitors')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrers.length > 0 ? referrers.map((ref, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                        <td className="py-2 text-gray-800">{ref.name || t('direct_unknown')}</td>
                                        <td className="text-right py-2 font-medium text-gray-900">{ref.value}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={2} className="py-4 text-center text-gray-400">{t('no_data')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* New Charts: Conversion & Exit Pages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('source_conversion')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sourceConversion} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name={t('conversions')} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('exit_pages')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={exitPages} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name={t('exits')} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* New Charts: Loyalty & Device Bounces */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('loyalty_stats')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={loyaltyStats}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {loyaltyStats.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('device_bounce_rate')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={deviceBounces}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis unit="%" />
                            <Tooltip formatter={(val) => `${val}%`} />
                            <Bar dataKey="rate" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('bounce_rate')} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Heatmap (Simplified as Table/Grid) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <h2 className="text-xl text-gray-900 mb-6">{t('activity_heatmap')}</h2>
                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        {/* Header: Hours 0-23 */}
                        <div className="flex">
                            <div className="w-20 shrink-0"></div>
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="flex-1 text-xs text-center text-gray-500">{h}</div>
                            ))}
                        </div>
                        {/* Rows: Days 0-6 */}
                        {[1, 2, 3, 4, 5, 6, 0].map(day => (
                            <div key={day} className="flex items-center mt-1">
                                <div className="w-20 shrink-0 text-sm font-medium text-gray-700">
                                    {new Date(2024, 0, day === 0 ? 7 : day).toLocaleDateString('ru-RU', { weekday: 'short' })}
                                </div>
                                {Array.from({ length: 24 }).map((_, h) => {
                                    const cell = heatmapData.find(d => d.day === day && d.hour === h);
                                    const val = cell ? cell.value : 0;
                                    const opacity = Math.min(val / 5, 1);
                                    return (
                                        <div key={h} className="flex-1 h-8 mx-0.5 rounded-sm relative group" style={{ backgroundColor: `rgba(236, 72, 153, ${opacity || 0.05})` }}>
                                            {val > 0 && (
                                                <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/80 text-white text-[10px] rounded z-10 pointer-events-none">
                                                    {val}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Visitors Table */}
            <div ref={visitorsTableRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl text-gray-900">{t('latest_visitors')}</h2>
                        {distanceFilter && (
                            <div className="flex items-center gap-2 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
                                <span>{distanceFilter.min}-{distanceFilter.max} {t('km')}</span>
                                <button onClick={clearDistanceFilter} className="hover:bg-pink-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {dateFilter && (
                            <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                                <span>{new Date(dateFilter).toLocaleDateString()}</span>
                                <button onClick={clearDateFilter} className="hover:bg-purple-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {hourFilter && (
                            <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                                <span>{hourFilter}</span>
                                <button onClick={clearHourFilter} className="hover:bg-amber-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {sectionFilter && (
                            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                <span>{t(`section.${sectionFilter.toLowerCase()}`) || sectionFilter}</span>
                                <button onClick={clearSectionFilter} className="hover:bg-blue-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {cityFilter && (
                            <div className="flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm">
                                <span>{cityFilter}</span>
                                <button onClick={clearCityFilter} className="hover:bg-teal-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {countryFilter && (
                            <div className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                                <CountryFlag countryName={countryFilter} className="w-4 h-4 rounded-sm" />
                                <span>{countryFilter}</span>
                                <button onClick={clearCountryFilter} className="hover:bg-indigo-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {sourceFilter && (
                            <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                                <span>{sourceFilter}</span>
                                <button onClick={clearSourceFilter} className="hover:bg-orange-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {deviceFilter && (
                            <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                <span>{t(deviceFilter.toLowerCase() || 'other', { defaultValue: deviceFilter })}</span>
                                <button onClick={clearDeviceFilter} className="hover:bg-gray-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {browserFilter && (
                            <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                <span>{browserFilter}</span>
                                <button onClick={clearBrowserFilter} className="hover:bg-gray-200 rounded-full p-0.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-sm text-gray-600">
                        {t('showing')} {totalFiltered > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, totalFiltered)} {t('of')} {totalFiltered}
                        {(distanceFilter || dateFilter || hourFilter || sectionFilter || cityFilter || countryFilter || sourceFilter || deviceFilter || browserFilter) && ` (${t('filtered')})`}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                    onClick={() => handleSort('ip_address')}
                                >
                                    <div className="flex items-center">
                                        {t('ip_address')}
                                        {getSortIcon('ip_address')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                    onClick={() => handleSort('city')}
                                >
                                    <div className="flex items-center">
                                        {t('city')}
                                        {getSortIcon('city')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                    onClick={() => handleSort('country')}
                                >
                                    <div className="flex items-center">
                                        {t('country')}
                                        {getSortIcon('country')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600 select-none">
                                    {t('source')}
                                </th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600 select-none">
                                    {t('device')}
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                    onClick={() => handleSort('distance_km')}
                                >
                                    <div className="flex items-center">
                                        {t('distance')}
                                        {getSortIcon('distance_km')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                    onClick={() => handleSort('visited_at')}
                                >
                                    <div className="flex items-center">
                                        {t('visit_time')}
                                        {getSortIcon('visited_at')}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentVisitors.map((visitor, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono truncate max-w-[120px]" title={visitor.ip_address}>{visitor.ip_address || '-'}</td>
                                    <td
                                        className="px-6 py-4 text-sm text-gray-900 truncate max-w-[120px] cursor-pointer hover:text-pink-600 hover:underline"
                                        title={visitor.city}
                                        onClick={() => setCityFilter(visitor.city)}
                                    >
                                        {visitor.city || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {visitor.country ? (
                                            <div
                                                className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                                                onClick={() => setCountryFilter(visitor.country)}
                                            >
                                                <CountryFlag countryName={visitor.country} className="w-5 h-5 shadow-sm rounded-sm" />
                                                <span className="truncate max-w-[100px] hover:underline" title={visitor.country}>{visitor.country}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td
                                        className="px-6 py-4 text-sm text-gray-600 truncate max-w-[150px] cursor-pointer hover:text-pink-600 hover:underline"
                                        title={visitor.referrer}
                                        onClick={() => visitor.referrer && setSourceFilter(visitor.referrer)}
                                    >
                                        {visitor.referrer || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div className="flex flex-col">
                                            <span
                                                className="font-medium cursor-pointer hover:text-pink-600 hover:underline"
                                                onClick={() => setDeviceFilter(visitor.device_type || null)}
                                            >
                                                {t(visitor.device_type?.toLowerCase() || 'other', { defaultValue: visitor.device_type })}
                                            </span>
                                            <span
                                                className="text-xs text-gray-400 cursor-pointer hover:text-pink-600 hover:underline"
                                                onClick={() => setBrowserFilter(visitor.browser || null)}
                                            >
                                                {visitor.browser}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div className="flex items-center gap-1">
                                            <span>{visitor.distance_km != null ? Math.round(visitor.distance_km) : '-'}</span>
                                            <span className="text-gray-500 text-xs">{t('km')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">
                                                {visitor.visited_at ? new Date(visitor.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {visitor.visited_at ? new Date(visitor.visited_at).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            {t('previous')}
                        </Button>
                        <span className="text-sm text-gray-600">
                            {t('page')} {currentPage} {t('of')} {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            {t('next')}
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
