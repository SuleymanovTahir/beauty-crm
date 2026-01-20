// /frontend/src/pages/admin/VisitorAnalytics.tsx
import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Download, Loader, ChevronLeft, ChevronRight, Home, Globe } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { visitorApi } from '../../services/visitorApi';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PeriodFilter } from '../../components/shared/PeriodFilter';
import { useTranslation } from 'react-i18next';
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

// Country code to flag emoji mapping
const getCountryFlag = (_countryName: string): string => {
    return '';
};

export default function VisitorAnalytics() {
    const { t, i18n } = useTranslation('admin/visitoranalytics');
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [locationBreakdown, setLocationBreakdown] = useState<any>(null);
    const [countryBreakdown, setCountryBreakdown] = useState<any[]>([]);
    const [cityBreakdown, setCityBreakdown] = useState<any[]>([]);
    const [distanceBreakdown, setDistanceBreakdown] = useState<any>(null);
    const [visitorTrend, setVisitorTrend] = useState<any[]>([]);
    const [landingSections, setLandingSections] = useState<any[]>([]);
    const [peakHours, setPeakHours] = useState<any[]>([]);

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

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (period !== 'custom') {
            loadData();
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

            // Используем консолидированный endpoint для оптимизации (1 запрос вместо 8)
            // Передаем dateFrom и dateTo только если выбран 'custom'
            const dashboardData = await visitorApi.getDashboard(
                periodValue,
                maxDist,
                period === 'custom' ? dateFrom : undefined,
                period === 'custom' ? dateTo : undefined
            );

            if (dashboardData.success && dashboardData.data) {
                const data = dashboardData.data;
                setVisitors(data.visitors || []);
                setLocationBreakdown(data.location_breakdown);
                setCountryBreakdown(data.countries || []);
                setCityBreakdown(data.cities || []);
                setDistanceBreakdown(data.distance_breakdown);
                setVisitorTrend(data.trend || []);
                setLandingSections(data.sections || []);
                setPeakHours(data.hours || []);
            }
            setCurrentPage(1);
        } catch (error) {
            console.error('Error loading visitor data:', error);
            toast.error(t('error_loading'));
        } finally {
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

    if (loading) {
        return (
            <div className="visitor-analytics-loader-container p-4 md:p-8 flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="visitor-analytics-loader-icon w-8 h-8 text-pink-600 animate-spin" />
                    <p className="visitor-analytics-loader-text text-base text-gray-600">{t('loading')}</p>
                </div>
            </div>
        );
    };

    // Prepare chart data
    const getDistanceRanges = () => {
        const maxDist = Number(distanceTo);
        if (maxDist <= 5) {
            return [
                { name: t('distance_range_under', { count: 1 }), value: distanceBreakdown?.within_1km || 0, fill: COLORS[0] },
                { name: t('distance_range_between', { min: 1, max: 2 }), value: distanceBreakdown?.within_2km || 0, fill: COLORS[1] },
                { name: t('distance_range_between', { min: 2, max: 5 }), value: distanceBreakdown?.within_5km || 0, fill: COLORS[2] },
            ];
        } else if (maxDist <= 20) {
            return [
                { name: t('distance_range_under', { count: 1 }), value: distanceBreakdown?.within_1km || 0, fill: COLORS[0] },
                { name: t('distance_range_between', { min: 1, max: 2 }), value: distanceBreakdown?.within_2km || 0, fill: COLORS[1] },
                { name: t('distance_range_between', { min: 2, max: 5 }), value: distanceBreakdown?.within_5km || 0, fill: COLORS[2] },
                { name: t('distance_range_between', { min: 5, max: 10 }), value: distanceBreakdown?.within_10km || 0, fill: COLORS[3] },
                { name: t('distance_range_between', { min: 10, max: 15 }), value: distanceBreakdown?.within_15km || 0, fill: COLORS[4] },
                { name: t('distance_range_between', { min: 15, max: 20 }), value: distanceBreakdown?.within_20km || 0, fill: COLORS[5] },
            ];
        } else {
            return [
                { name: t('distance_range_under', { count: 1 }), value: distanceBreakdown?.within_1km || 0, fill: COLORS[0] },
                { name: t('distance_range_between', { min: 1, max: 2 }), value: distanceBreakdown?.within_2km || 0, fill: COLORS[1] },
                { name: t('distance_range_between', { min: 2, max: 5 }), value: distanceBreakdown?.within_5km || 0, fill: COLORS[2] },
                { name: t('distance_range_between', { min: 5, max: 10 }), value: distanceBreakdown?.within_10km || 0, fill: COLORS[3] },
                { name: t('distance_range_between', { min: 10, max: 15 }), value: distanceBreakdown?.within_15km || 0, fill: COLORS[4] },
                { name: t('distance_range_between', { min: 15, max: 20 }), value: distanceBreakdown?.within_20km || 0, fill: COLORS[5] },
                { name: t('distance_range_between', { min: 20, max: maxDist }), value: distanceBreakdown?.[`within_${maxDist}km`] || 0, fill: COLORS[6] },
            ];
        }
    };

    const distanceChartData = getDistanceRanges();

    const cityChartData = cityBreakdown.slice(0, 10).map((city, index) => ({
        name: city.city,
        visitors: city.count,
        fill: COLORS[index % COLORS.length]
    }));

    const countryPieData = countryBreakdown.slice(0, 6).map((country) => ({
        name: `${getCountryFlag(country.country)} ${country.country}`,
        value: country.count,
        percentage: country.percentage
    }));

    const trendChartData = visitorTrend.map(item => ({
        date: new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        visitors: item.count
    }));

    const sectionsChartData = landingSections.slice(0, 8).map((section, index) => ({
        name: t(`section.${section.section}`) || section.section,
        visitors: section.count,
        fill: COLORS[index % COLORS.length]
    }));

    const hoursChartData = peakHours.map(item => ({
        hour: item.hour,
        visitors: item.count
    }));

    const conversionRate = locationBreakdown?.total > 0
        ? ((locationBreakdown?.local / locationBreakdown?.total) * 100).toFixed(1)
        : 0;

    // Pagination
    const totalPages = Math.ceil(visitors.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentVisitors = visitors.slice(startIndex, endIndex);

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
                <div className="visitor-analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {locationBreakdown?.total || 0}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{t('total_visitors')}</p>
                    <div className="text-xs md:text-sm text-pink-600">
                        {t('for_period')}
                    </div>
                </div>

                <div className="visitor-analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {conversionRate}%
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{t('local_visitors')}</p>
                    <div className="visitor-analytics-local-visitors text-xs md:text-sm text-green-600">
                        {locationBreakdown?.local || 0} {t('visitors_count')}
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
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={distanceChartData}>
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
                            <Bar dataKey="value" name={t('visitors')} radius={[8, 8, 0, 0]}>
                                {distanceChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
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
                        <LineChart data={trendChartData}>
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
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Cities */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">{t('top_cities')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cityChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--visitor-chart-grid)" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                            <Tooltip />
                            <Bar dataKey="visitors" name={t('visitors')} radius={[0, 4, 4, 0]}>
                                {cityChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
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
                                outerRadius={100}
                                label
                            >
                                {countryPieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Landing Sections */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-2">{t('landing_sections')}</h2>
                    <p className="text-sm text-gray-600 mb-4">{t('sections_subtitle')}</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sectionsChartData}>
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
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
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
                        <BarChart data={hoursChartData}>
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
                            <Bar dataKey="visitors" name={t('visitors')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Visitors Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl text-gray-900">{t('latest_visitors')}</h2>
                    <div className="text-sm text-gray-600">
                        {t('showing')} {startIndex + 1}-{Math.min(endIndex, visitors.length)} {t('of')} {visitors.length}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('ip_address')}</th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('city')}</th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('country')}</th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('distance')}</th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('visit_time')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentVisitors.map((visitor, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{visitor.ip_address || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{visitor.city || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {visitor.country ? (
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-gray-400" />
                                                <span>{visitor.country}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {visitor.distance_km ? (
                                            <span className={`visitor-analytics-local-indicator flex items-center gap-1 ${!visitor.is_local && 'visitor-analytics-remote-indicator'}`}>
                                                {visitor.distance_km} {t('km')}
                                                {visitor.is_local && <Home className="w-3 h-3" />}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {visitor.visited_at ? new Date(visitor.visited_at).toLocaleString('ru-RU') : '-'}
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
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            {t('prev')}
                        </Button>
                        <span className="text-sm text-gray-600">
                            {t('page')} {currentPage} {t('of')} {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            {t('next')}
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
