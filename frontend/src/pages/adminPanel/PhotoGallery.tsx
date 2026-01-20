// /frontend/src/pages/adminpanel/photogallery.tsx
import { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, Eye, EyeOff, Image as ImageIcon, Search, Filter, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  uploaded_by: string;
  created_at: string;
  is_featured: boolean;
  views: number;
  before_photo_url?: string;
  after_photo_url?: string;
  client_id?: string;
  is_visible?: boolean;
}

interface UploadStats {
  total_photos: number;
  total_views: number;
  featured_count: number;
  recent_uploads: number;
}

interface Category {
  value: string;
  label: string;
}

export default function PhotoGallery() {
  const { t } = useTranslation(['adminpanel/photogallery', 'common']);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<UploadStats>({
    total_photos: 0,
    total_views: 0,
    featured_count: 0,
    recent_uploads: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [uploadType, setUploadType] = useState<'single' | 'before_after'>('single');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'other',
    is_featured: false,
    client_id: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [beforePreviewUrl, setBeforePreviewUrl] = useState<string>('');
  const [afterPreviewUrl, setAfterPreviewUrl] = useState<string>('');
  const [clients, setClients] = useState<Array<{ id: number; name: string; instagram_id: string }>>([]);

  useEffect(() => {
    loadPhotos();
    loadStats();
    loadClients();
    loadCategories();
  }, []);

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.clients) {
          setClients(data.clients);
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/admin/gallery/categories', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/gallery/photos', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.photos) {
          setPhotos(data.photos);
        }
      } else {
        throw new Error('Failed to load photos');
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error(t('toasts.failed_load'));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/gallery/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBeforePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeforePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBeforePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAfterPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    // Проверка: либо одно фото, либо фото до/после
    if (uploadType === 'single' && !selectedFile) {
      toast.error(t('toasts.failed_upload'));
      return;
    }

    if (uploadType === 'before_after' && (!beforePhoto || !afterPhoto)) {
      toast.error(t('toasts.select_both_photos', { defaultValue: 'Please select both before and after photos' }));
      return;
    }

    try {
      const formData = new FormData();

      if (uploadType === 'single' && selectedFile) {
        formData.append('file', selectedFile);
      } else if (uploadType === 'before_after') {
        if (beforePhoto) formData.append('before_photo', beforePhoto);
        if (afterPhoto) formData.append('after_photo', afterPhoto);
      }

      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('category', uploadForm.category);
      formData.append('is_featured', uploadForm.is_featured.toString());
      if (uploadForm.client_id) {
        formData.append('client_id', uploadForm.client_id);
      }

      const response = await fetch('/api/admin/gallery/photos', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        toast.success(t('toasts.uploaded'));
        setShowUploadDialog(false);
        setUploadForm({
          title: '',
          description: '',
          category: 'other',
          is_featured: false,
          client_id: '',
        });
        setSelectedFile(null);
        setBeforePhoto(null);
        setAfterPhoto(null);
        setPreviewUrl('');
        setBeforePreviewUrl('');
        setAfterPreviewUrl('');
        setUploadType('single');
        loadPhotos();
        loadStats();
      } else {
        throw new Error('Failed to upload photo');
      }
    } catch (error) {
      toast.error(t('toasts.failed_upload'));
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm(t('dialogs.delete.confirm'))) return;

    try {
      const response = await fetch(`/api/admin/gallery/photos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success(t('toasts.deleted'));
        loadPhotos();
        loadStats();
      } else {
        throw new Error('Failed to delete photo');
      }
    } catch (error) {
      toast.error(t('toasts.failed_delete'));
    }
  };

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/gallery/photos/${id}/featured`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_featured: !currentStatus }),
      });

      if (response.ok) {
        toast.success(t('toasts.featured_updated'));
        loadPhotos();
        loadStats();
      } else {
        throw new Error('Failed to update featured status');
      }
    } catch (error) {
      toast.error(t('toasts.failed_featured'));
    }
  };

  const handleToggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/gallery/photos/${id}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_visible: !currentStatus }),
      });

      if (response.ok) {
        toast.success(t('toasts.visibility_updated', 'Visibility updated'));
        loadPhotos();
      } else {
        throw new Error('Failed to update visibility');
      }
    } catch (error) {
      toast.error(t('toasts.failed_visibility', 'Failed to update visibility'));
    }
  };

  // Функция для получения label категории
  const getCategoryLabel = (categoryValue: string): string => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category?.label || categoryValue;
  };

  // Функция для получения цвета категории
  const getCategoryColor = (categoryValue: string): string => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-blue-100 text-blue-700',
      'bg-pink-100 text-pink-700',
      'bg-green-100 text-green-700',
      'bg-orange-100 text-orange-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700',
      'bg-gray-100 text-gray-700',
    ];
    // Используем хеш от значения категории для стабильного цвета
    const hash = categoryValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const filteredPhotos = photos
    .filter(photo => {
      const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || photo.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

  const statsCards = [
    {
      title: t('stats.total_photos'),
      value: stats.total_photos.toString(),
      icon: ImageIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('stats.total_views'),
      value: stats.total_views.toLocaleString(),
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('stats.featured_photos'),
      value: stats.featured_count.toString(),
      icon: ImageIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('stats.recent_uploads'),
      value: stats.recent_uploads.toString(),
      icon: Upload,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('upload_photo')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('filters.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">{t('filters.all_categories')}</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPhotos.map((photo) => (
          <Card key={photo.id} className={`overflow-hidden group ${photo.is_visible === false ? 'opacity-75 border-dashed' : ''}`}>
            <div className="relative aspect-square">
              <img
                src={photo.url}
                alt={photo.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setShowPreviewDialog(true);
                  }}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleVisibility(photo.id, photo.is_visible !== false)}
                  title={photo.is_visible !== false ? t('actions.hide', 'Hide') : t('actions.show', 'Show')}
                >
                  {photo.is_visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleFeatured(photo.id, photo.is_featured)}
                >
                  {photo.is_featured ? '★' : '☆'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePhoto(photo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {photo.is_featured && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-yellow-500 text-white">{t('card.featured')}</Badge>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{photo.title}</h3>
                <Badge className={getCategoryColor(photo.category)}>
                  {getCategoryLabel(photo.category)}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">{photo.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(photo.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{photo.views}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPhotos.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('empty.title')}</h3>
            <p className="text-gray-500">{t('empty.description')}</p>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dialogs.upload.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.upload.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Upload Type Selection */}
            <div>
              <Label>{t('dialogs.upload.form.upload_type', 'Тип загрузки')}</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadType"
                    value="single"
                    checked={uploadType === 'single'}
                    onChange={() => setUploadType('single')}
                    className="w-4 h-4"
                  />
                  <span>{t('dialogs.upload.form.single_photo', 'Одно фото')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadType"
                    value="before_after"
                    checked={uploadType === 'before_after'}
                    onChange={() => setUploadType('before_after')}
                    className="w-4 h-4"
                  />
                  <span>{t('dialogs.upload.form.before_after', 'До/После')}</span>
                </label>
              </div>
            </div>

            {/* Single Photo Upload */}
            {uploadType === 'single' && (
              <div>
                <Label>{t('dialogs.upload.form.photo')}</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </div>
                {previewUrl && (
                  <div className="mt-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-64 object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Before/After Photo Upload */}
            {uploadType === 'before_after' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dialogs.upload.form.before_photo', 'Фото "До"')}</Label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleBeforePhotoSelect}
                    />
                  </div>
                  {beforePreviewUrl && (
                    <div className="mt-4">
                      <img
                        src={beforePreviewUrl}
                        alt="Before Preview"
                        className="w-full max-h-48 object-contain rounded-lg border"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label>{t('dialogs.upload.form.after_photo', 'Фото "После"')}</Label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAfterPhotoSelect}
                    />
                  </div>
                  {afterPreviewUrl && (
                    <div className="mt-4">
                      <img
                        src={afterPreviewUrl}
                        alt="After Preview"
                        className="w-full max-h-48 object-contain rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label>{t('dialogs.upload.form.title')}</Label>
              <Input
                placeholder={t('dialogs.upload.form.title_placeholder')}
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('dialogs.upload.form.description')}</Label>
              <Input
                placeholder={t('dialogs.upload.form.description_placeholder')}
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('dialogs.upload.form.category')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('dialogs.upload.form.client', 'Клиент')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={uploadForm.client_id}
                onChange={(e) => setUploadForm({ ...uploadForm, client_id: e.target.value })}
              >
                <option value="">{t('dialogs.upload.form.select_client', 'Выберите клиента')}</option>
                {clients.map((client) => (
                  <option key={client.instagram_id} value={client.instagram_id}>
                    {client.name} {client.instagram_id ? `(@${client.instagram_id})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {t('dialogs.upload.form.client_hint', 'Фото будет доступно в галерее клиента')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={uploadForm.is_featured}
                onChange={(e) => setUploadForm({ ...uploadForm, is_featured: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="featured" className="cursor-pointer">{t('card.toggle_featured')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleUpload}>
              <Upload className="w-4 h-4 mr-2" />
              {t('buttons.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.title}</DialogTitle>
            <DialogDescription>{selectedPhoto?.description}</DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="w-full max-h-96 object-contain rounded-lg"
              />
              <div className="flex items-center justify-between">
                <Badge className={getCategoryColor(selectedPhoto.category)}>
                  {getCategoryLabel(selectedPhoto.category)}
                </Badge>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{t('card.uploaded_by', { name: selectedPhoto.uploaded_by })}</span>
                  <span>{new Date(selectedPhoto.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{selectedPhoto.views} {t('card.views')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              {t('buttons.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
