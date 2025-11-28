import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Upload, Trash2, Eye, EyeOff, Loader, Settings, Save } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
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
    const [displaySettings, setDisplaySettings] = useState({ gallery_count: 6, portfolio_count: 6 });

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
        // Handle both boolean and integer (0/1) values
        // Default is visible (true) if undefined
        const currentIsVisible = image.is_visible === undefined || image.is_visible === true || image.is_visible === 1;
        const nextIsVisible = !currentIsVisible;

        // Update local state immediately
        const updateState = (prev: GalleryImage[]) =>
            prev.map(img => img.id === image.id ? { ...img, is_visible: nextIsVisible } : img);

        if (activeTab === 'portfolio') setPortfolioImages(updateState);
        else if (activeTab === 'salon') setSalonImages(updateState);
        else if (activeTab === 'services') setServicesImages(updateState);

        try {
            await galleryApi.updateImage(image.id, { is_visible: nextIsVisible });
            toast.success(nextIsVisible ? 'Фото показано' : 'Фото скрыто');
        } catch (error) {
            // Revert on error
            toast.error('Ошибка обновления');
            loadGallery();
        }
    };

    const handleDelete = async (imageId: number) => {
        if (!confirm('Удалить это фото?')) return;

        try {
            await galleryApi.deleteImage(imageId);
            toast.success('Фото удалено');

            // Update local state
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

        // Reorder list
        const newImages = [...images];
        const draggedItemContent = newImages[dragItem.current];
        newImages.splice(dragItem.current, 1);
        newImages.splice(dragOverItem.current, 0, draggedItemContent);

        // Update sort_order for all affected items
        // We simply assign index as sort_order
        const updatedImages = newImages.map((img, index) => ({ ...img, sort_order: index }));

        setImages(updatedImages);
        dragItem.current = null;
        dragOverItem.current = null;

        // Send updates to backend
        try {
            // We only need to update the changed items, but for simplicity/robustness we can update all or just the range.
            // Let's update all for now to ensure consistency.
            // To avoid too many requests, we could batch or just update the ones that changed index.
            // For a small gallery, Promise.all is fine.
            await Promise.all(updatedImages.map(img =>
                galleryApi.updateImage(img.id, { sort_order: img.sort_order })
            ));
            toast.success('Порядок сохранен');
        } catch (error) {
            toast.error('Ошибка сохранения порядка');
            loadGallery(); // Revert
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
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.map((image, index) => (
                    <div
                        key={image.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={() => handleDragEnd(images, setImages)}
                        onDragOver={(e) => e.preventDefault()}
                        className={`relative group rounded-lg overflow-hidden border-2 aspect-square bg-gray-100 cursor-move ${image.is_visible === false ? 'border-red-300' : 'border-gray-200'
                            }`}
                    >
                        {/* Image */}
                        <img
                            src={`${import.meta.env.VITE_API_URL || window.location.origin}${image.image_path}`}
                            alt={image.title || ''}
                            className="w-full h-full object-cover"
                        />

                        {/* Hidden overlay */}
                        {!image.is_visible && image.is_visible !== undefined && (
                            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px] flex items-center justify-center">
                                <EyeOff className="w-8 h-8 text-white/80" />
                            </div>
                        )}

                        {/* Overlay with actions - Always visible */}
                        <div className="absolute top-2 right-2 flex gap-1 z-50 border border-red-500 bg-white p-1 rounded">
                            <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8 shadow-md"
                                onClick={() => handleToggleVisibility(image)}
                                title={!image.is_visible && image.is_visible !== undefined ? 'Показать' : 'Скрыть'}
                            >
                                {!image.is_visible && image.is_visible !== undefined ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </Button>
                            <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8 shadow-md"
                                onClick={() => handleDelete(image.id)}
                                title="Удалить"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Title Input Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/40 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform">
                            <input
                                type="text"
                                defaultValue={image.title}
                                onBlur={(e) => handleUpdateTitle(image.id, e.target.value)}
                                className="w-full bg-transparent text-white text-xs border-none p-1 focus:ring-0 focus:bg-black/60 rounded placeholder-white/50"
                                placeholder="Подпись..."
                            />
                        </div>
                    </div>
                ))}
            </div>
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

            {/* Inline Settings Panel */}
            {showSettings && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Фото в Портфолио</Label>
                            <Input
                                type="number"
                                min="1"
                                value={displaySettings.portfolio_count}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, portfolio_count: parseInt(e.target.value) || 6 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Фото Салона</Label>
                            <Input
                                type="number"
                                min="1"
                                value={displaySettings.gallery_count}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, gallery_count: parseInt(e.target.value) || 6 })}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={saveSettings} className="w-full">
                                <Save className="w-4 h-4 mr-2" />
                                Сохранить
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">💡 Вкладка "Услуги" не отображается на публичной странице</p>
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
                        <label className="block">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    files.forEach(file => handleUpload('portfolio', file));
                                }}
                            />
                            <Button className="cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Загрузить фото
                            </Button>
                        </label>
                    </div>
                    {renderGalleryGrid(portfolioImages, setPortfolioImages, 'portfolio')}
                </TabsContent>

                <TabsContent value="salon">
                    <div className="mb-4">
                        <label className="block">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    files.forEach(file => handleUpload('salon', file));
                                }}
                            />
                            <Button className="cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Загрузить фото
                            </Button>
                        </label>
                    </div>
                    {renderGalleryGrid(salonImages, setSalonImages, 'salon')}
                </TabsContent>

                <TabsContent value="services">
                    <div className="mb-4">
                        <label className="block">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    files.forEach(file => handleUpload('services', file));
                                }}
                            />
                            <Button className="cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Загрузить фото
                            </Button>
                        </label>
                    </div>
                    {renderGalleryGrid(servicesImages, setServicesImages, 'services')}
                </TabsContent>
            </Tabs>
        </div>
    );
}
