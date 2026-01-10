// /frontend/src/pages/auth/Register.tsx
import React, { useState } from "react";
import { Lock, User, Mail, UserPlus, Loader, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import GoogleLoginButton from "../../components/GoogleLoginButton";

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth/register');
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    email: "",
    phone: "",
    role: "employee",
    position: "",
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"register" | "verify" | "success">("register");
  const [positions, setPositions] = useState<any[]>([]);
  const [salonSettings, setSalonSettings] = useState<any>(null);

  // Load positions and salon settings
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [posRes, salonRes] = await Promise.all([
          api.getPositions(),
          api.getSalonSettings()
        ]);
        if (posRes.positions) setPositions(posRes.positions);
        setSalonSettings(salonRes);
      } catch (err) {
        console.error("Error loading register data:", err);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.username || !formData.password || !formData.full_name || !formData.email || !formData.phone) {
      setError(t('error_fill_all_fields'));
      return;
    }

    if (formData.username.length < 3) {
      setError(t('error_username_too_short'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('error_password_too_short'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('error_passwords_dont_match'));
      return;
    }

    if (!formData.email.includes("@")) {
      setError(t('error_invalid_email'));
      return;
    }

    if (!privacyAccepted) {
      setError(t('error_accept_privacy'));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.registerEmployee(
        formData.username,
        formData.password,
        formData.full_name,
        formData.email,
        formData.phone,
        formData.role,
        formData.position,
        privacyAccepted
      );


      if (response.success) {
        // Если это первый директор - он автоматически подтвержден
        if (response.auto_verified && response.is_first_director) {
          toast.success(response.message, { duration: 5000 });
          setTimeout(() => {
            navigate("/login");
          }, 2000);
          return;
        }

        setStep("verify");
        // Если SMTP не настроен, код придет в ответе
        if (response.verification_code) {
          toast.success(response.message || `${t('your_code')} ${response.verification_code}`, { duration: 10000 });
          console.log("Verification code:", response.verification_code);
        } else {
          toast.success(t('code_sent_to_email'));
        }
      } else {
        setError(response.error || t('error_registration'));
        toast.error(response.error || t('error_registration'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_registration');
      setError(message);
      toast.error(message);
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setError(t('error_invalid_code'));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.verifyEmail(formData.email, verificationCode);

      if (response.success) {
        setStep("success");
        toast.success(t('email_verified'));
      } else {
        setError(response.error || t('error_verification'));
        toast.error(response.error || t('error_verification'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_verification');
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

      const response = await api.resendVerification(formData.email);

      if (response.success) {
        toast.success(t('new_code_sent'));
      } else {
        toast.error(response.error || t('error_resend'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_resend');
      toast.error(message);
      console.error("Resend error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Verification step
  if (step === "verify") {
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
            <h1 className="text-4xl text-gray-900 mb-2">{t('verification_title')}</h1>
            <p className="text-gray-600">{t('verification_subtitle')} {formData.email}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <Label htmlFor="code">{t('verification_code')}</Label>
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
                  {t('verification_code_hint')}
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
                    {t('verifying')}
                  </>
                ) : (
                  t('verify_button')
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("register")}
                disabled={loading}
                className="text-sm"
              >
                ← {t('back_button')}
              </Button>
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm"
              >
                {t('resend_code')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success step
  if (step === "success") {
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
              {t('success_message')}
            </p>

            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
              onClick={() => navigate("/login")}
            >
              {t('back_to_login')}
            </Button>
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
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg overflow-hidden p-0.5">
            {salonSettings?.logo_url ? (
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img
                  src={salonSettings.logo_url}
                  alt={salonSettings.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <UserPlus className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">
            {t('register_staff_title', 'Регистрация сотрудника')}
          </h1>
          <p className="text-gray-600">{t('register_staff_subtitle', 'Пожалуйста, заполните данные для доступа к CRM системе')}</p>

        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6 space-y-6">
            <GoogleLoginButton text="signup_with" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  {t('or_register_with_email', 'Или регистрация через email')}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full_name">{t('full_name')} *</Label>
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
                  placeholder={t('full_name_placeholder')}
                  className="pl-10 pr-3"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username">{t('username')} *</Label>
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
                  placeholder={t('username_placeholder')}
                  className="pl-10 pr-3"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">{t('email')} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  disabled={loading}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder={t('email_placeholder')}
                  className="pl-10 pr-3"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {t('email_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="phone">{t('phone', 'Phone Number')} *</Label>
              <Input
                id="phone"
                type="tel"
                required
                disabled={loading}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+971 50 123 4567"
              />
            </div>

            <div>
              <Label htmlFor="role">{t('role_label')}</Label>
              <select
                id="role"
                required
                disabled={loading}
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="employee">{t('role_employee')}</option>
                <option value="manager">{t('role_manager')}</option>
                <option value="admin">{t('role_admin')}</option>
                <option value="director">{t('role_director')}</option>
                <option value="sales">{t('role_sales')}</option>
                <option value="marketer">{t('role_marketer')}</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {t('role_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="position">{t('position_label')}</Label>
              <select
                id="position"
                required
                disabled={loading}
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">{t('position_placeholder')}</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.name}>
                    {pos.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {t('position_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="password">{t('password')} *</Label>
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
                  placeholder={t('password_placeholder')}
                  className="pl-10 pr-3"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">{t('confirm_password')} *</Label>
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
                  placeholder={t('confirm_password_placeholder')}
                  className="pl-10 pr-3"
                />
              </div>
            </div>

            {/* Privacy and Newsletter Checkboxes */}
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="privacy" className="text-sm text-gray-700 cursor-pointer">
                  {t('i_accept')}{' '}
                  <Link to="/privacy-policy" className="text-pink-600 hover:underline" target="_blank">
                    {t('privacy_policy')}
                  </Link>{' '}
                  {t('and')}{' '}
                  <Link to="/terms" className="text-pink-600 hover:underline" target="_blank">
                    {t('terms_of_service')}
                  </Link>
                  {' *'}
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="newsletter"
                  checked={newsletterSubscribed}
                  onCheckedChange={(checked) => setNewsletterSubscribed(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="newsletter" className="text-sm text-gray-700 cursor-pointer">
                  {t('subscribe_to_newsletter')}
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 flex items-center justify-center gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {t('registering')}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t('register_button')}
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-3">
          <Button variant="outline" onClick={() => navigate("/login")}>
            {t('already_have_account')}
          </Button>
        </div>
      </div>
    </div>
  );
}
