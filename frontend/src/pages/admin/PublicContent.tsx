import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Star, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

interface Review {
    id: number;
    author_name: string;
    rating: number;
    text_ru: string;
    text_en?: string;
    text_ar?: string;
    avatar_url?: string;
    is_active: number;
    display_order: number;
    created_at: string;
}

export default function PublicContent() {
    const { t } = useTranslation();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [formData, setFormData] = useState({
        author_name: '',
        rating: 5,
        text_ru: '',
        avatar_url: ''
    });

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getPublicContentReviews();
            setReviews(data.reviews || []);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingReview) {
                await apiClient.updatePublicReview(editingReview.id, formData);
            } else {
                await apiClient.createPublicReview(formData);
            }

            setShowModal(false);
            setEditingReview(null);
            setFormData({ author_name: '', rating: 5, text_ru: '', avatar_url: '' });
            loadReviews();
        } catch (error) {
            console.error('Error saving review:', error);
            alert('Ошибка при сохранении отзыва');
        }
    };

    const handleEdit = (review: Review) => {
        setEditingReview(review);
        setFormData({
            author_name: review.author_name,
            rating: review.rating,
            text_ru: review.text_ru,
            avatar_url: review.avatar_url || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить этот отзыв?')) return;

        try {
            await apiClient.deletePublicReview(id);
            loadReviews();
        } catch (error) {
            console.error('Error deleting review:', error);
        }
    };

    const handleToggle = async (id: number) => {
        try {
            await apiClient.togglePublicReview(id);
            loadReviews();
        } catch (error) {
            console.error('Error toggling review:', error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Управление публичным контентом</h1>
                    <p className="text-gray-600">Отзывы, баннеры, FAQ и галерея</p>
                </div>
                <Button onClick={() => {
                    setEditingReview(null);
                    setFormData({ author_name: '', rating: 5, text_ru: '', avatar_url: '' });
                    setShowModal(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить отзыв
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">Загрузка...</div>
            ) : (
                <div className="grid gap-4">
                    {reviews.map((review) => (
                        <Card key={review.id} className="p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{review.author_name}</h3>
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                        {review.is_active ? (
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Активен</span>
                                        ) : (
                                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Скрыт</span>
                                        )}
                                    </div>
                                    <p className="text-gray-700 mb-2">{review.text_ru}</p>
                                    {review.text_en && (
                                        <details className="text-sm text-gray-500">
                                            <summary className="cursor-pointer">Переводы</summary>
                                            <div className="mt-2 space-y-1">
                                                <p><strong>EN:</strong> {review.text_en}</p>
                                                {review.text_ar && <p><strong>AR:</strong> {review.text_ar}</p>}
                                            </div>
                                        </details>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggle(review.id)}
                                    >
                                        {review.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(review)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(review.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {editingReview ? 'Редактировать отзыв' : 'Новый отзыв'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Имя автора</label>
                                <Input
                                    value={formData.author_name}
                                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Рейтинг</label>
                                <select
                                    className="w-full border rounded px-3 py-2"
                                    value={formData.rating}
                                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                                >
                                    {[5, 4, 3, 2, 1].map(n => (
                                        <option key={n} value={n}>{n} звезд</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Текст отзыва (на русском)
                                    <span className="text-xs text-gray-500 ml-2">
                                        Автоматически переведется на все языки
                                    </span>
                                </label>
                                <Textarea
                                    value={formData.text_ru}
                                    onChange={(e) => setFormData({ ...formData, text_ru: e.target.value })}
                                    rows={4}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    URL фото (опционально)
                                </label>
                                <Input
                                    value={formData.avatar_url}
                                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingReview(null);
                                    }}
                                >
                                    Отмена
                                </Button>
                                <Button type="submit">
                                    {editingReview ? 'Сохранить' : 'Создать'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
