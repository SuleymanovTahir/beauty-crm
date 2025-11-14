import React, { useState, useEffect } from "react";
import { ShieldCheck, Loader, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";

interface VerifyEmailProps {
  onLogin?: (user: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
    token: string;
  }) => void;
}

export default function VerifyEmail({ onLogin }: VerifyEmailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Проверяем есть ли токен в URL
  const tokenFromUrl = searchParams.get("token");
  const email = (location.state as any)?.email || "";

  console.log("VerifyEmail mounted");
  console.log("Token from URL:", tokenFromUrl);
  console.log("Email from state:", email);

  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  // Автоматическая верификация по токену из URL
  useEffect(() => {
    const verifyByToken = async () => {
      if (!tokenFromUrl) return;

      console.log("Verifying by token:", tokenFromUrl);
      setLoading(true);

      try {
        const response = await fetch(`http://localhost:8000/api/verify-email-token?token=${tokenFromUrl}`, {
          credentials: 'include'
        });

        const data = await response.json();

        if (data.success && data.token && data.user) {
          console.log("Token verification successful, logging in");
          setVerified(true);
          toast.success("Email подтвержден! Выполняется вход в систему...");

          // Сохраняем данные в localStorage
          localStorage.setItem("session_token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          // Вызываем onLogin если передан
          if (onLogin) {
            onLogin({
              ...data.user,
              token: data.token
            });
          }

          // Перенаправляем в зависимости от роли
          setTimeout(() => {
            const role = data.user.role;
            if (role === 'director' || role === 'admin') {
              navigate("/admin/dashboard");
            } else if (role === 'manager') {
              navigate("/manager/dashboard");
            } else if (role === 'employee') {
              navigate("/employee/dashboard");
            } else {
              navigate("/");
            }
          }, 2000);
        } else {
          setError(data.error || "Ошибка при подтверждении email");
          toast.error(data.error || "Ошибка при подтверждении email");
          setLoading(false);
        }
      } catch (err) {
        console.error("Token verification error:", err);
        setError("Ошибка при подтверждении email");
        toast.error("Ошибка при подтверждении email");
        setLoading(false);
      }
    };

    verifyByToken();
  }, [tokenFromUrl, navigate, onLogin]);

  // Проверка email из state (для старой системы с кодами)
  useEffect(() => {
    if (tokenFromUrl) return; // Если есть токен, не проверяем email

    console.log("VerifyEmail useEffect running, email:", email);
    if (!email || email.trim() === "") {
      console.log("No email found, redirecting to login");
      toast.error("Email не найден. Пожалуйста, войдите снова.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    }
  }, [email, tokenFromUrl, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Код должен содержать 6 цифр");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.verifyEmail(email, verificationCode);

      if (response.success) {
        setVerified(true);
        toast.success("Email подтвержден!");

        // Перенаправляем на логин через 2 секунды
        setTimeout(() => {
          navigate("/login", { state: { message: "Email подтвержден. Войдите в систему." } });
        }, 2000);
      } else {
        setError(response.error || "Ошибка верификации");
        toast.error(response.error || "Ошибка верификации");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка верификации";
      setError(message);
      toast.error(message);
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.resendVerification(email);

      if (response.success) {
        toast.success("Новый код отправлен на вашу почту");
      } else {
        toast.error(response.error || "Ошибка при отправке кода");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка при отправке кода";
      toast.error(message);
      console.error("Resend error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl text-gray-900 mb-2">Email подтвержден!</h1>
            <p className="text-gray-600">Перенаправление на страницу входа...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">Подтверждение Email</h1>
          <p className="text-gray-600">Введите код из письма, отправленного на:</p>
          <p className="text-gray-900 font-semibold mt-2">{email}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <Label htmlFor="code">Код подтверждения</Label>
              <Input
                id="code"
                required
                disabled={loading}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-sm text-gray-500 mt-2">
                Введите 6-значный код из письма
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
                  Проверка...
                </>
              ) : (
                "Подтвердить"
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              disabled={loading}
              className="text-sm"
            >
              ← Назад к входу
            </Button>
            <Button
              variant="ghost"
              onClick={handleResendCode}
              disabled={loading}
              className="text-sm"
            >
              Отправить код заново
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
