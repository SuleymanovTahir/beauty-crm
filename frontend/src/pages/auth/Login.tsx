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
        navigate("/admin/dashboard");
      } else {
        // Проверяем, не подтвержден ли email
        if (response.error_type === "email_not_verified" && response.email) {
          toast.error("Email не подтвержден. Перенаправление на страницу верификации...");
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
        toast.error("Email не подтвержден. Перенаправление на страницу верификации...");
        setTimeout(() => {
          console.log("Navigating to /verify-email with email:", err.email);
          navigate("/verify-email", { state: { email: err.email } });
        }, 1500);
        return;
      }

      const message = err instanceof Error ? err.message : t('login:login_error');

      if (message.includes(t('login:unauthorized')) || message.includes(t('login:401'))) {
        setError(t('login:invalid_username_or_password'));
      } else {
        setError(message);
      }

      toast.error(message);
      console.error(t('login:login_error'), err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
      {/* Переключатель языка */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Icon Circle - сверху над карточкой */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{t('login:login_title')}</h1>
            <p className="text-sm text-gray-600">{t('login:crm_system_management')}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

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
                  className="pl-10 h-11"
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
                  className="pl-10 h-11"
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
              className="w-full h-11 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium"
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
