import React, { useState, useEffect } from 'react';
import {
    Mail, Save, AlertCircle, Key, Loader2,
    Calendar, User as UserIcon, Camera, Briefcase
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { getPhotoUrl } from '../../utils/photoUtils';
import { useAuth } from '../../contexts/AuthContext';

interface UserProfile {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
    photo?: string | null;
    created_at?: string;
    last_login?: string;
    employee_id?: number;
}

interface EmployeeProfileData {
    id: number;
    full_name: string;
    position: string;
    experience?: string;
    photo?: string;
    bio?: string;
    phone?: string;
    email?: string;
    instagram?: string;
    is_active: boolean;
}

export default function UniversalProfile() {
    const { user: currentUser } = useAuth();
    const userId = currentUser?.id;
    const { t } = useTranslation(['employee/profile', 'common']);

    const [user, setUser] = useState<UserProfile | null>(null);
    const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Данные для редактирования user account
    const [profileData, setProfileData] = useState({
        username: '',
        full_name: '',
        email: '',
        phone: ''
    });

    // Данные для редактирования employee profile
    const [employeeData, setEmployeeData] = useState({
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

    // Данные для смены пароля
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        if (userId) {
            loadProfile();
        }
    }, [userId]);

    const loadProfile = async () => {
        if (!userId) return;
        try {
            setLoading(true);

            // Load user account data
            const userData = await api.getUserProfile(userId);

            setUser(userData);
            setProfileData({
                username: userData.username || '',
                full_name: userData.full_name || '',
                email: userData.email || '',
                phone: ''
            });

            // Set photo from userData first
            if (userData.photo) {
                setPhotoPreview(userData.photo);
            }

            // Load employee profile data if user has employee_id
            if (userData.employee_id || currentUser?.role === 'employee') {
                try {
                    const empData = await api.getMyEmployeeProfile();
                    setEmployeeProfile(empData);
                    setEmployeeData({
                        full_name: empData.full_name || '',
                        position: empData.position || '',
                        experience: empData.experience || '',
                        photo: empData.photo || userData.photo || '',
                        bio: empData.bio || '',
                        phone: empData.phone || '',
                        email: empData.email || '',
                        instagram: empData.instagram || ''
                    });
                    // Override with empData.photo if available
                    if (empData.photo) {
                        setPhotoPreview(empData.photo);
                    }
                } catch (empErr) {
                    console.log('Employee profile not available:', empErr);
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            toast.error(t('error_loading_profile'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        if (!profileData.username || profileData.username.length < 3) {
            toast.error(t('username_must_be_at_least_3_characters'));
            return;
        }

        if (!profileData.full_name || profileData.full_name.length < 2) {
            toast.error(t('full_name_must_be_at_least_2_characters'));
            return;
        }

        try {
            setSaving(true);
            await api.updateUserProfile(userId, {
                username: profileData.username,
                full_name: profileData.full_name,
                email: profileData.email
            });

            // Перезагружаем профиль
            await loadProfile();
            toast.success(t('profile_successfully_updated'));
        } catch (err) {
            const message = err instanceof Error ? err.message : t('error_updating_profile');
            toast.error(`${message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        if (!passwordData.old_password) {
            toast.error(t('enter_current_password'));
            return;
        }

        if (!passwordData.new_password || passwordData.new_password.length < 6) {
            toast.error(t('new_password_must_be_at_least_6_characters'));
            return;
        }

        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error(t('passwords_do_not_match'));
            return;
        }

        try {
            setSaving(true);
            await api.changePassword(userId, {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });

            toast.success(t('password_successfully_changed'));
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            const message = err instanceof Error ? err.message : t('error_changing_password');
            toast.error(`${message}`);
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Пожалуйста, выберите изображение');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Размер файла не должен превышать 5MB');
            return;
        }

        try {
            setUploadingPhoto(true);
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            const result = await api.uploadFile(file);
            setEmployeeData({ ...employeeData, photo: result.file_url });
            toast.success('Фото загружено успешно');
        } catch (err: any) {
            toast.error(err.message || 'Ошибка загрузки фото');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleUpdateEmployeeProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!employeeData.full_name || employeeData.full_name.length < 2) {
            toast.error('Имя должно содержать минимум 2 символа');
            return;
        }

        try {
            setSaving(true);
            await api.updateMyEmployeeProfile(employeeData);
            await loadProfile();
            toast.success('Профиль сотрудника успешно обновлен');
        } catch (err: any) {
            toast.error(err.message || 'Ошибка обновления профиля');
        } finally {
            setSaving(false);
        }
    };

    const roleLabels: Record<string, { label: string; color: string }> = {
        admin: { label: t('admin'), color: 'bg-blue-100 text-blue-800' },
        manager: { label: t('manager'), color: 'bg-blue-100 text-blue-800' },
        employee: { label: t('employee'), color: 'bg-green-100 text-green-800' }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
                    <p className="text-gray-600">{t('loading_profile')}</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-red-800 font-medium">{t('error_loading_profile')}</p>
                        <p className="text-red-700 text-sm mt-1">{t('try_reloading_page')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
                        <UserIcon className="w-8 h-8 text-pink-600" />
                        {t('my_profile')}
                    </h1>
                    <p className="text-gray-600">{t('manage_personal_data_and_security_settings')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden relative">
                            {user.photo ? (
                                <img
                                    src={getPhotoUrl(user.photo) || undefined}
                                    alt={user.full_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : null}
                            <span className={`${user.photo ? 'hidden' : 'flex'} w-full h-full items-center justify-center absolute top-0 left-0 bg-gradient-to-br from-pink-500 to-blue-600`}>
                                {user.full_name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl text-gray-900 font-bold mb-2">{user.full_name}</h2>
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <Badge className={roleLabels[user.role]?.color || 'bg-gray-100 text-gray-800'}>
                                    {roleLabels[user.role]?.label || user.role}
                                </Badge>
                                <span className="text-sm text-gray-600">@{user.username}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                {user.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-500" />
                                        {user.email}
                                    </div>
                                )}
                                {user.created_at && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        {t('in_system_since')} {new Date(user.created_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue={employeeProfile ? "employee" : "profile"} className="space-y-6">
                    <TabsList className={`grid w-full ${employeeProfile ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {employeeProfile && (
                            <TabsTrigger value="employee">
                                <Briefcase className="w-4 h-4 mr-2" />
                                {t('employee_profile')}
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="profile">
                            <UserIcon className="w-4 h-4 mr-2" />
                            {t('account')}
                        </TabsTrigger>
                        <TabsTrigger value="password">
                            <Key className="w-4 h-4 mr-2" />
                            {t('change_password')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                            <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('account')}</h2>
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div>
                                    <Label htmlFor="username">{t('username')} *</Label>
                                    <Input
                                        id="username"
                                        required
                                        disabled={saving}
                                        value={profileData.username}
                                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                        minLength={3}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">{t('email')}</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            disabled={saving}
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    {t('save_changes')}
                                </Button>
                            </form>
                        </div>
                    </TabsContent>

                    <TabsContent value="password">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                            <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('change_password')}</h2>
                            <form onSubmit={handleChangePassword} className="space-y-6">
                                <div>
                                    <Label htmlFor="old_password">{t('current_password')} *</Label>
                                    <Input
                                        id="old_password"
                                        type="password"
                                        required
                                        disabled={saving}
                                        value={passwordData.old_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="new_password">{t('new_password')} *</Label>
                                    <Input
                                        id="new_password"
                                        type="password"
                                        required
                                        disabled={saving}
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="confirm_password">{t('confirm_new_password')} *</Label>
                                    <Input
                                        id="confirm_password"
                                        type="password"
                                        required
                                        disabled={saving}
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                        minLength={6}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                                    {t('change_password')}
                                </Button>
                            </form>
                        </div>
                    </TabsContent>

                    {employeeProfile && (
                        <TabsContent value="employee">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                                <form onSubmit={handleUpdateEmployeeProfile}>
                                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                                        <div className="flex-shrink-0 flex flex-col items-center md:items-start space-y-4">
                                            <Label className="text-lg font-semibold">{t('profile_photo')}</Label>
                                            <div className="relative group">
                                                <div className="w-40 h-40 rounded-xl overflow-hidden shadow-md bg-gray-100 flex items-center justify-center relative">
                                                    {photoPreview ? (
                                                        <img
                                                            src={getPhotoUrl(photoPreview) || photoPreview}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : null}
                                                    <div className={`${photoPreview ? 'hidden' : 'flex'} w-full h-full absolute top-0 left-0 bg-gradient-to-br from-pink-500 to-blue-600 items-center justify-center text-white text-5xl font-bold`}>
                                                        {employeeData.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                                <label className="absolute bottom-2 right-2 bg-pink-600 text-white p-2 rounded-full cursor-pointer hover:bg-pink-700 transition-colors shadow-lg">
                                                    {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <Label>{t('full_name')} *</Label>
                                                    <Input value={employeeData.full_name} onChange={(e) => setEmployeeData({ ...employeeData, full_name: e.target.value })} required />
                                                </div>
                                                <div>
                                                    <Label>{t('position')} *</Label>
                                                    <Input value={employeeData.position} onChange={(e) => setEmployeeData({ ...employeeData, position: e.target.value })} required />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <Label>{t('phone')}</Label>
                                                    <Input value={employeeData.phone} onChange={(e) => setEmployeeData({ ...employeeData, phone: e.target.value })} />
                                                </div>
                                                <div>
                                                    <Label>{t('instagram')}</Label>
                                                    <Input value={employeeData.instagram} onChange={(e) => setEmployeeData({ ...employeeData, instagram: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>{t('bio')}</Label>
                                                <Textarea value={employeeData.bio} onChange={(e) => setEmployeeData({ ...employeeData, bio: e.target.value })} rows={4} />
                                            </div>
                                            <Button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-pink-500 to-blue-600">
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                                {t('save_changes')}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
