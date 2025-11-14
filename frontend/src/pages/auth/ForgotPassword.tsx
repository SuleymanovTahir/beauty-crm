import React, { useState } from "react";
import { Mail, ArrowLeft, Loader, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Введите ваш email");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.forgotPassword(email);

      if (response.success) {
        setSent(true);
        toast.success("Письмо с инструкциями отправлено на ваш email");
      } else {
        setError(response.error || "Ошибка при отправке письма");
        toast.error(response.error || "Ошибка при отправке письма");
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Ошибка при отправке письма";
      setError(message);
      toast.error(message);
      console.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
        {/* Переключатель языка */}
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl text-gray-900 mb-2">Письмо отправлено!</h1>
            <p className="text-gray-600">Проверьте вашу почту</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <p className="text-gray-700 mb-6">
              Мы отправили инструкции по восстановлению пароля на <strong>{email}</strong>.
              Пожалуйста, проверьте вашу почту и следуйте инструкциям.
            </p>

            <p className="text-sm text-gray-500 mb-6">
              Если письмо не пришло, проверьте папку "Спам" или попробуйте снова.
            </p>

            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                onClick={() => navigate("/login")}
              >
                Вернуться к входу
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Отправить еще раз
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
      {/* Переключатель языка */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">Забыли пароль?</h1>
          <p className="text-gray-600">Введите ваш email для восстановления</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Мы отправим вам ссылку для сброса пароля
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Отправка...
                </>
              ) : (
                "Отправить инструкции"
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/login")}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к входу
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
