// /frontend/src/components/admin/publicContent/GalleryTab.tsx
import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Upload, Trash2, Eye, EyeOff, Loader, Settings, Save, Pencil } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { toast } from 'sonner';
import { galleryApi } from '../../../services/galleryApi';

interface GalleryImage {
    id: number;
    image_path: string;
    title: string;
    description: string;
    sort_order: number;
    is_visible?: boolean | number;
}

export default function GalleryTab() {
    const [portfolioImages, setPortfolioImages] = useState<GalleryImage[]>([]);
    const [salonImages, setSalonImages] = useState<GalleryImage[]>([]);
    const [servicesImages, setServicesImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('portfolio');
    const [showSettings, setShowSettings] = useState(false);
    const [displaySettings, setDisplaySettings] = useState({ gallery_count: 6, portfolio_count: 6, services_count: 6 });

    // Edit State
    const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
    const [editForm, setEditForm] = useState({ title: '', description: '', image_path: '' });
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isUploadingEdit, setIsUploadingEdit] = useState(false);

    // Drag and Drop state
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        loadGallery();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await galleryApi.getSettings();
            setDisplaySettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const saveSettings = async () => {
        try {
            await galleryApi.saveSettings(displaySettings);
            toast.success('Настройки сохранены');
            setShowSettings(false);
        } catch (error) {
            toast.error('Ошибка сохранения настроек');
        }
    };

    const loadGallery = async () => {
        try {
            setLoading(true);
            const [portfolio, salon, services] = await Promise.all([
                galleryApi.getImages('portfolio', false),
                galleryApi.getImages('salon', false),
                galleryApi.getImages('services', false)
            ]);

            setPortfolioImages(portfolio.images || []);
            setSalonImages(salon.images || []);
            setServicesImages(services.images || []);

        } catch (error) {
            console.error('Error loading gallery:', error);
            toast.error('Ошибка загрузки галереи');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVisibility = async (image: GalleryImage) => {
        const nextIsVisible = !image.is_visible;

        // Optimistic update
        const updateState = (prev: GalleryImage[]) =>
            prev.map(img => img.id === image.id ? { ...img, is_visible: nextIsVisible } : img);

        if (activeTab === 'portfolio') setPortfolioImages(updateState);
        else if (activeTab === 'salon') setSalonImages(updateState);
        else if (activeTab === 'services') setServicesImages(updateState);

        try {
            await galleryApi.updateImage(image.id, { is_visible: nextIsVisible });
            toast.success(nextIsVisible ? 'Фото показано' : 'Фото скрыто');
        } catch (error) {
            toast.error('Ошибка обновления');
            loadGallery();
        }
    };

    const handleDelete = async (imageId: number) => {
        if (!confirm('Удалить это фото?')) return;

        try {
            await galleryApi.deleteImage(imageId);
            toast.success('Фото удалено');

            const filterState = (prev: GalleryImage[]) => prev.filter(img => img.id !== imageId);
            if (activeTab === 'portfolio') setPortfolioImages(filterState);
            else if (activeTab === 'salon') setSalonImages(filterState);
            else if (activeTab === 'services') setServicesImages(filterState);

        } catch (error) {
            toast.error('Ошибка удаления');
        }
    };

    const handleUpload = async (category: string, file: File) => {
        try {
            await galleryApi.uploadImage(category, file);
            toast.success('Фото загружено');
            loadGallery();
        } catch (error) {
            toast.error('Ошибка загрузки');
        }
    };



    const handleEditClick = (image: GalleryImage) => {
        setEditingImage(image);
        setEditForm({
            title: image.title || '',
            description: image.description || '',
            image_path: image.image_path
        });
        setIsEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editingImage) return;

        try {
            await galleryApi.updateImage(editingImage.id, editForm);
            toast.success('Изображение обновлено');
            setIsEditOpen(false);
            loadGallery();
        } catch (error) {
            console.error('Failed to update image', error);
            toast.error('Ошибка обновления');
        }
    };

    const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingEdit(true);
        try {
            // Upload to the current active category
            const response = await galleryApi.uploadImage(activeTab, file);
            setEditForm({ ...editForm, image_path: response.image_path });
            toast.success('Новое изображение загружено');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Ошибка загрузки файла');
        } finally {
            setIsUploadingEdit(false);
        }
    };

    const handleUpdateTitle = async (id: number, newTitle: string) => {
        try {
            await galleryApi.updateImage(id, { title: newTitle });
        } catch (error) {
            console.error('Failed to update title', error);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (_e: React.DragEvent, position: number) => {
        dragItem.current = position;
    };

    const handleDragEnter = (_e: React.DragEvent, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = async (images: GalleryImage[], setImages: React.Dispatch<React.SetStateAction<GalleryImage[]>>) => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }

        const newImages = [...images];
        const draggedItemContent = newImages[dragItem.current];
        newImages.splice(dragItem.current, 1);
        newImages.splice(dragOverItem.current, 0, draggedItemContent);

        const updatedImages = newImages.map((img, index) => ({ ...img, sort_order: index }));

        setImages(updatedImages);
        dragItem.current = null;
        dragOverItem.current = null;

        try {
            await Promise.all(updatedImages.map(img =>
                galleryApi.updateImage(img.id, { sort_order: img.sort_order })
            ));
            toast.success('Порядок сохранен');
        } catch (error) {
            toast.error('Ошибка сохранения порядка');
            loadGallery();
        }
    };

    const renderGalleryGrid = (images: GalleryImage[], setImages: React.Dispatch<React.SetStateAction<GalleryImage[]>>, category: string) => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <Loader className="w-8 h-8 animate-spin text-pink-600" />
                </div>
            );
        }

        if (images.length === 0) {
            return (
                <div className="text-center py-12">
                    <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Нет фото в этой категории</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Загрузите фото или поместите их в папку backend/static/uploads/{category}
                    </p>
                </div>
            );
        }

        return (
            <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={() => handleDragEnd(images, setImages)}
                            onDragOver={(e) => e.preventDefault()}
                            className={`relative group rounded-lg overflow-hidden border-2 cursor-move ${image.is_visible === false || image.is_visible === 0 ? 'border-red-300 opacity-50' : 'border-gray-200'
                                }`}
                        >
                            {/* Image */}
                            <div className="aspect-square bg-gray-100">
                                <img
                                    src={`${import.meta.env.VITE_API_URL || window.location.origin}${image.image_path}`}
                                    alt={image.title || ''}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Overlay with actions */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleToggleVisibility(image)}
                                    title={image.is_visible === false || image.is_visible === 0 ? 'Показать' : 'Скрыть'}
                                >
                                    {image.is_visible === false || image.is_visible === 0 ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4" />
                                    )}
                                </Button>

                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleEditClick(image)}
                                    title="Редактировать"
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>

                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(image.id)}
                                    title="Удалить"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Title Input Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                                <input
                                    type="text"
                                    defaultValue={image.title}
                                    onBlur={(e) => handleUpdateTitle(image.id, e.target.value)}
                                    className="w-full bg-transparent text-white text-sm border-none p-1 focus:ring-0 focus:bg-black/60 rounded placeholder-white/50"
                                    placeholder="Подпись..."
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Редактирование изображения</DialogTitle>
                            <DialogDescription>
                                Измените заголовок, описание или само изображение.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="flex justify-center mb-4">
                                <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-gray-100 group">
                                    <img
                                        src={`${import.meta.env.VITE_API_URL || window.location.origin}${editForm.image_path}`}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Label htmlFor="edit-file-upload" className="cursor-pointer text-white flex flex-col items-center gap-1 hover:scale-105 transition-transform">
                                            <Upload className="w-6 h-6" />
                                            <span className="text-xs">Заменить</span>
                                        </Label>
                                        <input
                                            id="edit-file-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleEditFileChange}
                                            disabled={isUploadingEdit}
                                        />
                                    </div>
                                    {isUploadingEdit && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-title">Заголовок</Label>
                                <Input
                                    id="edit-title"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    placeholder="Введите заголовок..."
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-desc">Описание</Label>
                                <Textarea
                                    id="edit-desc"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Введите описание..."
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                                Отмена
                            </Button>
                            <Button onClick={handleEditSave} disabled={isUploadingEdit}>
                                Сохранить
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Галерея изображений</h2>
                    <p className="text-gray-600">Перетаскивайте фото для сортировки</p>
                </div>
                <Button
                    variant={showSettings ? "secondary" : "outline"}
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    {showSettings ? 'Скрыть настройки' : 'Настройки отображения'}
                </Button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="gallery-count">Количество фото в Галерее (Салон)</Label>
                            <Input
                                id="gallery-count"
                                type="number"
                                min="1"
                                max="50"
                                value={displaySettings.gallery_count}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, gallery_count: parseInt(e.target.value) || 6 })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="portfolio-count">Количество фото в Портфолио</Label>
                            <Input
                                id="portfolio-count"
                                type="number"
                                min="1"
                                max="50"
                                value={displaySettings.portfolio_count}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, portfolio_count: parseInt(e.target.value) || 6 })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="services-count">Количество фото в Услугах</Label>
                            <Input
                                id="services-count"
                                type="number"
                                min="1"
                                max="50"
                                value={displaySettings.services_count}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, services_count: parseInt(e.target.value) || 6 })}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={saveSettings} className="w-full">
                                <Save className="w-4 h-4 mr-2" />
                                Сохранить
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        💡 Вкладка "Услуги" не отображается на публичной странице
                    </p>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                    <TabsTrigger value="portfolio">
                        Портфолио ({portfolioImages.length})
                    </TabsTrigger>
                    <TabsTrigger value="salon">
                        Фото салона ({salonImages.length})
                    </TabsTrigger>
                    <TabsTrigger value="services">
                        Услуги ({servicesImages.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="portfolio">
                    <div className="mb-4">
                        <div className="mb-4">
                            <input
                                id="portfolio-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    files.forEach(file => handleUpload('portfolio', file));
                                    e.target.value = '';
                                }}
                            />
                            <Label
                                htmlFor="portfolio-upload"
                                className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Загрузить фото
                            </Label>
                        </div>
                    </div>
                    {renderGalleryGrid(portfolioImages, setPortfolioImages, 'portfolio')}
                </TabsContent>

                <TabsContent value="salon">
                    <div className="mb-4">
                        <div className="mb-4">
                            <input
                                id="salon-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    files.forEach(file => handleUpload('salon', file));
                                    e.target.value = '';
                                }}
                            />
                            <Label
                                htmlFor="salon-upload"
                                className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Загрузить фото
                            </Label>
                        </div>
                    </div>
                    {renderGalleryGrid(salonImages, setSalonImages, 'salon')}
                </TabsContent>

                <TabsContent value="services">
                    <div className="mb-4">
                        <div className="mb-4">
                            <input
                                id="services-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    files.forEach(file => handleUpload('services', file));
                                    e.target.value = '';
                                }}
                            />
                            <Label
                                htmlFor="services-upload"
                                className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Загрузить фото
                            </Label>
                        </div>
                    </div>
                    {renderGalleryGrid(servicesImages, setServicesImages, 'services')}
                </TabsContent>
            </Tabs>
        </div>
    );
}
