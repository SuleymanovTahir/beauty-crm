// /frontend/src/pages/auth/Login.tsx
// frontend/src/pages/auth/Login.tsx
// Замените весь файл на этот код:

import React, { useState } from "react";
import { Lock, User, Loader } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { api } from "../../services/api";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useAuth } from "../../contexts/AuthContext";
import GoogleLoginButton from "../../components/GoogleLoginButton";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['auth/Login', 'common']);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [salonSettings, setSalonSettings] = useState<any>(null);

  React.useEffect(() => {
    const fetchSalonSettings = async () => {
      try {
        const response = await api.getSalonSettings();
        setSalonSettings(response);
      } catch (err) {
        console.error("Error fetching salon settings:", err);
      }
    };
    fetchSalonSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.username || !credentials.password) {
      setError(t('login:fill_both_fields'));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.login(
        credentials.username,
        credentials.password
      );

      if (response.success && response.token) {
        login(response.user, response.token);

        toast.success(
          `${t('login:welcome')} ${response.user.full_name || response.user.username
          }!`
        );
        navigate("/crm/dashboard");
      } else {
        // Проверяем, не подтвержден ли email
        if (response.error_type === "email_not_verified" && response.email) {
          toast.error(t('login:email_not_verified_redirect', "Email не подтвержден. Перенаправление на страницу верификации..."));
          setTimeout(() => {
            navigate("/verify-email", { state: { email: response.email } });
          }, 1500);
          return;
        }

        setError(t('login:authorization_error'));
        toast.error(t('login:authorization_error'));
      }
    } catch (err: any) {
      console.log("Login error caught:", err);
      console.log("Error type:", err.error_type);
      console.log("Error email:", err.email);
      console.log("Error status:", err.status);

      // Проверяем, есть ли информация о неподтвержденном email в ошибке
      if (err.error_type === "email_not_verified" && err.email) {
        console.log("Email not verified, redirecting to verification page with email:", err.email);
        toast.error(t('login:email_not_verified_redirect', "Email не подтвержден. Перенаправление на страницу верификации..."));
        setTimeout(() => {
          console.log("Navigating to /verify-email with email:", err.email);
          navigate("/verify-email", { state: { email: err.email } });
        }, 1500);
        return;
      }

      // Проверяем, ожидает ли пользователь одобрения админа
      if (err.error_type === "not_approved") {
        console.log("User not approved yet");
        setError(t('login:account_pending', "Ваш аккаунт ожидает одобрения администратора"));
        toast.error(t('login:registration_pending_toast', "Ваша регистрация ожидает одобрения администратора. Вы получите email когда ваш аккаунт будет активирован."));
        return;
      }

      const messageKey = err.error || (err instanceof Error ? err.message : 'login_error');

      // Try to translate using auth_errors from common
      const translatedError = t(`common:auth_errors.${messageKey}`);
      const finalMessage = translatedError && translatedError !== `common:auth_errors.${messageKey}`
        ? translatedError
        : (typeof err.error === 'string' ? err.error : messageKey);

      setError(finalMessage);
      toast.error(finalMessage);
      console.error(t('login:login_error'), err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-100 to-pink-50 flex items-center justify-center p-4">
      {/* Переключатель языка */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Icon Circle or Logo - сверху над карточкой */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg overflow-hidden p-0.5">
            {salonSettings?.logo_url ? (
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img
                  src={salonSettings.logo_url}
                  alt={salonSettings.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <Lock className="w-10 h-10 text-white" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {salonSettings?.name || t('login:login_title')}
            </h1>
            <p className="text-sm text-gray-600">
              {salonSettings?.name ? t('login:management_system') : t('login:crm_system_management')}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <GoogleLoginButton text="signin_with" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  {t('login:or_email', 'Или через email')}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">{t('login:username')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  required
                  disabled={loading}
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials({ ...credentials, username: e.target.value })
                  }
                  placeholder={t('login:enter_login')}
                  className="pl-10 pr-3 h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t('login:password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  disabled={loading}
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  placeholder={t('login:enter_password')}
                  className="pl-10 pr-3 h-11"
                />
              </div>
            </div>

            {/* Forgot password - выровнен вправо */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-gray-600 hover:text-pink-600 font-medium transition-colors"
              >
                {t('login:forgot_password')}
              </button>
            </div>

            <Button
              type="submit"
              disabled={
                loading || !credentials.username || !credentials.password
              }
              className="w-full h-11 bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>{t('login:loading')}</span>
                </div>
              ) : (
                t('login:login')
              )}
            </Button>
          </form>

          {/* Divider с border-top */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium"
              onClick={() => navigate("/register")}
            >
              {t('login:no_account_register')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 font-medium text-gray-600 hover:text-gray-900"
              onClick={() => navigate("/")}
            >
              {t('login:return_to_home')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
