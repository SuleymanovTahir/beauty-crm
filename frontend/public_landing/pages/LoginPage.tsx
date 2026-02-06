//new/pages/LoginPage.tsx
import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Lock, Mail, AlertCircle, Eye, EyeOff, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { useSalonSettings } from '../hooks/useSalonSettings';
import { DEFAULT_VALUES } from '../utils/constants';
import logo from '../styles/img/logo.png';
import PublicLanguageSwitcher from '../../src/components/PublicLanguageSwitcher';
import { validatePhone } from '../utils/validation';
import HCaptcha from "@hcaptcha/react-hcaptcha";
import '../styles/css/index.css';

// hCaptcha Site Key: задайте VITE_HCAPTCHA_SITE_KEY в .env. Без ключа — тестовый. Инструкция: docs/HCAPTCHA_KEYS.md
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001";

interface LoginPageProps {
  initialView?: 'login' | 'register';
}

// Типы ошибок для каждого поля
interface FieldErrors {
  full_name?: string[];
  username?: string[];
  email?: string[];
  phone?: string[];
  password?: string[];
  confirmPassword?: string[];
  terms?: string[];
  general?: string[]; // для общих ошибок (логин, сервер и т.д.)
}

// Компонент для отображения ошибок под полем
function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {errors.map((error, index) => (
        <p key={index} className="text-xs text-destructive">{error}</p>
      ))}
    </div>
  );
}

