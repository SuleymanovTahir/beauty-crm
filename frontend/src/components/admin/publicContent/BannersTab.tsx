import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { apiClient } from '../../../api/client';

interface Banner {
    id: number;
    title_ru: string;
    subtitle_ru?: string;
    image_url: string;
    link_url?: string;
    display_order: number;
    is_active: boolean;
}

export default function BannersTab() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [formData, setFormData] = useState({
        title_ru: '',
        subtitle_ru: '',
        image_url: '',
        link_url: ''
    });

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        try {
            const data = await apiClient.getPublicBanners();
            setBanners(data.banners || []);
        } catch (error) {
            console.error('Error loading banners:', error);
            toast.error('Ошибка загрузки баннеров');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBanner) {
                await apiClient.updatePublicBanner(editingBanner.id, formData);
                toast.success('Баннер обновлен');
            } else {
                await apiClient.createPublicBanner(formData);
                toast.success('Баннер создан');
            }
            setIsDialogOpen(false);
            loadBanners();
            resetForm();
        } catch (error) {
            console.error('Error saving banner:', error);
            toast.error('Ошибка сохранения');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот баннер?')) return;
        try {
            await apiClient.deletePublicBanner(id);
            toast.success('Баннер удален');
            loadBanners();
        } catch (error) {
            toast.error('Ошибка удаления');
        }
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setFormData({
            title_ru: banner.title_ru,
            subtitle_ru: banner.subtitle_ru || '',
            image_url: banner.image_url || '',
            link_url: banner.link_url || ''
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingBanner(null);
        setFormData({
            title_ru: '',
            subtitle_ru: '',
            image_url: '',
            link_url: ''
        });
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Баннеры на главной</h2>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Добавить баннер
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingBanner ? 'Редактировать баннер' : 'Новый баннер'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="title">Заголовок (RU)</Label>
                                <Input
                                    id="title"
                                    value={formData.title_ru}
                                    onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="subtitle">Подзаголовок (RU)</Label>
                                <Input
                                    id="subtitle"
                                    value={formData.subtitle_ru}
                                    onChange={(e) => setFormData({ ...formData, subtitle_ru: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="image">URL изображения</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="image"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="link">Ссылка при клике</Label>
                                <Input
                                    id="link"
                                    value={formData.link_url}
                                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                    placeholder="/services"
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                {editingBanner ? 'Сохранить' : 'Создать'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm"
                    >
                        <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {banner.image_url ? (
                                <img
                                    src={banner.image_url}
                                    alt={banner.title_ru}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{banner.title_ru}</h3>
                            {banner.subtitle_ru && (
                                <p className="text-sm text-gray-500 truncate">{banner.subtitle_ru}</p>
                            )}
                            {banner.link_url && (
                                <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                                    <LinkIcon className="w-3 h-3" />
                                    {banner.link_url}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(banner)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDelete(banner.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {banners.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Нет активных баннеров. Добавьте первый!
                    </div>
                )}
            </div>
        </div>
    );
}
