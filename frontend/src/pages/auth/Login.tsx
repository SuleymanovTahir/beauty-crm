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

interface LoginProps {
  onLogin: (user: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
    token: string;
  }) => void;
}

export default function Login({ onLogin }: LoginProps) {
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
        localStorage.setItem("session_token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        onLogin({
          ...response.user,
          token: response.token,
        });

        toast.success(
          `${t('login:welcome')} ${
            response.user.full_name || response.user.username
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
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">{t('login:login_title')}</h1>
          <p className="text-gray-600">{t('login:crm_system_management')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username">{t('login:username')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  required
                  disabled={loading}
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials({ ...credentials, username: e.target.value })
                  }
                  placeholder={t('login:enter_login')}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">{t('login:password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                loading || !credentials.username || !credentials.password
              }
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 flex items-center justify-center gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {t('login:loading')}
                </>
              ) : (
                t('login:login')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Button
              variant="link"
              className="text-pink-600"
              onClick={() => navigate("/forgot-password")}
            >
              {t('login:forgot_password')}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/register")}
          >
            Нет аккаунта? Зарегистрироваться
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            {t('login:return_to_home')}
          </Button>
        </div>
      </div>
    </div>
  );
}