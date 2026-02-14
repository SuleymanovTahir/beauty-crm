// /frontend/src/pages/auth/VerifyEmail.tsx
import React, { useState, useEffect } from "react";
import { ShieldCheck, Loader, CheckCircle } from "lucide-react";
import { Button } from "@site/components/ui/button";
import { Input } from "@site/components/ui/input";
import { Label } from "@site/components/ui/label";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@site/services/api";
import { useAuth } from "@site/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@site/components/LanguageSwitcher";
import {
  DEFAULT_PLATFORM_GATES,
  getRoleHomePathByGates,
  getUnauthenticatedSitePathByGates,
  normalizePlatformGates,
} from "@site/utils/platformRouting";

export default function VerifyEmail() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth/verify_email');

  // Проверяем есть ли токен в URL
  const tokenFromUrl = searchParams.get("token");
  const email = (location.state as any)?.email || "";

  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [platformGates, setPlatformGates] = useState(DEFAULT_PLATFORM_GATES);

  useEffect(() => {
    const loadPlatformGates = async () => {
      try {
        const gateResponse = await api.getPlatformGates();
        setPlatformGates(normalizePlatformGates(gateResponse));
      } catch (gateError) {
        console.error("Platform gate loading error:", gateError);
        setPlatformGates(DEFAULT_PLATFORM_GATES);
      }
    };
    loadPlatformGates();
  }, []);

  // Автоматическая верификация по токену из URL
  useEffect(() => {
    const verifyByToken = async () => {
      if (!tokenFromUrl) return;

      console.log("Verifying by token:", tokenFromUrl);
      setLoading(true);

      try {
        const data = await api.verifyEmailToken(tokenFromUrl);

        if (data.success && data.user) {
          console.log("Token verification successful, logging in");
          setVerified(true);
          toast.success(t('email_verified_login', "Email подтвержден! Выполняется вход в систему..."));

          // Используем login из контекста
          login(data.user);

          // Перенаправляем в зависимости от роли + enabled suites
          setTimeout(() => {
            const targetPath = getRoleHomePathByGates(
              data.user.role,
              platformGates.site_enabled,
              platformGates.crm_enabled,
            );
            navigate(targetPath);
          }, 2000);
        } else {
          setError(data.error || t('verification_error', "Ошибка при подтверждении email"));
          toast.error(data.error || t('verification_error', "Ошибка при подтверждении email"));
          setLoading(false);
        }
      } catch (err) {
        console.error("Token verification error:", err);
        setError(t('verification_error', "Ошибка при подтверждении email"));
        toast.error(t('verification_error', "Ошибка при подтверждении email"));
        setLoading(false);
      }
    };

    verifyByToken();
  }, [tokenFromUrl, navigate, login, t, platformGates.site_enabled, platformGates.crm_enabled]);

  // Проверка email из state (для старой системы с кодами)
  useEffect(() => {
    if (tokenFromUrl) return; // Если есть токен, не проверяем email

    console.log("VerifyEmail useEffect running, email:", email);
    if (!email || email.trim() === "") {
      console.log("No email found, redirecting to login");
      toast.error(t('email_not_found', "Email не найден. Пожалуйста, войдите снова."));
      setTimeout(() => {
        navigate(getUnauthenticatedSitePathByGates(platformGates.site_enabled, platformGates.crm_enabled));
      }, 2000);
    }
  }, [email, tokenFromUrl, navigate, t, platformGates.site_enabled, platformGates.crm_enabled]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setError(t('code_length_error', "Код должен содержать 6 цифр"));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.verifyEmail(email, verificationCode);

      if (response.success) {
        setVerified(true);
        toast.success(t('email_verified', "Email подтвержден!"));

        // Перенаправляем на логин через 2 секунды
        setTimeout(() => {
          navigate(
            getUnauthenticatedSitePathByGates(platformGates.site_enabled, platformGates.crm_enabled),
            { state: { message: t('email_verified_login_message', "Email подтвержден. Войдите в систему.") } },
          );
        }, 2000);
      } else {
        setError(response.error || t('verification_error_short', "Ошибка верификации"));
        toast.error(response.error || t('verification_error_short', "Ошибка верификации"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('verification_error_short', "Ошибка верификации");
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
        toast.success(t('new_code_sent', "Новый код отправлен на вашу почту"));
      } else {
        toast.error(response.error || t('send_code_error', "Ошибка при отправке кода"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('send_code_error', "Ошибка при отправке кода");
      toast.error(message);
      console.error("Resend error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
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
            <h1 className="text-4xl text-gray-900 mb-2">{t('email_verified_title', "Email подтвержден!")}</h1>
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
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">{t('verify_email_title', "Подтверждение Email")}</h1>
          <p className="text-gray-600">{t('enter_code_from_email', "Введите код из письма, отправленного на:")}</p>
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
              <Label htmlFor="code" className="mb-2 block">{t('verification_code_label', "Код подтверждения")}</Label>
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
              <p className="text-sm text-gray-500 mt-3">
                {t('enter_6_digit_code', "Введите 6-значный код из письма")}
              </p>
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
                  {t('verifying', "Проверка...")}
                </>
              ) : (
                t('confirm_button', "Подтвердить")
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(getUnauthenticatedSitePathByGates(platformGates.site_enabled, platformGates.crm_enabled))}
              disabled={loading}
              className="text-sm"
            >
              ← {t('back_to_login', "Назад к входу")}
            </Button>
            <Button
              variant="ghost"
              onClick={handleResendCode}
              disabled={loading}
              className="text-sm"
            >
              {t('resend_code', "Отправить код заново")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
