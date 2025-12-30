// /frontend/src/pages/adminPanel/PhotoGallery.tsx
import { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, Eye, Image as ImageIcon, Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
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
  category: 'haircut' | 'coloring' | 'styling' | 'manicure' | 'makeup' | 'other';
  uploaded_by: string;
  created_at: string;
  is_featured: boolean;
  views: number;
}

interface UploadStats {
  total_photos: number;
  total_views: number;
  featured_count: number;
  recent_uploads: number;
}

export default function PhotoGallery() {
  const { t } = useTranslation(['adminPanel/PhotoGallery', 'common']);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
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
  const [filterCategory, setFilterCategory] = useState<'all' | GalleryPhoto['category']>('all');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'other' as GalleryPhoto['category'],
    is_featured: false,
    client_id: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [clients, setClients] = useState<Array<{ id: number; name: string; instagram_id: string }>>([]);

  useEffect(() => {
    loadPhotos();
    loadStats();
    loadClients();
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

  const loadPhotos = async () => {
    try {
      setLoading(true);
      // TODO: API call
      // Mock data
      setPhotos([
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
          title: 'Современная стрижка',
          description: 'Стильная короткая стрижка для женщин',
          category: 'haircut',
          uploaded_by: 'Admin',
          created_at: '2026-06-15T10:00:00Z',
          is_featured: true,
          views: 245,
        },
        {
          id: '2',
          url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
          title: 'Окрашивание балаяж',
          description: 'Натуральное окрашивание в технике балаяж',
          category: 'coloring',
          uploaded_by: 'Admin',
          created_at: '2026-06-14T15:00:00Z',
          is_featured: true,
          views: 189,
        },
        {
          id: '3',
          url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
          title: 'Вечерняя укладка',
          description: 'Элегантная укладка для особого случая',
          category: 'styling',
          uploaded_by: 'Admin',
          created_at: '2026-06-13T12:00:00Z',
          is_featured: false,
          views: 156,
        },
        {
          id: '4',
          url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400',
          title: 'Маникюр с дизайном',
          description: 'Красивый маникюр с цветочным дизайном',
          category: 'manicure',
          uploaded_by: 'Admin',
          created_at: '2026-06-12T09:00:00Z',
          is_featured: false,
          views: 134,
        },
        {
          id: '5',
          url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400',
          title: 'Вечерний макияж',
          description: 'Профессиональный вечерний макияж',
          category: 'makeup',
          uploaded_by: 'Admin',
          created_at: '2026-06-11T16:00:00Z',
          is_featured: true,
          views: 201,
        },
        {
          id: '6',
          url: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400',
          title: 'Мужская стрижка',
          description: 'Классическая мужская стрижка',
          category: 'haircut',
          uploaded_by: 'Admin',
          created_at: '2026-06-10T11:00:00Z',
          is_featured: false,
          views: 98,
        },
      ]);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error(t('toasts.failed_load'));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // TODO: API call
      setStats({
        total_photos: 87,
        total_views: 3421,
        featured_count: 12,
        recent_uploads: 8,
      });
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

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t('toasts.failed_upload'));
      return;
    }

    try {
      // TODO: API call to upload photo
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // formData.append('title', uploadForm.title);
      // formData.append('description', uploadForm.description);
      // formData.append('category', uploadForm.category);
      // formData.append('is_featured', uploadForm.is_featured.toString());

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
      setPreviewUrl('');
      loadPhotos();
      loadStats();
    } catch (error) {
      toast.error(t('toasts.failed_upload'));
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm(t('dialogs.delete.confirm'))) return;

    try {
      // TODO: API call
      toast.success(t('toasts.deleted'));
      loadPhotos();
      loadStats();
    } catch (error) {
      toast.error(t('toasts.failed_delete'));
    }
  };

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      // TODO: API call
      toast.success(t('toasts.featured_updated'));
      loadPhotos();
      loadStats();
    } catch (error) {
      toast.error(t('toasts.failed_featured'));
    }
  };

  const categoryLabels: Record<GalleryPhoto['category'], string> = {
    haircut: t('categories.haircut'),
    coloring: t('categories.coloring'),
    styling: t('categories.styling'),
    manicure: t('categories.manicure'),
    makeup: t('categories.makeup'),
    other: t('categories.other'),
  };

  const categoryColors: Record<GalleryPhoto['category'], string> = {
    haircut: 'bg-blue-100 text-blue-700',
    coloring: 'bg-purple-100 text-purple-700',
    styling: 'bg-pink-100 text-pink-700',
    manicure: 'bg-green-100 text-green-700',
    makeup: 'bg-orange-100 text-orange-700',
    other: 'bg-gray-100 text-gray-700',
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
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: t('stats.recent_uploads'),
      value: stats.recent_uploads.toString(),
      icon: Upload,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

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
                onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
                className="px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">{t('filters.all_categories')}</option>
                <option value="haircut">{t('categories.haircut')}</option>
                <option value="coloring">{t('categories.coloring')}</option>
                <option value="styling">{t('categories.styling')}</option>
                <option value="manicure">{t('categories.manicure')}</option>
                <option value="makeup">{t('categories.makeup')}</option>
                <option value="other">{t('categories.other')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPhotos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden group">
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
                  <Eye className="w-4 h-4" />
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
                <Badge className={categoryColors[photo.category]}>
                  {categoryLabels[photo.category]}
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
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as GalleryPhoto['category'] })}
              >
                <option value="haircut">{t('categories.haircut')}</option>
                <option value="coloring">{t('categories.coloring')}</option>
                <option value="styling">{t('categories.styling')}</option>
                <option value="manicure">{t('categories.manicure')}</option>
                <option value="makeup">{t('categories.makeup')}</option>
                <option value="other">{t('categories.other')}</option>
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
                  <option key={client.id} value={client.id}>
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
                <Badge className={categoryColors[selectedPhoto.category]}>
                  {categoryLabels[selectedPhoto.category]}
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
