import { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsDown, Loader, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface FeedbackStats {
    average: number;
    total: number;
    distribution: Record<string, number>;
    recent_reviews: Array<{
        id: number;
        rating: number;
        comment: string | null;
        date: string;
        client: string;
        service: string;
    }>;
}

export default function Feedback() {
    const { t } = useTranslation(['admin/feedback', 'common']);
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        try {
            setLoading(true);
            const data = await api.getFeedbackStats();
            setStats(data.stats);
        } catch (err) {
            setError('Failed to load feedback');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader className="animate-spin text-pink-600" /></div>;
    if (error) return <div className="p-8 text-red-600">{error}</div>;
    if (!stats) return null;

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-2">
                    <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                    {t('feedback:title', 'Feedback & Ratings')}
                </h1>
                <p className="text-gray-600">{t('feedback:subtitle', 'Monitor client satisfaction')}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                    <div className="text-4xl font-bold text-gray-900 mb-2">{stats.average.toFixed(1)}</div>
                    <div className="flex justify-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-5 h-5 ${star <= Math.round(stats.average) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                            />
                        ))}
                    </div>
                    <p className="text-gray-500">{t('feedback:average_rating', 'Average Rating')}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">{t('feedback:rating_distribution', 'Rating Distribution')}</h3>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = stats.distribution[star.toString()] || 0;
                            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-2">
                                    <span className="w-3 text-sm font-medium">{star}</span>
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-400 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-blue-500 mb-2" />
                    <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                    <p className="text-gray-500">{t('feedback:total_reviews', 'Total Reviews')}</p>
                </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-medium">{t('feedback:recent_reviews', 'Recent Reviews')}</h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {stats.recent_reviews.map((review) => (
                        <div key={review.id} className="p-6 hover:bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="font-medium text-gray-900">{review.client}</div>
                                    <span className="text-gray-400">•</span>
                                    <div className="text-sm text-gray-500">{review.service}</div>
                                </div>
                                <div className="text-sm text-gray-400">
                                    {new Date(review.date).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            {review.comment && (
                                <p className="text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg text-sm">
                                    "{review.comment}"
                                </p>
                            )}
                        </div>
                    ))}
                    {stats.recent_reviews.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            {t('feedback:no_reviews', 'No reviews yet')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
