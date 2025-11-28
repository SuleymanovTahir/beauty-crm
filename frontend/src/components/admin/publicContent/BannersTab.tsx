import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Link as LinkIcon, Calendar, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
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
    const [rotationInterval, setRotationInterval] = useState(5); // seconds
    const [promoEndDate, setPromoEndDate] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title_ru: '',
        subtitle_ru: '',
        image_url: '',
        link_url: ''
    });
    const [uploadTab, setUploadTab] = useState('url'); // 'url' or 'file'
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadBanners();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // Load rotation interval from localStorage
            const savedInterval = localStorage.getItem('bannerRotationInterval');
            if (savedInterval) setRotationInterval(parseInt(savedInterval));

            // Load promo end date from API
            const settings = await apiClient.getSalonSettings();
            if (settings.promo_end_date) {
                setPromoEndDate(settings.promo_end_date);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const saveSettings = async () => {
        try {
            // Save rotation interval
            localStorage.setItem('bannerRotationInterval', rotationInterval.toString());

            // Save promo end date
            await apiClient.updateSalonSettings({ promo_end_date: promoEndDate });

            toast.success('Настройки сохранены');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Ошибка сохранения настроек');
        }
    };

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const response = await apiClient.uploadFile(file);
            setFormData({ ...formData, image_url: response.file_url });
            toast.success('Файл загружен');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Ошибка загрузки файла');
        } finally {
            setUploading(false);
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

    const handleToggleVisibility = async (banner: Banner) => {
        const nextIsActive = !banner.is_active;
        // Optimistic update
        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: nextIsActive } : b));
        try {
            await apiClient.updatePublicBanner(banner.id, { is_active: nextIsActive });
            toast.success(nextIsActive ? 'Баннер активирован' : 'Баннер скрыт');
        } catch (error) {
            toast.error('Ошибка обновления');
            loadBanners();
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
        setUploadTab('url');
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className="space-y-8">
            {/* Global Settings Section */}
            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Настройки главной страницы
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="rotation-interval">Интервал ротации баннеров (сек)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="rotation-interval"
                                type="number"
                                min="1"
                                max="60"
                                value={rotationInterval}
                                onChange={(e) => setRotationInterval(parseInt(e.target.value) || 5)}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="promo-end-date">Дата окончания акции (Таймер)</Label>
                        <Input
                            id="promo-end-date"
                            type="datetime-local"
                            value={promoEndDate}
                            onChange={(e) => setPromoEndDate(e.target.value)}
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500">
                            Если дата в будущем, на главной странице появится таймер обратного отсчета.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={saveSettings}>
                        Сохранить настройки
                    </Button>
                </div>
            </div>

            {/* Banners List Section */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-semibold">Список баннеров</h2>
                        <p className="text-sm text-gray-500">Первый активный баннер отображается в Hero секции</p>
                    </div>

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
                        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingBanner ? 'Редактировать баннер' : 'Новый баннер'}
                                </DialogTitle>
                                <DialogDescription>
                                    Заполните информацию о баннере. Изображение и заголовок обязательны.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Заголовок (RU)</Label>
                                    <Input
                                        id="title"
                                        value={formData.title_ru}
                                        onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                                        required
                                        placeholder="Например: Скидка 20% на все услуги"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="subtitle">Подзаголовок (RU)</Label>
                                    <Input
                                        id="subtitle"
                                        value={formData.subtitle_ru}
                                        onChange={(e) => setFormData({ ...formData, subtitle_ru: e.target.value })}
                                        placeholder="Например: Только до конца месяца"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Изображение</Label>
                                    <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="url">Ссылка</TabsTrigger>
                                            <TabsTrigger value="file">Загрузить файл</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="url" className="mt-2">
                                            <Input
                                                value={formData.image_url}
                                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </TabsContent>
                                        <TabsContent value="file" className="mt-2">
                                            <Label
                                                htmlFor="banner-file-upload"
                                                className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                                            >
                                                {uploading ? 'Загрузка...' : 'Выбрать файл'}
                                            </Label>
                                            <input
                                                id="banner-file-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                        </TabsContent>
                                    </Tabs>

                                    {formData.image_url && (
                                        <div className="mt-2 relative aspect-video rounded-md overflow-hidden border bg-gray-100">
                                            <img
                                                src={formData.image_url}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="link">Ссылка при клике (опционально)</Label>
                                    <Input
                                        id="link"
                                        value={formData.link_url}
                                        onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                        placeholder="/services"
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={uploading}>
                                    {editingBanner ? 'Сохранить' : 'Создать'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map((banner) => (
                        <div
                            key={banner.id}
                            className="group relative aspect-video rounded-xl overflow-hidden border shadow-sm bg-gray-100"
                        >
                            {/* Background Image */}
                            {banner.image_url ? (
                                <img
                                    src={banner.image_url}
                                    alt={banner.title_ru}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-12 h-12" />
                                </div>
                            )}

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                            {/* Content */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                                <h3 className="font-bold text-lg leading-tight mb-1">{banner.title_ru}</h3>
                                {banner.subtitle_ru && (
                                    <p className="text-sm text-white/80 mb-2">{banner.subtitle_ru}</p>
                                )}
                                {banner.link_url && (
                                    <div className="flex items-center gap-1 text-xs text-blue-300">
                                        <LinkIcon className="w-3 h-3" />
                                        {banner.link_url}
                                    </div>
                                )}
                            </div>

                            {/* Actions (Top Right) */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-white/90 hover:bg-white"
                                    onClick={() => handleToggleVisibility(banner)}
                                    title={banner.is_active ? 'Скрыть' : 'Показать'}
                                >
                                    {banner.is_active ? (
                                        <Eye className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                    )}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-white/90 hover:bg-white"
                                    onClick={() => handleEdit(banner)}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-white/90 hover:bg-white text-red-500 hover:text-red-600"
                                    onClick={() => handleDelete(banner.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Status Badge */}
                            {!banner.is_active && (
                                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                                    Скрыт
                                </div>
                            )}
                        </div>
                    ))}

                    {banners.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                            Нет активных баннеров. Добавьте первый!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
