// /frontend/src/pages/admin/VisitorAnalytics.tsx
import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Download, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { visitorApi } from '../../services/visitorApi';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PeriodFilter } from '../../components/shared/PeriodFilter';

interface Visitor {
    ip_hash: string;
    city: string;
    country: string;
    distance_km: number;
    is_local: boolean;
    page_url: string;
    visited_at: string;
}

const COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6'];

export default function VisitorAnalytics() {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [locationBreakdown, setLocationBreakdown] = useState<any>(null);
    const [countryBreakdown, setCountryBreakdown] = useState<any[]>([]);
    const [cityBreakdown, setCityBreakdown] = useState<any[]>([]);
    const [distanceBreakdown, setDistanceBreakdown] = useState<any>(null);
    const [visitorTrend, setVisitorTrend] = useState<any[]>([]);
    const [popularPages, setPopularPages] = useState<any[]>([]);

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
            const periodValue = period === 'today' ? 'day' : period === '7' ? 'week' : period === '30' ? 'month' : 'week';
            const maxDist = Number(distanceTo);

            const [visitorsData, locationData, countryData, cityData, distanceData, trendData, pagesData] = await Promise.all([
                visitorApi.getVisitors(periodValue),
                visitorApi.getLocationBreakdown(periodValue),
                visitorApi.getCountryBreakdown(periodValue),
                visitorApi.getCityBreakdown(periodValue),
                visitorApi.getDistanceBreakdown(periodValue, maxDist),
                visitorApi.getVisitorTrend(periodValue),
                visitorApi.getPopularPages(periodValue)
            ]);

            setVisitors(visitorsData.visitors || []);
            setLocationBreakdown(locationData.distribution);
            setCountryBreakdown(countryData.countries || []);
            setCityBreakdown(cityData.cities || []);
            setDistanceBreakdown(distanceData.distribution);
            setVisitorTrend(trendData.trend || []);
            setPopularPages(pagesData.pages || []);
            setCurrentPage(1); // Reset to first page
        } catch (error) {
            console.error('Error loading visitor data:', error);
            toast.error('Ошибка загрузки данных посетителей');
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
            toast.error('Выберите обе даты');
            return;
        }
        if (dateFrom > dateTo) {
            toast.error('Неверный диапазон дат');
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

            toast.success('Файл успешно загружен');
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Ошибка экспорта');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 md:p-8 flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 text-pink-600 animate-spin" />
                    <p className="text-base text-gray-600">Загрузка аналитики посетителей...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data - dynamic based on distance range
    const getDistanceRanges = () => {
        const maxDist = Number(distanceTo);
        if (maxDist <= 5) {
            return [
                { name: '≤1км', value: distanceBreakdown?.within_1km || 0, fill: COLORS[0] },
                { name: '1-2км', value: distanceBreakdown?.within_2km || 0, fill: COLORS[1] },
                { name: '2-5км', value: distanceBreakdown?.within_5km || 0, fill: COLORS[2] },
            ];
        } else if (maxDist <= 20) {
            return [
                { name: '≤1км', value: distanceBreakdown?.within_1km || 0, fill: COLORS[0] },
                { name: '1-2км', value: distanceBreakdown?.within_2km || 0, fill: COLORS[1] },
                { name: '2-5км', value: distanceBreakdown?.within_5km || 0, fill: COLORS[2] },
                { name: '5-10км', value: distanceBreakdown?.within_10km || 0, fill: COLORS[3] },
                { name: '10-15км', value: distanceBreakdown?.within_15km || 0, fill: COLORS[4] },
                { name: '15-20км', value: distanceBreakdown?.within_20km || 0, fill: COLORS[5] },
            ];
        } else {
            return [
                { name: '≤1км', value: distanceBreakdown?.within_1km || 0, fill: COLORS[0] },
                { name: '1-2км', value: distanceBreakdown?.within_2km || 0, fill: COLORS[1] },
                { name: '2-5км', value: distanceBreakdown?.within_5km || 0, fill: COLORS[2] },
                { name: '5-10км', value: distanceBreakdown?.within_10km || 0, fill: COLORS[3] },
                { name: '10-15км', value: distanceBreakdown?.within_15km || 0, fill: COLORS[4] },
                { name: '15-20км', value: distanceBreakdown?.within_20km || 0, fill: COLORS[5] },
                { name: `20-${maxDist}км`, value: distanceBreakdown?.[`within_${maxDist}km`] || 0, fill: COLORS[6] },
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
        name: country.country,
        value: country.count,
        percentage: country.percentage
    }));

    const trendChartData = visitorTrend.map(item => ({
        date: new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        visitors: item.count
    }));

    const pagesChartData = popularPages.slice(0, 8).map((page, index) => ({
        name: page.page.length > 20 ? page.page.substring(0, 20) + '...' : page.page,
        visitors: page.count,
        fill: COLORS[index % COLORS.length]
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
        <div className="p-4 md:p-8 pb-20 md:pb-8">
            {/* Header */}
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-3">
                    <MapPin className="w-8 h-8 text-pink-600" />
                    <span>Аналитика посетителей</span>
                </h1>
                <p className="text-sm md:text-base text-gray-600">
                    Геолокация и поведение посетителей сайта
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:flex-wrap sm:items-end">
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
                        <Button onClick={handleApplyCustomDates} className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto">
                            Применить
                        </Button>
                    )}

                    <Button variant="outline" onClick={loadData} className="md:ml-auto">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Обновить
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {exporting ? 'Экспорт...' : 'Экспорт CSV'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {locationBreakdown?.total || 0}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">Всего посетителей</p>
                    <div className="text-xs md:text-sm text-pink-600">
                        За период
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {conversionRate}%
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">Местные (≤50км)</p>
                    <div className="text-xs md:text-sm text-green-600">
                        {locationBreakdown?.local || 0} посетителей
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {countryBreakdown.length}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">Стран</p>
                    <div className="text-xs md:text-sm text-blue-600">
                        Географический охват
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-2xl md:text-3xl text-gray-900 mb-2">
                        {cityBreakdown.length}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">Городов</p>
                    <div className="text-xs md:text-sm text-purple-600">
                        Уникальные локации
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
                {/* Distance Distribution with FROM-TO selector */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col gap-4 mb-6">
                        <h2 className="text-xl text-gray-900">Распределение по расстоянию</h2>
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
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                            >
                                <option value="1">До 1 км</option>
                                <option value="2">До 2 км</option>
                                <option value="5">До 5 км</option>
                                <option value="10">До 10 км</option>
                                <option value="15">До 15 км</option>
                                <option value="20">До 20 км</option>
                                <option value="50">До 50 км</option>
                                <option value="100">До 100 км</option>
                                <option value="custom">Свой диапазон...</option>
                            </select>
                            {showCustomDistance && (
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm text-gray-600">От:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1000"
                                        placeholder="0"
                                        value={distanceFrom}
                                        onChange={(e) => setDistanceFrom(e.target.value)}
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                    <span className="text-sm text-gray-600">До:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        placeholder="20"
                                        value={distanceTo}
                                        onChange={(e) => setDistanceTo(e.target.value)}
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                    <span className="text-sm text-gray-600">км</span>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const from = Number(distanceFrom);
                                            const to = Number(distanceTo);
                                            if (from >= 0 && to > from && to <= 1000) {
                                                setShowCustomDistance(false);
                                                loadData();
                                            } else {
                                                toast.error('Проверьте диапазон (0-1000км, "До" > "От")');
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '8px 12px'
                                }}
                            />
                            <Bar dataKey="value" name="Посетители" radius={[8, 8, 0, 0]}>
                                {distanceChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Visitor Trend Over Time */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-2">Тренд посещений</h2>
                    <p className="text-sm text-gray-600 mb-4">Динамика посещений по дням</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="visitors"
                                name="Посетители"
                                stroke="#ec4899"
                                strokeWidth={2}
                                dot={{ fill: '#ec4899' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Cities */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">Топ городов</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cityChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                            <Tooltip />
                            <Bar dataKey="visitors" name="Посетители" radius={[0, 4, 4, 0]}>
                                {cityChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Country Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl text-gray-900 mb-6">Распределение по странам</h2>
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
                                {countryPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Popular Pages */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h2 className="text-xl text-gray-900 mb-2">Популярные страницы</h2>
                    <p className="text-sm text-gray-600 mb-4">Самые посещаемые страницы сайта</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pagesChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="visitors" name="Посетители" radius={[8, 8, 0, 0]}>
                                {pagesChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Visitors Table with Pagination */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl text-gray-900">Последние посетители</h2>
                    <div className="text-sm text-gray-600">
                        Показано {startIndex + 1}-{Math.min(endIndex, visitors.length)} из {visitors.length}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">Город</th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">Страна</th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">Расстояние</th>
                                <th className="px-6 py-4 text-left text-sm text-gray-600">Время посещения</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentVisitors.map((visitor, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">{visitor.city || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{visitor.country || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {visitor.distance_km ? (
                                            <span className={visitor.is_local ? 'text-green-600 font-medium' : 'text-blue-600'}>
                                                {visitor.distance_km} км
                                                {visitor.is_local && ' 🏠'}
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Назад
                        </Button>
                        <span className="text-sm text-gray-600">
                            Страница {currentPage} из {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Вперед
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
