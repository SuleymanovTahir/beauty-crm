import React, { useState } from "react";
import { Lock, User, Loader } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.username || !credentials.password) {
      setError("Заполните оба поля");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Вызываем реальный API
      const response = await api.login(
        credentials.username,
        credentials.password
      );

      if (response.success && response.token) {
        // Сохраняем токен в localStorage
        localStorage.setItem("session_token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Вызываем callback
        onLogin({
          ...response.user,
          token: response.token,
        });

        toast.success(
          `Добро пожаловать, ${
            response.user.full_name || response.user.username
          }!`
        );
        navigate("/admin/dashboard");
      } else {
        setError("Ошибка авторизации");
        toast.error("Ошибка авторизации");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка входа";

      // Проверяем если это ошибка валидации
      if (message.includes("Unauthorized") || message.includes("401")) {
        setError("Неверное имя пользователя или пароль");
      } else {
        setError(message);
      }

      toast.error(message);
      console.error("Login error:", err);
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
          <h1 className="text-4xl text-gray-900 mb-2">💎 M.Le Diamant</h1>
          <p className="text-gray-600">CRM система управления</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
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
                  placeholder="admin"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                По умолчанию: <code className="bg-gray-100 px-2">admin</code>
              </p>
            </div>

            <div>
              <Label htmlFor="password">Пароль</Label>
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
                  placeholder="••••••"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                По умолчанию: <code className="bg-gray-100 px-2">admin123</code>
              </p>
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
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              className="text-pink-600"
              onClick={() => navigate("/forgot-password")}
            >
              Забыли пароль?
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            Вернуться на главную
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-xs text-blue-800">
          <strong>💡 Тестовые учетные данные:</strong>
          <br />
          Username: <code className="bg-blue-100 px-1">admin</code>
          <br />
          Password: <code className="bg-blue-100 px-1">admin123</code>
        </div>
      </div>
    </div>
  );
}
