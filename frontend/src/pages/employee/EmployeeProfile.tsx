// /frontend/src/pages/employee/EmployeeProfile.tsx
import React, { useState, useEffect } from 'react';
import { User, Mail, Save, AlertCircle, Upload, Camera, Loader, Instagram, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface EmployeeProfile {
  id: number;
  full_name: string;
  name?: string;
  position: string;
  position_ru?: string;
  position_ar?: string;
  experience?: string;
  photo?: string;
  bio?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  is_active: boolean;
}

export default function EmployeeProfile() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    experience: '',
    photo: '',
    bio: '',
    phone: '',
    email: '',
    instagram: ''
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getMyEmployeeProfile();

      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        position: data.position || '',
        experience: data.experience || '',
        photo: data.photo || '',
        bio: data.bio || '',
        phone: data.phone || '',
        email: data.email || '',
        instagram: data.instagram || ''
      });

      if (data.photo) {
        setPhotoPreview(data.photo);
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      toast.error(err.message || 'Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const result = await api.uploadFile(file);

      setFormData({ ...formData, photo: result.file_url });
      toast.success('Фото загружено успешно');
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      toast.error(err.message || 'Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.full_name || formData.full_name.length < 2) {
      toast.error('Имя должно содержать минимум 2 символа');
      return;
    }

    if (!formData.position || formData.position.length < 2) {
      toast.error('Должность должна содержать минимум 2 символа');
      return;
    }

    try {
      setSaving(true);

      await api.updateMyEmployeeProfile(formData);

      // Reload profile
      await loadProfile();

      toast.success('Профиль успешно обновлен');
    } catch (err: any) {
      const message = err.message || 'Ошибка обновления профиля';
      toast.error(`${message}`);
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-red-800 font-medium">Ошибка загрузки профиля</p>
            <p className="text-red-700 text-sm mt-1">
              Похоже, ваш аккаунт не привязан к профилю сотрудника. Обратитесь к администратору.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-pink-600" />
            Мой профиль
          </h1>
          <p className="text-gray-600">Управление личными данными и информацией для клиентов</p>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            {/* Photo Section */}
            <div className="mb-8 flex flex-col items-center">
              <Label className="text-lg font-semibold mb-4">Фотография профиля</Label>

              <div className="relative">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-pink-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                    {formData.full_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 bg-pink-600 text-white p-2 rounded-full cursor-pointer hover:bg-pink-700 transition-colors shadow-lg"
                >
                  {uploadingPhoto ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>

              <p className="text-sm text-gray-500 mt-3 text-center">
                Рекомендуется: квадратное фото, минимум 300x300px
              </p>
            </div>

            {/* Basic Info */}
            <h2 className="text-xl text-gray-900 mb-6 font-semibold">Основная информация</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="full_name">Полное имя *</Label>
                <Input
                  id="full_name"
                  required
                  disabled={saving}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ваше полное имя"
                  minLength={2}
                />
              </div>

              <div>
                <Label htmlFor="position">Должность *</Label>
                <Input
                  id="position"
                  required
                  disabled={saving}
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Например: HAIR STYLIST"
                  minLength={2}
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="experience">Опыт работы</Label>
              <Input
                id="experience"
                disabled={saving}
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="Например: 5 лет"
              />
            </div>

            {/* Contact Info */}
            <h2 className="text-xl text-gray-900 mb-6 font-semibold mt-8">Контактная информация</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    disabled={saving}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+971 XX XXX XXXX"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    disabled={saving}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="instagram">Instagram</Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="instagram"
                  disabled={saving}
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@your_instagram"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Bio */}
            <h2 className="text-xl text-gray-900 mb-6 font-semibold mt-8">О себе</h2>

            <div className="mb-6">
              <Label htmlFor="bio">Биография</Label>
              <Textarea
                id="bio"
                disabled={saving}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Расскажите о себе, своих достижениях, сертификатах..."
                rows={6}
                className="resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                Эта информация будет видна клиентам на публичной странице
              </p>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Совет:</strong> Заполните все поля для создания полного профиля.
            Ваша информация будет отображаться на публичной странице и поможет клиентам
            узнать о вас больше и выбрать именно вас для записи.
          </p>
        </div>
      </div>
    </div>
  );
}
