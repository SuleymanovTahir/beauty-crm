// /frontend/src/pages/auth/Register.tsx
import React, { useState, useRef } from "react";
import { Lock, User, Mail, UserPlus, Loader, CheckCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Checkbox } from "@crm/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@crm/services/api";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@crm/components/LanguageSwitcher";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {
  getUnauthenticatedCrmPathByGates,
  normalizePlatformGates,
} from "@crm/utils/platformRouting";

// hCaptcha Site Key: задайте VITE_HCAPTCHA_SITE_KEY в .env. Без ключа — тестовый. Инструкция: docs/HCAPTCHA_KEYS.md
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? "10000000-ffff-ffff-ffff-000000000001";

// Типы ошибок для каждого поля
interface FieldErrors {
  full_name?: string[];
  username?: string[];
  email?: string[];
  phone?: string[];
  company_name?: string[];
  company_code?: string[];
  business_type?: string[];
  password?: string[];
  confirmPassword?: string[];
  terms?: string[];
  general?: string[];
}

// Компонент для отображения ошибок под полем
function FieldError({ errors }: { errors?: string[] }) {
  if (!(errors && errors.length > 0)) return null;
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
  const allowedBusinessTypes = ['beauty', 'restaurant', 'construction', 'factory', 'taxi', 'delivery', 'other'] as const;
  const [formData, setFormData] = useState({
    registration_mode: "create_company",
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    email: "",
    phone: "",
    role: "employee",
    company_name: "",
    company_code: "",
    business_type: "",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);
  const normalizedPlatformGates = React.useMemo(() => normalizePlatformGates(salonSettings), [salonSettings]);
  const crmLoginPath = React.useMemo(
    () => getUnauthenticatedCrmPathByGates(normalizedPlatformGates.site_enabled, normalizedPlatformGates.crm_enabled),
    [normalizedPlatformGates.site_enabled, normalizedPlatformGates.crm_enabled],
  );
  const isCompanyCreation = formData.registration_mode === "create_company";

  // Load salon settings
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const salonRes = await api.getSalonSettings();
        setSalonSettings(salonRes);
        const businessTypeFromSettings = typeof salonRes?.business_type === "string" ? salonRes.business_type : "";
        setFormData((prev) => ({
          ...prev,
          business_type: allowedBusinessTypes.includes(businessTypeFromSettings as typeof allowedBusinessTypes[number])
            ? businessTypeFromSettings
            : prev.business_type,
        }));
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
      'error_company_name_required': 'company_name',
      'error_company_code_required': 'company_code',
      'error_company_not_found': 'company_code',
      'error_company_inactive': 'company_code',
      'error_company_staff_limit_reached': 'company_code',
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
      const firstErrorMessage = firstError ?? t('error_registration');
      toast.error(firstErrorMessage);
    }
  };

  // Полная валидация формы
  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};
    const requiredFieldError = t('common:field_required', 'Обязательное поле');

    // Имя
    if (!(formData.full_name && formData.full_name.trim())) {
      errors.full_name = [requiredFieldError];
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = [t('common:auth_errors.error_name_too_short', 'Имя слишком короткое (минимум 2 символа)')];
    }

    // Логин - только латинские буквы, цифры, точки, подчеркивания
    if (!(formData.username && formData.username.trim())) {
      errors.username = [requiredFieldError];
    } else if (!/^[a-zA-Z0-9._]+$/.test(formData.username)) {
      errors.username = [t('common:auth_errors.error_login_invalid_chars', 'Логин может содержать только латинские буквы (a-z), цифры, точки и подчёркивания')];
    } else if (formData.username.trim().length < 3) {
      errors.username = [t('common:auth_errors.error_login_too_short', 'Логин слишком короткий (минимум 3 символа)')];
    }

    // Email
    if (!(formData.email && formData.email.trim())) {
      errors.email = [requiredFieldError];
    } else if (!formData.email.includes('@')) {
      errors.email = [t('common:auth_errors.error_invalid_email', 'Неверный формат email')];
    }

    // Телефон
    if (!(formData.phone && formData.phone.trim())) {
      errors.phone = [requiredFieldError];
    } else if (!validatePhone(formData.phone)) {
      errors.phone = [t('common:auth_errors.error_invalid_phone', 'Неверный формат телефона')];
    }

    if (isCompanyCreation) {
      if (!(formData.company_name && formData.company_name.trim())) {
        errors.company_name = [requiredFieldError];
      }
      if (!(formData.business_type && formData.business_type.trim())) {
        errors.business_type = [requiredFieldError];
      }
    } else if (!(formData.company_code && formData.company_code.trim())) {
      errors.company_code = [requiredFieldError];
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
      const currentGeneralErrors = errors.general ?? [];
      errors.general = [...currentGeneralErrors, t('error_captcha_required', 'Пожалуйста, пройдите проверку безопасности')];
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
        isCompanyCreation ? "director" : formData.role,
        privacyAccepted,
        newsletterSubscribed,
        captchaToken ?? undefined,
        isCompanyCreation ? formData.business_type : "",
        isCompanyCreation ? formData.company_name : "",
        isCompanyCreation ? "" : formData.company_code,
        isCompanyCreation ? "create_company" : "join_company",
      );


      if (response.success) {
        if (isCompanyCreation && response.company_code) {
          toast.success(
            t('company_created_with_code', {
              defaultValue: 'Компания создана. Код компании: {{code}}',
              code: response.company_code,
            }),
            { duration: 9000 },
          );
        }

        setStep("verify");
        // Если SMTP не настроен, код придет в ответе
        if (response.verification_code) {
          const successMessage = response.message ?? `${t('your_code')} ${response.verification_code}`;
          toast.success(successMessage, { duration: 10000 });
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
      const errorMessage = err?.error ?? (err instanceof Error ? err.message : 'error_registration');
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

    if (!(verificationCode && verificationCode.length === 6)) {
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
      const messageKey = err?.error ?? (err instanceof Error ? err.message : 'error_verification');

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
        toast.error(response.error ?? t('error_resend'));
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
              onClick={() => navigate(crmLoginPath)}
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
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">
            {isCompanyCreation
              ? t('create_company_title', { defaultValue: 'Создать компанию' })
              : t('join_company_title', { defaultValue: 'Присоединиться к компании' })}
          </h1>
          <p className="text-gray-600">
            {isCompanyCreation
              ? t('create_company_subtitle', { defaultValue: 'Создайте новую компанию и получите код для сотрудников.' })
              : t('join_company_subtitle', { defaultValue: 'Введите код компании и создайте учётную запись сотрудника.' })}
          </p>

        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, registration_mode: "create_company", role: "director", company_code: "" }))}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${isCompanyCreation ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              {t('mode_create_company', { defaultValue: 'Новая компания' })}
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, registration_mode: "join_company", role: prev.role === "director" ? "employee" : prev.role, company_name: "", business_type: prev.business_type }))}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${!isCompanyCreation ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              {t('mode_join_company', { defaultValue: 'Войти по коду компании' })}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isCompanyCreation ? (
              <div>
                <Label htmlFor="company_name" className="mb-2 block">{t('company_name_label', { defaultValue: 'Название компании' })} *</Label>
                <Input
                  id="company_name"
                  disabled={loading}
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder={t('company_name_placeholder', { defaultValue: 'Например, Nova Clinic' })}
                  className={fieldErrors.company_name ? 'border-red-500' : ''}
                />
                <FieldError errors={fieldErrors.company_name} />
              </div>
            ) : (
              <div>
                <Label htmlFor="company_code" className="mb-2 block">{t('company_code_label', { defaultValue: 'Код компании' })} *</Label>
                <Input
                  id="company_code"
                  disabled={loading}
                  value={formData.company_code}
                  onChange={(e) =>
                    setFormData({ ...formData, company_code: e.target.value.toUpperCase() })
                  }
                  placeholder={t('company_code_placeholder', { defaultValue: 'Например, NOVACRM' })}
                  className={fieldErrors.company_code ? 'border-red-500' : ''}
                />
                <FieldError errors={fieldErrors.company_code} />
              </div>
            )}

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

            {isCompanyCreation ? (
              <>
                <div>
                  <Label htmlFor="role" className="mb-2 block">{t('role_label')}</Label>
                  <Input
                    id="role"
                    disabled
                    value={t('role_director')}
                  />
                  <p className="text-sm text-gray-500 mt-3">
                    {t('company_owner_hint', { defaultValue: 'Создатель компании получает роль директора и доступ к управлению сотрудниками.' })}
                  </p>
                </div>

                <div>
                  <Label htmlFor="business_type" className="mb-2 block">{t('business_type_label')} *</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                    disabled={loading}
                  >
                    <SelectTrigger id="business_type" className={`w-full ${fieldErrors.business_type ? 'border-red-500' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beauty">{t('business_type_beauty')}</SelectItem>
                      <SelectItem value="restaurant">{t('business_type_restaurant')}</SelectItem>
                      <SelectItem value="construction">{t('business_type_construction')}</SelectItem>
                      <SelectItem value="factory">{t('business_type_factory')}</SelectItem>
                      <SelectItem value="taxi">{t('business_type_taxi')}</SelectItem>
                      <SelectItem value="delivery">{t('business_type_delivery')}</SelectItem>
                      <SelectItem value="other">{t('business_type_other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={fieldErrors.business_type} />
                  <p className="text-sm text-gray-500 mt-3">
                    {t('business_type_hint')}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="role" className="mb-2 block">{t('role_label')}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t('role_employee')}</SelectItem>
                    <SelectItem value="manager">{t('role_manager')}</SelectItem>
                    <SelectItem value="admin">{t('role_admin')}</SelectItem>
                    <SelectItem value="sales">{t('role_saler')}</SelectItem>
                    <SelectItem value="marketer">{t('role_marketer')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-3">
                  {t('join_company_role_hint', { defaultValue: 'Роль сотрудника внутри существующей компании.' })}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="password" className="mb-2 block">{t('password')} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  disabled={loading}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={t('password_placeholder')}
                  className={`pl-10 pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
                  type={showConfirmPassword ? "text" : "password"}
                  disabled={loading}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder={t('confirm_password_placeholder')}
                  className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
            <div className="space-y-2">
              <FieldError errors={fieldErrors.general} />
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
          <Button variant="outline" onClick={() => navigate(crmLoginPath)}>
            {t('already_have_account')}
          </Button>
        </div>
      </div>
    </div>
  );
}
