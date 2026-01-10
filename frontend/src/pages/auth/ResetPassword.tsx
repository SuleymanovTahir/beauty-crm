// /frontend/src/pages/auth/ResetPassword.tsx
import React, { useState, useEffect } from "react";
import { Lock, Loader, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth/reset_password');
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      toast.error(t('token_not_found', "Токен сброса пароля не найден"));
      setTimeout(() => {
        navigate("/forgot-password");
      }, 2000);
    }
  }, [token, navigate, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError(t('fill_all_fields', "Заполните все поля"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('password_too_short', "Пароль должен содержать минимум 6 символов"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwords_mismatch', "Пароли не совпадают"));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.resetPassword(token, newPassword);

      if (response.success) {
        setSuccess(true);
        toast.success(t('password_changed_success', "Пароль успешно изменен!"));

        // Перенаправляем на логин через 2 секунды
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(response.error || t('reset_error', "Ошибка при сбросе пароля"));
        toast.error(response.error || t('reset_error', "Ошибка при сбросе пароля"));
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : t('reset_error', "Ошибка при сбросе пароля");
      setError(message);
      toast.error(message);
      console.error("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-100 to-pink-50 flex items-center justify-center p-4">
        {/* Переключатель языка */}
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl text-gray-900 mb-2">{t('password_changed', "Пароль изменен!")}</h1>
            <p className="text-gray-600">{t('redirecting_login', "Перенаправление на страницу входа...")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-100 to-pink-50 flex items-center justify-center p-4">
      {/* Переключатель языка */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">{t('new_password_title', "Новый пароль")}</h1>
          <p className="text-gray-600">{t('enter_new_password', "Введите ваш новый пароль")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="newPassword">{t('new_password_label', "Новый пароль")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="newPassword"
                  type="password"
                  required
                  disabled={loading}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('min_chars', "Минимум 6 символов")}
                  className="pl-10 pr-3"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">{t('confirm_password_label', "Подтвердите пароль")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  disabled={loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('repeat_password', "Повторите пароль")}
                  className="pl-10 pr-3"
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  {t('saving', "Сохранение...")}
                </>
              ) : (
                t('save_new_password', "Сохранить новый пароль")
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              className="text-pink-600"
              onClick={() => navigate("/login")}
              disabled={loading}
            >
              {t('back_to_login', "Вернуться к входу")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