export function LoginPage({ initialView = 'login' }: LoginPageProps) {
  const { t } = useTranslation(['public_landing', 'auth/login', 'auth/register', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Определяем режим на основе пропса или текущего URL, если компонент переиспользуется
  const isRegisterRoute = location.pathname === '/register';
  const [isLogin, setIsLogin] = useState(!isRegisterRoute);

  // Sync state with URL/prop changes
  useEffect(() => {
    setIsLogin(!isRegisterRoute);
    setFieldErrors({}); // Clear errors on mode switch
  }, [isRegisterRoute]);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { settings: salonSettings } = useSalonSettings();

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    agreedToTerms: false
  });

  // Captcha state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Валидация пароля на фронтенде
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

  // Полная валидация формы регистрации
  const validateRegisterForm = (): FieldErrors => {
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
    } else {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        errors.phone = [t('common:auth_errors.error_invalid_phone', 'Неверный формат телефона')];
      }
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
      errors.confirmPassword = [t('auth/register:error_passwords_dont_match', 'Пароли не совпадают')];
    }

    // Согласие с условиями
    if (!formData.agreedToTerms) {
      errors.terms = [t('auth/register:error_accept_privacy', 'Необходимо принять условия')];
    }

    // Проверка капчи
    if (!captchaToken) {
      errors.general = [...(errors.general || []), t('auth/register:error_captcha_required', 'Пожалуйста, пройдите проверку безопасности')];
    }

    return errors;
  };

  // Маппинг ошибок с бэкенда на поля
  const mapBackendErrorsToFields = (errorKeys: string[]): FieldErrors => {
    const errors: FieldErrors = {};

    errorKeys.forEach(key => {
      const translatedError = t([
        `common: auth_errors.${key} `,
        `auth / register:${key} `,
        `auth / register:error_${key} `,
        key
      ], key);

      // Маппим ошибки на соответствующие поля
      if (key.includes('login') || key.includes('username')) {
        errors.username = [...(errors.username || []), translatedError];
      } else if (key.includes('email')) {
        errors.email = [...(errors.email || []), translatedError];
      } else if (key.includes('phone')) {
        errors.phone = [...(errors.phone || []), translatedError];
      } else if (key.includes('name')) {
        errors.full_name = [...(errors.full_name || []), translatedError];
      } else if (key.includes('password')) {
        errors.password = [...(errors.password || []), translatedError];
      } else {
        errors.general = [...(errors.general || []), translatedError];
      }
    });

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (isLogin) {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const handleModeSwitch = (mode: 'login' | 'register') => {
    if (mode === 'login') {
      navigate('/login');
    } else {
      navigate('/register');
    }
  };

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      setFieldErrors({ general: [t('auth/login:fill_both_fields', 'Пожалуйста, заполните оба поля')] });
      return;
    }

    try {
      setLoading(true);
      const response = await api.login(formData.username, formData.password);

      if (response.success && response.token) {
        login(response.user, response.token);
        toast.success(`${t('auth/login:welcome', 'Добро пожаловать')} ${response.user.full_name || response.user.username} !`);

        // Redirect based on role
        if (response.user.role === 'client') {
          navigate("/account/dashboard");
        } else {
          navigate("/crm/dashboard");
        }
      } else {
        if (response.error_type === "email_not_verified" && response.email) {
          toast.error(t('auth/verify:email_not_verified', 'Email not verified'));
          setTimeout(() => navigate("/verify-email", { state: { email: response.email } }), 1500);
          return;
        }
        setFieldErrors({ general: [t('auth/login:authorization_error', 'Ошибка авторизации')] });
      }
    } catch (err: any) {
      const errorStr = String(err.error || err.message || (typeof err === 'string' ? err : ''));

      if (errorStr.includes('invalid_credentials') || errorStr.includes('user_not_found')) {
        setFieldErrors({ general: [t('auth/login:invalid_credentials', 'Неверный логин или пароль')] });
        return;
      }

      if (errorStr.includes('account_not_activated') || errorStr.includes('not_approved')) {
        setFieldErrors({ general: [t('auth/login:account_pending', 'Аккаунт ожидает подтверждения')] });
        return;
      }

      setFieldErrors({ general: [errorStr] });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Валидация на фронтенде
    const validationErrors = validateRegisterForm();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      const response = await api.registerClient(
        formData.username,
        formData.password,
        formData.full_name,
        formData.email,
        formData.phone,
        formData.agreedToTerms,
        captchaToken || undefined
      );

      if (response.success) {
        toast.success(t('auth/register:code_sent_to_email', 'Verification code sent to email'));
        setTimeout(() => navigate("/verify-email", { state: { email: formData.email } }), 1000);
      } else {
        setFieldErrors({ general: [response.error || t('auth/register:error_registration', 'Registration failed')] });
        // Сбрасываем капчу при ошибке
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    } catch (err: any) {
      console.error("Register error:", err);
      const errorKey = String(err.error || err.message || (typeof err === 'string' ? err : ''));

      // Backend returns multiple errors separated by comma
      const errorKeys = errorKey.split(',').map(e => e.trim()).filter(Boolean);

      // Маппим ошибки на соответствующие поля
      const mappedErrors = mapBackendErrorsToFields(errorKeys);

      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(mappedErrors);
      } else {
        setFieldErrors({ general: [t('auth/register:error_registration', 'Ошибка регистрации')] });
      }
      // Сбрасываем капчу при ошибке
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Language Switcher - top right */}
      <div className="absolute top-4 right-4">
        <PublicLanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={salonSettings?.logo_url || logo}
            alt={salonSettings?.name || DEFAULT_VALUES.DEFAULT_SALON_NAME_ALT}
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <p className="text-muted-foreground">
            {isLogin ? t('auth/login:login_title', 'Войдите в свой аккаунт') : t('auth/register:register_title', 'Создать новый аккаунт')}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors font-medium ${isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t('auth/login:login', 'Войти')}
            </button>
            <button
              onClick={() => handleModeSwitch('register')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors font-medium ${!isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t('auth/register:register_button', 'Зарегистрироваться')}
            </button>
          </div>

          {/* Общие ошибки (для логина или серверных ошибок) */}
          <FieldError errors={fieldErrors.general} />

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Полное имя */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('auth/register:full_name', 'Full Name')}</label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder={t('auth/register:full_name_placeholder', 'Your Name')}
                  className={fieldErrors.full_name ? 'border-destructive' : ''}
                />
                <FieldError errors={fieldErrors.full_name} />
              </div>
            )}

            {/* Логин */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('auth/login:username', 'Логин')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder={t('auth/login:enter_login', 'Введите логин')}
                  className={`pl-10 ${fieldErrors.username ? 'border-destructive' : ''} `}
                />
              </div>
              <FieldError errors={fieldErrors.username} />
            </div>

            {/* Email */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('auth/register:email', 'Email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('auth/register:email_placeholder', 'email@example.com')}
                    className={`pl-10 ${fieldErrors.email ? 'border-destructive' : ''} `}
                  />
                </div>
                <FieldError errors={fieldErrors.email} />
              </div>
            )}

            {/* Телефон */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('auth/register:phone', 'Phone')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t('auth/register:phone_placeholder', '+7 (999) 000-00-00')}
                    className={`pl-10 ${fieldErrors.phone ? 'border-destructive' : ''} `}
                  />
                </div>
                <FieldError errors={fieldErrors.phone} />
              </div>
            )}

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('auth/login:password', 'Пароль')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 ${fieldErrors.password ? 'border-destructive' : ''} `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && !fieldErrors.password && (
                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  {t('auth/register:password_hint_requirements', 'Минимум 8 символов: A-Z, a-z, 0-9 и спецсимвол (!@#$%)')}
                </p>
              )}
              <FieldError errors={fieldErrors.password} />
            </div>

            {/* Подтверждение пароля */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('auth/register:confirm_password', 'Подтвердите пароль')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-destructive' : ''} `}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError errors={fieldErrors.confirmPassword} />
              </div>
            )}

            {/* Согласие с условиями */}
            {!isLogin && (
              <div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.agreedToTerms}
                    onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground">
                    {t('auth/register:agree_with', 'I agree to the')}{' '}
                    <a href="/terms" className="text-primary hover:underline">
                      {t('auth/register:terms_of_use', 'Terms of Use')}
                    </a>{' '}
                    {t('common:and', 'and')}{' '}
                    <a href="/privacy-policy" className="text-primary hover:underline">
                      {t('auth/register:privacy_policy', 'Privacy Policy')}
                    </a>
                  </label>
                </div>
                <FieldError errors={fieldErrors.terms} />
              </div>
            )}

            {/* hCaptcha для регистрации */}
            {!isLogin && (
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => {
                    setCaptchaToken(null);
                    toast.error(t('auth/register:error_captcha_failed', 'Ошибка проверки. Попробуйте еще раз'));
                  }}
                />
              </div>
            )}

            {/* Забыли пароль */}
            {isLogin && (
              <div className="text-right">
                <a href="/forgot-password" className="text-sm text-primary hover:underline">
                  {t('auth/login:forgot_password', 'Забыли пароль?')}
                </a>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full hero-button-primary h-11">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isLogin ? t('auth/login:logging_in', 'Вход...') : t('auth/register:registering', 'Регистрация...')}</span>
                </div>
              ) : (
                isLogin ? t('auth/login:submit', 'Войти') : t('auth/register:submit', 'Зарегистрироваться')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary">
              ← {t('common:back_to_home', 'Back to home')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
