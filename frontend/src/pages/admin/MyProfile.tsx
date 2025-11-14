import React, { useState, useEffect } from "react";
import { User, Mail, Lock, Upload, Loader, Save, Camera } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { api } from "../../services/api";

interface Profile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  photo_url?: string;
}

export default function MyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.getMyProfile();
      if (response.success && response.profile) {
        setProfile(response.profile);
        setFormData({
          username: response.profile.username,
          full_name: response.profile.full_name,
          email: response.profile.email || "",
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимум 5MB");
      return;
    }

    // Проверка типа
    if (!file.type.startsWith("image/")) {
      toast.error("Можно загружать только изображения");
      return;
    }

    try {
      setUploadingPhoto(true);
      const uploadResponse = await api.uploadFile(file);

      if (uploadResponse.url) {
        // Обновляем фото
        const response = await api.updateMyProfile({ photo_url: uploadResponse.url });
        if (response.success) {
          setProfile(response.profile);
          toast.success("Фото обновлено");
        }
      }
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error(error.message || "Ошибка загрузки фото");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    // Валидация
    if (formData.username.length < 3) {
      toast.error("Логин должен быть минимум 3 символа");
      return;
    }

    if (formData.full_name.length < 2) {
      toast.error("Имя должно быть минимум 2 символа");
      return;
    }

    if (formData.email && !formData.email.includes("@")) {
      toast.error("Некорректный email");
      return;
    }

    if (formData.new_password) {
      if (!formData.current_password) {
        toast.error("Укажите текущий пароль");
        return;
      }

      if (formData.new_password.length < 6) {
        toast.error("Новый пароль должен быть минимум 6 символов");
        return;
      }

      if (formData.new_password !== formData.confirm_password) {
        toast.error("Пароли не совпадают");
        return;
      }
    }

    try {
      setSaving(true);

      const updateData: any = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
      };

      if (formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }

      const response = await api.updateMyProfile(updateData);

      if (response.success) {
        setProfile(response.profile);
        toast.success("Профиль обновлен");

        // Очищаем поля паролей
        setFormData({
          ...formData,
          current_password: "",
          new_password: "",
          confirm_password: "",
        });

        // Обновляем localStorage с новым username
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.username = response.profile.username;
          user.full_name = response.profile.full_name;
          user.email = response.profile.email;
          localStorage.setItem("user", JSON.stringify(user));
        }
      } else {
        toast.error(response.error || "Ошибка обновления профиля");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Ошибка обновления профиля");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Профиль не найден</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Мой профиль</h1>
        <p className="text-gray-600">Управление личными данными и паролем</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Фото профиля */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Фото профиля
            </h2>

            <div className="flex flex-col items-center">
              <div className="relative">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}

                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {uploadingPhoto ? (
                    <Loader className="w-5 h-5 animate-spin text-pink-500" />
                  ) : (
                    <Camera className="w-5 h-5 text-gray-600" />
                  )}
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </div>

              <p className="text-sm text-gray-500 mt-4 text-center">
                Нажмите на камеру для загрузки фото
                <br />
                Макс. размер: 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Форма редактирования */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Основная информация
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Логин</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="full_name">Полное имя</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
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
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">
                  Изменить пароль (опционально)
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current_password">Текущий пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="current_password"
                        type="password"
                        value={formData.current_password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_password: e.target.value,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new_password">Новый пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="new_password"
                        type="password"
                        value={formData.new_password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            new_password: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="Минимум 6 символов"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm_password">
                      Подтвердите новый пароль
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirm_password"
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirm_password: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="Повторите новый пароль"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
