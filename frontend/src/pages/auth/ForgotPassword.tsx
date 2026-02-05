// /frontend/src/pages/auth/ForgotPassword.tsx
import React, { useState } from "react";
import { Mail, ArrowLeft, Loader, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth/forgotpassword');
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(t('error_enter_email'));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.forgotPassword(email);

      if (response.success) {
        setSent(true);
        toast.success(t('email_sent'));
      } else {
        setError(response.error || t('error_sending'));
        toast.error(response.error || t('error_sending'));
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : t('error_sending');
      setError(message);
      toast.error(message);
      console.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
            <h1 className="text-4xl text-gray-900 mb-2">{t('success_title')}</h1>
            <p className="text-gray-600">{t('success_subtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <p className="text-gray-700 mb-6">
              {t('success_message_part1')} <strong>{email}</strong>.
              {t('success_message_part2')}
            </p>

            <p className="text-sm text-gray-500 mb-6">
              {t('success_hint')}
            </p>

            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
                onClick={() => navigate("/login")}
              >
                {t('back_to_login')}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                {t('resend_button')}
              </Button>
            </div>
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
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="mb-2 block">{t('email_label')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="pl-10 pr-3"
                />
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {t('email_hint')}
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
                  {t('sending')}
                </>
              ) : (
                t('send_button')
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
              {t('back_to_login')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
