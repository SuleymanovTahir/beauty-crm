import React, { useState } from "react";
import { Lock, User, Mail, UserPlus, Loader, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.username || !formData.password || !formData.full_name) {
      setError("Заполните все обязательные поля");
      return;
    }

    if (formData.username.length < 3) {
      setError("Логин должен быть минимум 3 символа");
      return;
    }

    if (formData.password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.register(
        formData.username,
        formData.password,
        formData.full_name,
        formData.email || undefined
      );

      if (response.success) {
        setSuccess(true);
        toast.success("Регистрация успешна! Ожидайте подтверждения администратора.");
      } else {
        setError(response.error || "Ошибка регистрации");
        toast.error(response.error || "Ошибка регистрации");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка регистрации";
      setError(message);
      toast.error(message);
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl text-gray-900 mb-2">Регистрация отправлена!</h1>
            <p className="text-gray-600">Ваша заявка ожидает подтверждения администратора</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <p className="text-gray-700 mb-6">
              Мы получили вашу заявку на регистрацию. Администратор проверит её и активирует ваш аккаунт.
              Вы получите уведомление, когда сможете войти в систему.
            </p>

            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              onClick={() => navigate("/login")}
            >
              Вернуться к входу
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">Регистрация</h1>
          <p className="text-gray-600">Создайте аккаунт в CRM системе</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full_name">Полное имя *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="full_name"
                  required
                  disabled={loading}
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Введите ваше имя"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username">Логин *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  required
                  disabled={loading}
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Придумайте логин"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email (необязательно)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  disabled={loading}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Ваш email"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Пароль *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  disabled={loading}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Минимум 6 символов"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Подтверждение пароля *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  disabled={loading}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder="Повторите пароль"
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 flex items-center justify-center gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Регистрация...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Зарегистрироваться
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-3">
          <Button variant="outline" onClick={() => navigate("/login")}>
            Уже есть аккаунт? Войти
          </Button>
        </div>
      </div>
    </div>
  );
}
