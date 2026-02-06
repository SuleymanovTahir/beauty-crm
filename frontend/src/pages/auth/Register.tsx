// /frontend/src/pages/auth/Register.tsx
import React, { useState, useRef } from "react";
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
import HCaptcha from "@hcaptcha/react-hcaptcha";

// hCaptcha Site Key: задайте VITE_HCAPTCHA_SITE_KEY в .env. Без ключа — тестовый. Инструкция: docs/HCAPTCHA_KEYS.md
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001";

// Типы ошибок для каждого поля
interface FieldErrors {
  full_name?: string[];
  username?: string[];
  email?: string[];
  phone?: string[];
  password?: string[];
  confirmPassword?: string[];
  terms?: string[];
  general?: string[];
}

// Компонент для отображения ошибок под полем
function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {errors.map((error, index) => (
        <p key={index} className="text-xs text-red-600">{error}</p>
      ))}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth/register', 'common']);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    email: "",
    phone: "",
    role: "employee",
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<"register" | "verify" | "success">("register");
  const [salonSettings, setSalonSettings] = useState<any>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Load salon settings
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const salonRes = await api.getSalonSettings();
        setSalonSettings(salonRes);
      } catch (err) {
        console.error("Error loading register data:", err);
      }
    };
    loadData();
  }, []);

  // Валидация пароля (те же правила что и на публичной странице)
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push(t('common:auth_errors.password_too_short', 'Пароль слишком короткий (минимум 8 символов)'));
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t('common:auth_errors.password_no_upper', 'Нужна заглавная буква (A-Z)'));
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t('common:auth_errors.password_no_lower', 'Нужна строчная буква (a-z)'));
    }
    if (!/\d/.test(password)) {
      errors.push(t('common:auth_errors.password_no_digit', 'Нужна цифра (0-9)'));
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(t('common:auth_errors.password_no_special', 'Нужен спецсимвол (!@#$%)'));
    }
    return errors;
  };

  // Валидация телефона
  const validatePhone = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };

  // Обработка ошибок с сервера и распределение по полям
  const handleServerErrors = (errorMessage: string) => {
    const errors: FieldErrors = {};
    const errorCodes = errorMessage.split(',').map(e => e.trim());

    const fieldMapping: Record<string, keyof FieldErrors> = {
      'error_username_exists': 'username',
      'error_email_exists': 'email',
      'error_phone_exists': 'phone',
      'error_login_invalid_chars': 'username',
      'error_login_too_short': 'username',
      'error_name_too_short': 'full_name',
      'error_invalid_email': 'email',
    };

    const translatedErrors: string[] = [];

    errorCodes.forEach(code => {
      const field = fieldMapping[code];
      const translated = t(`common:auth_errors.${code}`, code);

      if (field) {
        if (!errors[field]) errors[field] = [];
        errors[field]!.push(translated);
      } else {
        // Если поле не определено, добавляем в общие ошибки
        translatedErrors.push(translated);
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
    }

    if (translatedErrors.length > 0) {
      const message = translatedErrors.join(', ');
      setError(message);
      toast.error(message);
    } else if (Object.keys(errors).length > 0) {
      // Показываем первую ошибку в toast
      const firstError = Object.values(errors).flat()[0];
      toast.error(firstError || t('error_registration'));
    }
  };

  // Полная валидация формы
  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};
    const requiredFieldError = t('common:field_required', 'Обязательное поле');

    // Имя
    if (!formData.full_name || !formData.full_name.trim()) {
      errors.full_name = [requiredFieldError];
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = [t('common:auth_errors.error_name_too_short', 'Имя слишком короткое (минимум 2 символа)')];
    }

    // Логин - только латинские буквы, цифры, точки, подчеркивания
    if (!formData.username || !formData.username.trim()) {
      errors.username = [requiredFieldError];
    } else if (!/^[a-zA-Z0-9._]+$/.test(formData.username)) {
      errors.username = [t('common:auth_errors.error_login_invalid_chars', 'Логин может содержать только латинские буквы (a-z), цифры, точки и подчёркивания')];
    } else if (formData.username.trim().length < 3) {
      errors.username = [t('common:auth_errors.error_login_too_short', 'Логин слишком короткий (минимум 3 символа)')];
    }

    // Email
    if (!formData.email || !formData.email.trim()) {
      errors.email = [requiredFieldError];
    } else if (!formData.email.includes('@')) {
      errors.email = [t('common:auth_errors.error_invalid_email', 'Неверный формат email')];
    }

    // Телефон
    if (!formData.phone || !formData.phone.trim()) {
      errors.phone = [requiredFieldError];
    } else if (!validatePhone(formData.phone)) {
      errors.phone = [t('common:auth_errors.error_invalid_phone', 'Неверный формат телефона')];
    }

    // Пароль
    if (!formData.password) {
      errors.password = [requiredFieldError];
    } else {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        errors.password = passwordErrors;
      }
    }

    // Подтверждение пароля
    if (!formData.confirmPassword) {
      errors.confirmPassword = [requiredFieldError];
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = [t('error_passwords_dont_match', 'Пароли не совпадают')];
    }

    // Согласие с условиями
    if (!privacyAccepted) {
      errors.terms = [t('error_accept_privacy', 'Необходимо принять условия')];
    }

    // Проверка капчи
    if (!captchaToken) {
      errors.general = [...(errors.general || []), t('error_captcha_required', 'Пожалуйста, пройдите проверку безопасности')];
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setError("");

    // Валидация на фронтенде
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
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
        privacyAccepted,
        newsletterSubscribed,
        captchaToken || undefined
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
        // Парсим ошибки с сервера и распределяем по полям
        handleServerErrors(response.error);
        // Сбрасываем капчу при ошибке
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      const errorMessage = err.error || (err instanceof Error ? err.message : 'error_registration');
      handleServerErrors(errorMessage);
      // Сбрасываем капчу при ошибке
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
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
        const messageKey = response.error;
        const translatedError = t(`common:auth_errors.${messageKey}`);
        const finalMessage = translatedError && translatedError !== `common:auth_errors.${messageKey}`
          ? translatedError
          : (typeof response.error === 'string' ? response.error : t('error_verification'));

        setError(finalMessage);
        toast.error(finalMessage);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const messageKey = err.error || (err instanceof Error ? err.message : 'error_verification');

      const translatedError = t(`common:auth_errors.${messageKey}`);
      const finalMessage = translatedError && translatedError !== `common:auth_errors.${messageKey}`
        ? translatedError
        : (typeof err.error === 'string' ? err.error : messageKey);

      setError(finalMessage);
      toast.error(finalMessage);
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
                <Label htmlFor="code" className="mb-2 block">{t('verification_code')}</Label>
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

          {/* Общие ошибки */}
          <FieldError errors={fieldErrors.general} />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full_name" className="mb-2 block">{t('full_name')} *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="full_name"
                  disabled={loading}
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder={t('full_name_placeholder')}
                  className={`pl-10 pr-3 ${fieldErrors.full_name ? 'border-red-500' : ''}`}
                />
              </div>
              <FieldError errors={fieldErrors.full_name} />
            </div>

            <div>
              <Label htmlFor="username" className="mb-2 block">{t('username')} *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  disabled={loading}
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder={t('username_placeholder')}
                  className={`pl-10 pr-3 ${fieldErrors.username ? 'border-red-500' : ''}`}
                />
              </div>
              <FieldError errors={fieldErrors.username} />
            </div>

            <div>
              <Label htmlFor="email" className="mb-2 block">{t('email')} *</Label>
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
                  placeholder={t('email_placeholder')}
                  className={`pl-10 pr-3 ${fieldErrors.email ? 'border-red-500' : ''}`}
                />
              </div>
              <FieldError errors={fieldErrors.email} />
              <p className="text-sm text-gray-500 mt-3">
                {t('email_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="phone" className="mb-2 block">{t('phone', 'Phone Number')} *</Label>
              <Input
                id="phone"
                type="tel"
                disabled={loading}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+971 50 123 4567"
                className={fieldErrors.phone ? 'border-red-500' : ''}
              />
              <FieldError errors={fieldErrors.phone} />
            </div>

            <div>
              <Label htmlFor="role" className="mb-2 block">{t('role_label')}</Label>
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
              <p className="text-sm text-gray-500 mt-3">
                {t('role_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block">{t('password')} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  disabled={loading}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={t('password_placeholder')}
                  className={`pl-10 pr-3 ${fieldErrors.password ? 'border-red-500' : ''}`}
                />
              </div>
              {!fieldErrors.password && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('password_hint_requirements', 'Минимум 8 символов: A-Z, a-z, 0-9 и спецсимвол (!@#$%)')}
                </p>
              )}
              <FieldError errors={fieldErrors.password} />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="mb-2 block">{t('confirm_password')} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  disabled={loading}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder={t('confirm_password_placeholder')}
                  className={`pl-10 pr-3 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                />
              </div>
              <FieldError errors={fieldErrors.confirmPassword} />
            </div>

            {/* Privacy and Newsletter Checkboxes */}
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div>
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
                <FieldError errors={fieldErrors.terms} />
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

            {/* hCaptcha */}
            <div className="flex justify-center">
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITE_KEY}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => {
                  setCaptchaToken(null);
                  toast.error(t('error_captcha_failed', 'Ошибка проверки. Попробуйте еще раз'));
                }}
              />
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
