// /frontend/src/components/admin/publicContent/BannersTab.tsx
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Image as ImageIcon, Link as LinkIcon, Calendar, Eye, EyeOff, MousePointerClick, FlipHorizontal, FlipVertical } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from 'sonner';
import { apiClient, BASE_URL } from '../../../api/client';

const getAbsoluteImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface Banner {
    id: number;
    title_ru: string;
    subtitle_ru?: string;
    image_url: string;
    link_url?: string;
    display_order: number;
    is_active: boolean;
    bg_pos_desktop_x?: number;
    bg_pos_desktop_y?: number;
    bg_pos_mobile_x?: number;
    bg_pos_mobile_y?: number;
    is_flipped_horizontal?: number | boolean;
    is_flipped_vertical?: number | boolean;
}

const VisualPositionPicker = ({
    label,
    imageUrl,
    x,
    y,
    onChange,
    previewAspectRatio,
    isFlippedH,
    isFlippedV
}: {
    label: string,
    imageUrl: string,
    x: number,
    y: number,
    onChange: (x: number, y: number) => void,
    previewAspectRatio: string,
    isFlippedH?: boolean,
    isFlippedV?: boolean
}) => {
    const { t } = useTranslation('admin/publiccontent');
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleInteract = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        // Calculate visual percentage relative to the container
        let visualX = ((clientX - rect.left) / rect.width) * 100;
        let visualY = ((clientY - rect.top) / rect.height) * 100;

        // Clamp values
        visualX = Math.max(0, Math.min(100, visualX));
        visualY = Math.max(0, Math.min(100, visualY));

        // Preview shows original image, so visual position = actual position
        onChange(Math.round(visualX), Math.round(visualY));
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleInteract(e);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging) {
            handleInteract(e);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    // Preview shows original, so marker position = x/y
    const markerLeft = x;
    const markerTop = y;


    return (
        <div className="space-y-3 border p-4 rounded-md bg-gray-50/50">
            <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">{label}</Label>
                <span className="text-xs font-mono text-muted-foreground">
                    {t('banners.position')}: {x}% {y}%
                </span>
            </div>

            <div className="space-y-1">
                <div className="text-xs text-muted-foreground mb-1">
                    {t('banners.click_to_select_center')}
                </div>

                <div
                    ref={containerRef}
                    className={`relative w-full ${previewAspectRatio} rounded-md overflow-hidden border bg-gray-200 shadow-inner cursor-crosshair touch-none group`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                >
                    {imageUrl ? (
                        <>
                            <img
                                src={getAbsoluteImageUrl(imageUrl)}
                                alt="Preview"
                                className="w-full h-full object-cover transition-all duration-75 select-none pointer-events-none"
                                style={{
                                    objectPosition: `${x}% ${y}%`,
                                    transform: [
                                        isFlippedH ? 'scaleX(-1)' : '',
                                        isFlippedV ? 'scaleY(-1)' : ''
                                    ].filter(Boolean).join(' ')
                                }}
                            />

                            {/* Marker */}
                            <div
                                className="absolute w-6 h-6 border-2 border-white bg-primary/80 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 ease-out z-10 flex items-center justify-center"
                                style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
                            >
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            {t('banners.no_photo')}
                        </div>
                    )}

                    {/* Overlay to simulate text contrast */}
                    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

export default function BannersTab() {
    const { t } = useTranslation(['admin/publiccontent', 'common']);
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
        link_url: '',
        bg_pos_desktop_x: 50,
        bg_pos_desktop_y: 50,
        bg_pos_mobile_x: 50,
        bg_pos_mobile_y: 50,
        is_flipped_horizontal: false,
        is_flipped_vertical: false
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

            toast.success(t('banners.settings_saved'));
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error(t('banners.error_save_settings'));
        }
    };

    const loadBanners = async () => {
        try {
            const data = await apiClient.getPublicBanners();
            setBanners(data.banners || []);
        } catch (error) {
            console.error('Error loading banners:', error);
            toast.error(t('banners.error_load'));
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const response = await apiClient.uploadFile(file, 'faces');
            // We use file_url (relative path) for the database
            const relativeUrl = response.file_url;

            setFormData({ ...formData, image_url: relativeUrl });
            toast.success(t('banners.file_uploaded'));
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(t('banners.error_file_upload'));
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBanner) {
                await apiClient.updatePublicBanner(editingBanner.id, formData);
                toast.success(t('banners.banner_updated'));
            } else {
                await apiClient.createPublicBanner(formData);
                toast.success(t('banners.banner_created'));
            }
            setIsDialogOpen(false);
            loadBanners();
            resetForm();
        } catch (error) {
            console.error('Error saving banner:', error);
            toast.error(t('banners.error_save'));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('banners.delete_confirm'))) return;
        try {
            await apiClient.deletePublicBanner(id);
            toast.success(t('banners.banner_deleted'));
            loadBanners();
        } catch (error) {
            toast.error(t('banners.error_delete'));
        }
    };

    const handleToggleVisibility = async (banner: Banner) => {
        const nextIsActive = !banner.is_active;
        // Optimistic update
        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: nextIsActive } : b));
        try {
            await apiClient.updatePublicBanner(banner.id, { is_active: nextIsActive });
            toast.success(nextIsActive ? t('banners.banner_activated') : t('banners.banner_hidden'));
            // Dispatch event to notify public page
            window.dispatchEvent(new CustomEvent('bannerUpdated'));
        } catch (error) {
            toast.error(t('banners.error_update'));
            loadBanners();
        }
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setFormData({
            title_ru: banner.title_ru,
            subtitle_ru: banner.subtitle_ru || '',
            image_url: banner.image_url || '',
            link_url: banner.link_url || '',
            bg_pos_desktop_x: banner.bg_pos_desktop_x ?? 50,
            bg_pos_desktop_y: banner.bg_pos_desktop_y ?? 50,
            bg_pos_mobile_x: banner.bg_pos_mobile_x ?? 50,
            bg_pos_mobile_y: banner.bg_pos_mobile_y ?? 50,
            is_flipped_horizontal: !!(banner.is_flipped_horizontal),
            is_flipped_vertical: !!(banner.is_flipped_vertical)
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingBanner(null);
        setFormData({
            title_ru: '',
            subtitle_ru: '',
            image_url: '',
            link_url: '',
            bg_pos_desktop_x: 50,
            bg_pos_desktop_y: 50,
            bg_pos_mobile_x: 50,
            bg_pos_mobile_y: 50,
            is_flipped_horizontal: false,
            is_flipped_vertical: false
        });
        setUploadTab('url');
    };

    if (loading) return <div>{t('banners.loading')}</div>;

    return (
        <div className="space-y-8">
            {/* Global Settings Section */}
            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {t('banners.page_settings')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="rotation-interval">{t('banners.rotation_interval')}</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="rotation-interval"
                                type="number"
                                min="1"
                                max="60"
                                value={rotationInterval}
                                onChange={(e) => setRotationInterval(parseInt(e.target.value) || 5)}
                                className="w-full px-3"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="promo-end-date">{t('banners.promo_end_date')}</Label>
                        <Input
                            id="promo-end-date"
                            type="datetime-local"
                            value={promoEndDate}
                            onChange={(e) => setPromoEndDate(e.target.value)}
                            className="w-full px-3"
                        />
                        <p className="text-xs text-gray-500">
                            {t('banners.promo_hint')}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={saveSettings}>
                        {t('banners.save_settings')}
                    </Button>
                </div>
            </div>

            {/* Banners List Section */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-semibold">{t('banners.list_title')}</h2>
                        <p className="text-sm text-gray-500">{t('banners.list_hint')}</p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                {t('banners.add_banner')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingBanner ? t('banners.edit_banner') : t('banners.new_banner')}
                                </DialogTitle>
                                <DialogDescription>
                                    {t('banners.form_hint')}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="title">{t('banners.title_label')}</Label>
                                        <Input
                                            id="title"
                                            value={formData.title_ru}
                                            onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                                            placeholder={t('banners.title_placeholder')}
                                            className="px-3"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="subtitle">{t('banners.subtitle_label')}</Label>
                                        <Input
                                            id="subtitle"
                                            value={formData.subtitle_ru}
                                            onChange={(e) => setFormData({ ...formData, subtitle_ru: e.target.value })}
                                            placeholder={t('banners.subtitle_placeholder')}
                                            className="px-3"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="link">{t('banners.link_label')}</Label>
                                        <Input
                                            id="link"
                                            value={formData.link_url}
                                            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                            placeholder="/services"
                                            className="px-3"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('banners.image_label')}</Label>
                                        <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="url">{t('banners.url_tab')}</TabsTrigger>
                                                <TabsTrigger value="file">{t('banners.file_tab')}</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="url" className="mt-2">
                                                <Input
                                                    value={formData.image_url}
                                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                    placeholder="https://example.com/image.jpg"
                                                    className="pl-3 pr-3"
                                                />
                                            </TabsContent>
                                            <TabsContent value="file" className="mt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => document.getElementById('banner-file-upload')?.click()}
                                                    disabled={uploading}
                                                >
                                                    {uploading ? t('banners.uploading') : t('banners.choose_file')}
                                                </Button>
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
                                    </div>
                                </div>

                                {/* Position Controls */}
                                {formData.image_url && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <MousePointerClick className="w-4 h-4 text-primary" />
                                                <h4 className="font-medium">{t('banners.display_settings')}</h4>
                                            </div>

                                            {/* Flip Controls */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="flip-h"
                                                        checked={formData.is_flipped_horizontal}
                                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_flipped_horizontal: !!checked }))}
                                                    />
                                                    <Label htmlFor="flip-h" className="flex items-center gap-1 cursor-pointer">
                                                        <FlipHorizontal className="w-4 h-4" />
                                                        <span className="text-xs">{t('banners.flip_horizontal')}</span>
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="flip-v"
                                                        checked={formData.is_flipped_vertical}
                                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_flipped_vertical: !!checked }))}
                                                    />
                                                    <Label htmlFor="flip-v" className="flex items-center gap-1 cursor-pointer">
                                                        <FlipVertical className="w-4 h-4" />
                                                        <span className="text-xs">{t('banners.flip_vertical')}</span>
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <VisualPositionPicker
                                                label={t('banners.desktop_position')}
                                                imageUrl={formData.image_url}
                                                x={formData.bg_pos_desktop_x}
                                                y={formData.bg_pos_desktop_y}
                                                onChange={(x, y) => setFormData(prev => ({ ...prev, bg_pos_desktop_x: x, bg_pos_desktop_y: y }))}
                                                previewAspectRatio="aspect-video"
                                                isFlippedH={formData.is_flipped_horizontal}
                                                isFlippedV={formData.is_flipped_vertical}
                                            />

                                            <VisualPositionPicker
                                                label={t('banners.mobile_position')}
                                                imageUrl={formData.image_url}
                                                x={formData.bg_pos_mobile_x}
                                                y={formData.bg_pos_mobile_y}
                                                onChange={(x, y) => setFormData(prev => ({ ...prev, bg_pos_mobile_x: x, bg_pos_mobile_y: y }))}
                                                previewAspectRatio="aspect-[9/16]"
                                                isFlippedH={formData.is_flipped_horizontal}
                                                isFlippedV={formData.is_flipped_vertical}
                                            />
                                        </div>
                                    </div>
                                )}

                                <Button type="submit" className="w-full" disabled={uploading}>
                                    {editingBanner ? t('common:save') : t('banners.create')}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map((banner) => (
                        <div
                            key={banner.id}
                            className="group relative bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-44"
                        >
                            {/* Background Image */}
                            {banner.image_url ? (
                                <img
                                    src={getAbsoluteImageUrl(banner.image_url)}
                                    alt={banner.title_ru || banner.id.toString()}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    style={{
                                        objectPosition: `${banner.bg_pos_desktop_x ?? 50}% ${banner.bg_pos_desktop_y ?? 50}% `,
                                        transform: [
                                            banner.is_flipped_horizontal ? 'scaleX(-1)' : '',
                                            banner.is_flipped_vertical ? 'scaleY(-1)' : ''
                                        ].filter(Boolean).join(' ') || 'none'
                                    }}
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
                                <h3 className="font-bold text-lg leading-tight mb-1">{banner.title_ru || t('banners.default_title', { defaultValue: 'M Le Diamant' })}</h3>
                                {(banner.subtitle_ru || !banner.title_ru) && (
                                    <p className="text-sm text-white/80 mb-2">{banner.subtitle_ru || t('banners.default_subtitle', { defaultValue: 'Premium Beauty Salon' })}</p>
                                )}
                            </div>    {banner.link_url && (
                                <div className="flex items-center gap-1 text-xs text-blue-300">
                                    <LinkIcon className="w-3 h-3" />
                                    {banner.link_url}
                                </div>
                            )}

                            {/* Actions (Top Right) */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-white/90 hover:bg-white"
                                    onClick={() => handleToggleVisibility(banner)}
                                    title={banner.is_active ? t('gallery.hide') : t('gallery.show')}
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
                                    {t('banners.status_hidden')}
                                </div>
                            )}
                        </div>
                    ))}

                    {banners.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                            {t('banners.no_banners')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
