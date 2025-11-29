// /frontend/src/components/admin/EmployeeInformation.tsx
import { useState, useEffect } from 'react';
import { User, Mail, Phone, Send, Instagram, MessageCircle, Briefcase, Award, Star, FileText, Lock, Camera, Loader, Upload, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { getPhotoUrl } from '../../utils/photoUtils';

interface Employee {
    id: number;
    username: string;
    full_name: string;
    email: string;
    phone?: string;
    phone_number?: string;
    birth_date?: string;
    birthday?: string;
    position?: string;
    instagram_link?: string;
    whatsapp?: string;
    telegram?: string;
    years_of_experience?: string | number;
    specialization?: string;
    about_me?: string;
    photo_url?: string;
    photo?: string;
}

interface EmployeeInformationProps {
    employee: Employee;
    onUpdate: () => void;
}

export function EmployeeInformation({ employee, onUpdate }: EmployeeInformationProps) {
    const { t } = useTranslation(['admin/users', 'admin/settings', 'common']);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [form, setForm] = useState({
        username: '',
        full_name: '',
        email: '',
        phone_number: '',
        birth_date: '',
        instagram_link: '',
        whatsapp: '',
        telegram: '',
        position: '',
        years_of_experience: '',
        specialization: '',
        about_me: '',
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    useEffect(() => {
        setForm({
            username: employee.username || '',
            full_name: employee.full_name || '',
            email: employee.email || '',
            phone_number: employee.phone_number || employee.phone || '',
            birth_date: employee.birth_date || employee.birthday || '',
            instagram_link: employee.instagram_link || '',
            whatsapp: employee.whatsapp || '',
            telegram: employee.telegram || '',
            position: employee.position || '',
            years_of_experience: String(employee.years_of_experience || ''),
            specialization: employee.specialization || '',
            about_me: employee.about_me || '',
            current_password: '',
            new_password: '',
            confirm_password: '',
        });
    }, [employee]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('file_too_large', 'File too large (max 5MB)'));
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error(t('images_only', 'Only images allowed'));
            return;
        }

        try {
            setUploadingPhoto(true);
            const uploadResponse = await api.uploadFile(file);
            if (uploadResponse.url) {
                await api.updateUserProfile(employee.id, {
                    username: employee.username,
                    full_name: employee.full_name,
                    email: employee.email,
                    photo: uploadResponse.url,
                } as any);
                toast.success(t('photo_updated', 'Photo updated'));
                onUpdate();
            }
        } catch (err: any) {
            toast.error(err.message || t('error_photo_upload', 'Error uploading photo'));
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSave = async () => {
        if (form.username.length < 3) {
            toast.error(t('error_username_too_short', 'Username too short'));
            return;
        }

        if (form.full_name.length < 2) {
            toast.error(t('error_name_too_short', 'Name too short'));
            return;
        }

        if (form.email && !form.email.includes('@')) {
            toast.error(t('error_invalid_email', 'Invalid email'));
            return;
        }

        if (form.new_password) {
            if (!form.current_password) {
                toast.error(t('error_enter_current_password', 'Enter current password'));
                return;
            }

            if (form.new_password.length < 6) {
                toast.error(t('error_password_too_short', 'Password too short'));
                return;
            }

            if (form.new_password !== form.confirm_password) {
                toast.error(t('error_passwords_dont_match', 'Passwords don\'t match'));
                return;
            }
        }

        try {
            setSaving(true);

            const updateData: any = {
                username: form.username,
                full_name: form.full_name,
                email: form.email,
                phone_number: form.phone_number,
                birth_date: form.birth_date,
                instagram_link: form.instagram_link,
                whatsapp: form.whatsapp,
                telegram: form.telegram,
                position: form.position,
                years_of_experience: form.years_of_experience,
                specialization: form.specialization,
                about_me: form.about_me,
            };

            if (form.new_password) {
                updateData.current_password = form.current_password;
                updateData.new_password = form.new_password;
            }

            await api.updateUserProfile(employee.id, updateData);
            toast.success(t('profile_updated', 'Profile updated'));
            setForm({
                ...form,
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
            onUpdate();
        } catch (err: any) {
            toast.error(err.message || t('error_update_profile', 'Error updating profile'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            {(() => {
                                const fullPhotoUrl = getPhotoUrl(employee.photo || employee.photo_url);

                                return fullPhotoUrl ? (
                                    <img
                                        src={fullPhotoUrl}
                                        alt={employee.full_name}
                                        className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                                        <User className="w-16 h-16 text-white" />
                                    </div>
                                );
                            })()}

                            <label
                                htmlFor="photo-upload"
                                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                {uploadingPhoto ? (
                                    <Loader className="w-8 h-8 animate-spin text-white" />
                                ) : (
                                    <div className="text-center text-white">
                                        <Camera className="w-8 h-8 mx-auto mb-1" />
                                        <p className="text-xs font-medium mt-1">{t('change_photo', 'Change photo')}</p>
                                    </div>
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
                        <p className="text-xs text-gray-500 mt-3 text-center max-w-[160px]">
                            {t('max_size', 'Max 5MB')}
                        </p>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            {employee.full_name || employee.username}
                        </h2>
                        <p className="text-gray-600 mb-4">@{employee.username}</p>
                        {employee.email && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{employee.email}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Personal Information Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{t('personal_information', 'Personal Information')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="username" className="text-sm font-medium text-gray-700 mb-2">
                            {t('username', 'Username')}
                        </Label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="username"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="pl-14 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="full_name" className="text-sm font-medium text-gray-700 mb-2">
                            {t('full_name', 'Full Name')}
                        </Label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="full_name"
                                value={form.full_name}
                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                className="pl-14 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2">
                            {t('email', 'Email')}
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="pl-14 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Information Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{t('contact_information', 'Contact Information')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="phone_number" className="text-sm font-medium text-gray-700 mb-2">
                            {t('phone_number', 'Phone Number')}
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="phone_number"
                                type="tel"
                                value={form.phone_number}
                                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                                className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                placeholder="+971 50 123 4567"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="birth_date" className="text-sm font-medium text-gray-700 mb-2">
                            {t('birth_date', 'Birth Date')}
                        </Label>
                        <Input
                            id="birth_date"
                            type="date"
                            value={form.birth_date}
                            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                            className="h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                            {t('social_links', 'Social Links')}
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="instagram_link"
                                    value={form.instagram_link}
                                    onChange={(e) => setForm({ ...form, instagram_link: e.target.value })}
                                    className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    placeholder="@username"
                                />
                            </div>

                            <div className="relative">
                                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="whatsapp"
                                    value={form.whatsapp}
                                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                                    className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    placeholder="+971501234567"
                                />
                            </div>

                            <div className="relative">
                                <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="telegram"
                                    value={form.telegram}
                                    onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                                    className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    placeholder="@username"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Professional Information Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{t('professional_information', 'Professional Information')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="position" className="text-sm font-medium text-gray-700 mb-2">
                            {t('position', 'Position')}
                        </Label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="position"
                                value={form.position}
                                onChange={(e) => setForm({ ...form, position: e.target.value })}
                                className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="years_of_experience" className="text-sm font-medium text-gray-700 mb-2">
                            {t('years_of_experience', 'Years of Experience')}
                        </Label>
                        <div className="relative">
                            <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="years_of_experience"
                                type="number"
                                min="0"
                                value={form.years_of_experience}
                                onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })}
                                className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Label htmlFor="specialization" className="text-sm font-medium text-gray-700 mb-2">
                            {t('specialization', 'Specialization')}
                        </Label>
                        <div className="relative">
                            <Star className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                            <Input
                                id="specialization"
                                value={form.specialization}
                                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                                className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                placeholder={t('specialization_placeholder', 'e.g., Nail Art, Massage Therapy')}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Label htmlFor="about_me" className="text-sm font-medium text-gray-700 mb-2">
                            {t('about_me', 'About Me')}
                        </Label>
                        <div className="relative">
                            <textarea
                                id="about_me"
                                value={form.about_me}
                                onChange={(e) => setForm({ ...form, about_me: e.target.value })}
                                className="w-full min-h-[120px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-colors resize-none"
                                placeholder={t('about_me_placeholder', 'Tell us about yourself...')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">{t('change_password', 'Change Password')}</h3>
                        <p className="text-sm text-gray-500">{t('leave_empty_if_no_change', 'Leave empty if you don\'t want to change')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="current_password" className="text-sm font-medium text-gray-700 mb-2">
                            {t('current_password', 'Current Password')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="current_password"
                                type="password"
                                value={form.current_password}
                                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                                className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="new_password" className="text-sm font-medium text-gray-700 mb-2">
                            {t('new_password', 'New Password')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="new_password"
                                type="password"
                                value={form.new_password}
                                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                                className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="confirm_password" className="text-sm font-medium text-gray-700 mb-2">
                            {t('confirm_password', 'Confirm Password')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                id="confirm_password"
                                type="password"
                                value={form.confirm_password}
                                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                                className="pl-16 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
                >
                    {saving ? (
                        <>
                            <Loader className="w-5 h-5 mr-2 animate-spin" />
                            {t('saving', 'Saving...')}
                        </>
                    ) : (
                        t('save_profile', 'Save Profile')
                    )}
                </Button>
            </div>
        </div>
    );
}
