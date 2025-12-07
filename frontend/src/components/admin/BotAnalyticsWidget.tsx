
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiClient } from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BotAnalyticsData {
    summary: {
        total_sessions: number;
        sessions_last_7d: number;
        messages_total: number;
        messages_avg: number;
        bookings_created: number;
        escalated_to_manager: number;
        cancellations: number;
        conversion_rate: number;
    };
    daily_stats: Array<{
        date: string;
        sessions: number;
        bookings: number;
    }>;
    outcomes: Array<{
        outcome: string;
        count: number;
    }>;
    languages: Array<{
        language: string;
        count: number;
    }>;
}

const BotAnalyticsWidget: React.FC = () => {
    const { t } = useTranslation('admin/botsettings');
    const [data, setData] = useState<BotAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await apiClient.getBotAnalytics(30);
                setData(result);
            } catch (error) {
                console.error('Failed to fetch bot analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!data) return null;

    const COLORS = ['#8884d8', '#00C49F', '#FFBB28', '#FF8042', '#FF4444'];
    const OUTCOME_NAMES: Record<string, string> = {
        'in_progress': t('analytics.outcome_in_progress', 'In Progress'),
        'booking_created': t('analytics.outcome_booking_created', 'Booking Created'),
        'consultation_only': t('analytics.outcome_consultation', 'Consultation'),
        'escalated': t('analytics.outcome_escalated', 'Escalated'),
        'abandoned': t('analytics.outcome_abandoned', 'Abandoned')
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard
                    title={t('analytics.total_dialogs', 'Total Dialogs')}
                    value={data.summary.total_sessions}
                    subValue={`+${data.summary.sessions_last_7d} ${t('analytics.this_week', 'this week')}`}
                    Icon="💬"
                />
                <StatsCard
                    title={t('analytics.conversion_to_booking', 'Conversion to Booking')}
                    value={`${data.summary.conversion_rate}%`}
                    subValue={`${data.summary.bookings_created} ${t('analytics.bookings', 'bookings')}`}
                    Icon="✅"
                />
                <StatsCard
                    title={t('analytics.escalations', 'Manager Escalations')}
                    value={data.summary.escalated_to_manager}
                    subValue={t('analytics.needs_attention', 'Needs attention')}
                    Icon="👨‍💻"
                />
                <StatsCard
                    title={t('analytics.messages_per_dialog', 'Messages per Dialog')}
                    value={data.summary.messages_avg}
                    subValue={t('analytics.average', 'Average')}
                    Icon="📊"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.activity_30_days', 'Activity 30 Days')}</CardTitle>
                        <CardDescription>{t('analytics.dialogs_and_bookings_count', 'Dialogs and bookings count')}</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.daily_stats}>
                                <defs>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(str) => str.slice(5)} />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="sessions" name={t('analytics.dialogs', 'Dialogs')} stroke="#8884d8" fillOpacity={1} fill="url(#colorSessions)" />
                                <Area type="monotone" dataKey="bookings" name={t('analytics.bookings', 'Bookings')} stroke="#82ca9d" fillOpacity={1} fill="url(#colorBookings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.dialog_outcomes', 'Dialog Outcomes')}</CardTitle>
                        <CardDescription>{t('analytics.how_conversations_end', 'How conversations with bot end')}</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.outcomes.map(o => ({ ...o, name: OUTCOME_NAMES[o.outcome] || o.outcome }))}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {data.outcomes.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const StatsCard = ({ title, value, subValue, Icon }: any) => (
    <Card>
        <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                <span className="text-2xl">{Icon}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-gray-400 mt-1">{subValue}</p>
        </CardContent>
    </Card>
);

export default BotAnalyticsWidget;

