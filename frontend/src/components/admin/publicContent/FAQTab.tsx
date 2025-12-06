// /frontend/src/components/admin/publicContent/FAQTab.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../api/client';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Plus, Edit2, Trash2, HelpCircle } from 'lucide-react';

interface FAQ {
    id: number;
    question_ru: string;
    question_en?: string;
    question_ar?: string;
    answer_ru: string;
    answer_en?: string;
    answer_ar?: string;
    category: string;
    display_order: number;
}

export default function FAQTab() {
    const { t } = useTranslation(['admin/PublicContent', 'common']);
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
    const [formData, setFormData] = useState({
        question_ru: '',
        answer_ru: '',
        category: 'general'
    });

    useEffect(() => {
        loadFAQs();
    }, []);

    const loadFAQs = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getPublicContentFAQ();
            setFaqs(data.faq || []);
        } catch (error) {
            console.error('Error loading FAQs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingFAQ) {
                await apiClient.updatePublicFAQ(editingFAQ.id, formData);
            } else {
                await apiClient.createPublicFAQ(formData);
            }

            setShowModal(false);
            setEditingFAQ(null);
            setFormData({ question_ru: '', answer_ru: '', category: 'general' });
            loadFAQs();
        } catch (error) {
            console.error('Error saving FAQ:', error);
            alert(t('error_saving_faq'));
        }
    };

    const handleEdit = (faq: FAQ) => {
        setEditingFAQ(faq);
        setFormData({
            question_ru: faq.question_ru,
            answer_ru: faq.answer_ru,
            category: faq.category
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('confirm_delete_faq'))) return;

        try {
            await apiClient.deletePublicFAQ(id);
            loadFAQs();
        } catch (error) {
            console.error('Error deleting FAQ:', error);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold">{t('faq_title', 'Частые вопросы')}</h2>
                    <p className="text-gray-600">{t('faq_subtitle', 'Управление разделом FAQ')}</p>
                </div>
                <Button onClick={() => {
                    setEditingFAQ(null);
                    setFormData({ question_ru: '', answer_ru: '', category: 'general' });
                    setShowModal(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add_faq')}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">{t('common:loading')}</div>
            ) : (
                <div className="grid gap-4">
                    {faqs.map((faq) => (
                        <Card key={faq.id} className="p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <HelpCircle className="w-4 h-4 text-pink-500" />
                                        <h3 className="font-semibold">{faq.question_ru}</h3>
                                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded capitalize">
                                            {faq.category}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 mb-2">{faq.answer_ru}</p>
                                    {(faq.question_en || faq.answer_en) && (
                                        <details className="text-sm text-gray-500">
                                            <summary className="cursor-pointer">{t('translations')}</summary>
                                            <div className="mt-2 space-y-1">
                                                <p><strong>EN Q:</strong> {faq.question_en}</p>
                                                <p><strong>EN A:</strong> {faq.answer_en}</p>
                                                {faq.question_ar && <p><strong>AR Q:</strong> {faq.question_ar}</p>}
                                                {faq.answer_ar && <p><strong>AR A:</strong> {faq.answer_ar}</p>}
                                            </div>
                                        </details>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(faq)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(faq.id)}
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
                            {editingFAQ ? t('edit_faq') : t('new_faq')}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('question')}</label>
                                <Input
                                    value={formData.question_ru}
                                    onChange={(e) => setFormData({ ...formData, question_ru: e.target.value })}
                                    required
                                    className="px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('answer')}</label>
                                <Textarea
                                    value={formData.answer_ru}
                                    onChange={(e) => setFormData({ ...formData, answer_ru: e.target.value })}
                                    rows={4}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('category')}</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                                    <option value="general">General</option>
                                    <option value="services">Services</option>
                                    <option value="booking">Booking</option>
                                    <option value="payment">Payment</option>
                                </select>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingFAQ(null);
                                    }}
                                >
                                    {t('common:cancel')}
                                </Button>
                                <Button type="submit">
                                    {editingFAQ ? t('common:save') : t('create')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
