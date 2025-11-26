import { useState } from 'react';
import { Star, Send, Loader, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { api } from '../../services/api';
import { toast } from 'sonner';

export default function RateUs() {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [instagramId, setInstagramId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error('Пожалуйста, выберите оценку');
            return;
        }

        if (!instagramId.trim()) {
            toast.error('Пожалуйста, укажите ваш Instagram');
            return;
        }

        try {
            setSubmitting(true);
            await api.submitFeedback({
                instagram_id: instagramId.trim(),
                rating,
                comment: comment.trim()
            });

            setSubmitted(true);
            toast.success('Спасибо за ваш отзыв!');
        } catch (err) {
            console.error(err);
            toast.error('Ошибка при отправке отзыва');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Спасибо за ваш отзыв!</h2>
                    <p className="text-gray-600 mb-6">
                        Ваше мнение очень важно для нас и помогает нам становиться лучше.
                    </p>
                    <Button
                        onClick={() => {
                            setSubmitted(false);
                            setRating(0);
                            setComment('');
                            setInstagramId('');
                        }}
                        className="bg-gradient-to-r from-pink-500 to-purple-600"
                    >
                        Оставить еще один отзыв
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-white fill-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Оцените нас</h1>
                    <p className="text-gray-600">Расскажите о вашем опыте посещения</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Instagram ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ваш Instagram
                        </label>
                        <input
                            type="text"
                            value={instagramId}
                            onChange={(e) => setInstagramId(e.target.value)}
                            placeholder="@username"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Rating Stars */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Ваша оценка
                        </label>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-12 h-12 transition-colors ${star <= (hoverRating || rating)
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-gray-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className="text-center text-sm text-gray-600 mt-2">
                                {rating === 5 && '⭐ Отлично!'}
                                {rating === 4 && '😊 Хорошо'}
                                {rating === 3 && '😐 Нормально'}
                                {rating === 2 && '😕 Не очень'}
                                {rating === 1 && '😞 Плохо'}
                            </p>
                        )}
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Комментарий (необязательно)
                        </label>
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Расскажите подробнее о вашем опыте..."
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={submitting || rating === 0}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 text-lg"
                    >
                        {submitting ? (
                            <>
                                <Loader className="w-5 h-5 mr-2 animate-spin" />
                                Отправка...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" />
                                Отправить отзыв
                            </>
                        )}
                    </Button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                    Ваш отзыв поможет нам улучшить качество обслуживания
                </p>
            </div>
        </div>
    );
}
