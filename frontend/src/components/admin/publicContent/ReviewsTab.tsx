// /frontend/src/components/admin/publicContent/ReviewsTab.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../api/client';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Label } from '../../../components/ui/label';
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

export default function ReviewsTab() {
    const { t } = useTranslation(['admin/PublicContent', 'common']);
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
    const [uploadTab, setUploadTab] = useState('url'); // 'url' or 'file'
    const [uploading, setUploading] = useState(false);

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
            alert(t('error_saving_review'));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const response = await apiClient.uploadFile(file);
            setFormData({ ...formData, avatar_url: response.file_url });
        } catch (error) {
            console.error('Upload error:', error);
            alert('Ошибка загрузки файла');
        } finally {
            setUploading(false);
            e.target.value = '';
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
        if (!confirm(t('confirm_delete_review'))) return;

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
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold">{t('reviews_title', 'Отзывы клиентов')}</h2>
                    <p className="text-gray-600">{t('reviews_subtitle', 'Управление отзывами на главной странице')}</p>
                </div>
                <Button onClick={() => {
                    setEditingReview(null);
                    setFormData({ author_name: '', rating: 5, text_ru: '', avatar_url: '' });
                    setShowModal(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add_review')}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">{t('common:loading')}</div>
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
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{t('active')}</span>
                                        ) : (
                                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">{t('hidden')}</span>
                                        )}
                                    </div>
                                    <p className="text-gray-700 mb-2">{review.text_ru}</p>
                                    {review.text_en && (
                                        <details className="text-sm text-gray-500">
                                            <summary className="cursor-pointer">{t('translations')}</summary>
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
                            {editingReview ? t('edit_review') : t('new_review')}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('author_name')}</label>
                                <Input
                                    value={formData.author_name}
                                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                                    required
                                    className="px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('rating')}</label>
                                <select
                                    value={formData.rating}
                                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.75rem center',
                                        backgroundSize: '16px 16px',
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        MozAppearance: 'none'
                                    }}
                                >
                                    {[5, 4, 3, 2, 1].map(n => (
                                        <option key={n} value={n}>{n} {t('stars')}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('review_text')}
                                    <span className="text-xs text-gray-500 ml-2">
                                        {t('auto_translate_hint')}
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
                                <Label className="block text-sm font-medium mb-1">
                                    {t('photo_url')}
                                </Label>
                                <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="url">Ссылка</TabsTrigger>
                                        <TabsTrigger value="file">Загрузить файл</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="url" className="mt-2">
                                        <Input
                                            value={formData.avatar_url}
                                            onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                            placeholder="https://..."
                                            className="px-3"
                                        />
                                    </TabsContent>
                                    <TabsContent value="file" className="mt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => document.getElementById('review-file-upload')?.click()}
                                            disabled={uploading}
                                        >
                                            {uploading ? 'Загрузка...' : 'Выбрать файл'}
                                        </Button>
                                        <input
                                            id="review-file-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </TabsContent>
                                </Tabs>
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
                                    {t('common:cancel')}
                                </Button>
                                <Button type="submit">
                                    {editingReview ? t('common:save') : t('create')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
