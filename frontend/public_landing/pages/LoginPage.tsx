//new/pages/LoginPage.tsx
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Lock, Mail, AlertCircle, Eye, EyeOff,Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { useSalonSettings } from '../hooks/useSalonSettings';
import { DEFAULT_VALUES } from '../utils/constants';
import logo from '../styles/img/logo.png';
import PublicLanguageSwitcher from '../../src/components/PublicLanguageSwitcher';

interface LoginPageProps {
  initialView?: 'login' | 'register';
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
    setErrors([]); // Clear errors on mode switch
  }, [isRegisterRoute]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

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
      setErrors([t('auth/login:fill_both_fields', 'Пожалуйста, заполните оба поля')]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.login(formData.username, formData.password);

      if (response.success && response.token) {
        login(response.user, response.token);
        toast.success(`${t('auth/login:welcome', 'Добро пожаловать')} ${response.user.full_name || response.user.username}!`);

        // Redirect based on role
        if (response.user.role === 'client') {
          // Redirect clients to their account dashboard
          navigate("/account/dashboard");
        } else {
          // Redirect staff/admin to crm dashboard
          navigate("/crm/dashboard");
        }
      } else {
        if (response.error_type === "email_not_verified" && response.email) {
          toast.error(t('auth/verify:email_not_verified', 'Email not verified'));
          setTimeout(() => navigate("/verify-email", { state: { email: response.email } }), 1500);
          return;
        }
        setErrors([t('auth/login:authorization_error', 'Ошибка авторизации')]);
      }
    } catch (err: any) {
      // Clean error handling without detailed stack traces in the console
      const errorStr = String(err.error || err.message || (typeof err === 'string' ? err : ''));

      if (errorStr.includes('invalid_credentials') || errorStr.includes('user_not_found')) {
        setErrors([t('auth/login:invalid_credentials', 'Неверный логин или пароль')]);
        toast.error(t('auth/login:invalid_credentials', 'Неверный логин или пароль'));
        return;
      }

      if (errorStr.includes('account_not_activated') || errorStr.includes('not_approved')) {
        setErrors([t('auth/login:account_pending', 'Аккаунт ожидает подтверждения')]);
        return;
      }

      setErrors([errorStr]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Basic validation - collect all errors at once
    const validationErrors: string[] = [];

    if (!formData.username || !formData.password || !formData.full_name || !formData.email) {
      validationErrors.push(t('auth/register:error_fill_all_fields', 'All fields are required'));
    }
    if (formData.password !== formData.confirmPassword) {
      validationErrors.push(t('auth/register:error_passwords_dont_match', 'Passwords do not match'));
    }
    if (!formData.agreedToTerms) {
      validationErrors.push(t('auth/register:error_accept_privacy', 'You must accept the terms'));
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      // Используем упрощенную регистрацию клиента
      const response = await api.registerClient(
        formData.username,
        formData.password,
        formData.full_name,
        formData.email,
        formData.phone,
        formData.agreedToTerms
      );


      if (response.success) {
        toast.success(t('auth/register:code_sent_to_email', 'Verification code sent to email'));
        // Navigate to existing verification page
        setTimeout(() => navigate("/verify-email", { state: { email: formData.email } }), 1000);
      } else {
        setErrors([response.error || t('auth/register:error_registration', 'Registration failed')]);
      }
    } catch (err: any) {
      console.error("Register error:", err);
      const errorKey = String(err.error || err.message || (typeof err === 'string' ? err : ''));

      // Backend returns multiple errors separated by comma
      const errorKeys = errorKey.split(',').map(e => e.trim()).filter(Boolean);

      // Translate each error
      const translatedErrors = errorKeys.map(key =>
        t([
          `common:auth_errors.${key}`,
          `auth/register:${key}`,
          `auth/register:error_${key}`,
          key
        ], key)
      );

      setErrors(translatedErrors.length > 0 ? translatedErrors : [t('auth/register:error_registration', 'Ошибка регистрации')]);
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
              className={`flex-1 py-2 rounded-lg transition-colors ${isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
            >
              {t('auth/login:login', 'Войти')}
            </button>
            <button
              onClick={() => handleModeSwitch('register')}
              className={`flex-1 py-2 rounded-lg transition-colors ${!isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
            >
              {t('auth/register:register_button', 'Register')}
            </button>
          </div>

          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <ul className={errors.length > 1 ? "list-disc list-inside space-y-1" : ""}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('auth/register:full_name', 'Full Name')}</label>
                  <Input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder={t('auth/register:full_name_placeholder', 'Your Name')}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">{t('auth/login:username', 'Логин')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder={t('auth/login:enter_login', 'Введите логин')}
                  className="pl-10"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('auth/register:email', 'Email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('auth/register:email_placeholder', 'email@example.com')}
                    className="pl-10"
                  />
                </div>
              </div>
            
            )}

        {!isLogin && (
          <div>
            <label className="block text-sm font-medium mb-2">{t('auth/register:phone', 'Phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('auth/register:phone_placeholder', '+7 (999) 000-00-00')}
                className="pl-10"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">{t('auth/login:password', 'Пароль')}</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {!isLogin && (
            <p className="text-xs text-muted-foreground mt-1 ml-1">{t('auth/register:password_hint_requirements', 'Минимум 8 символов: A-Z, a-z, 0-9 и спецсимвол (!@#$%)')}</p>
          )}
        </div>

        {/* Confirm Password Field for Registration */}
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium mb-2">{t('auth/register:confirm_password', 'Подтвердите пароль')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {!isLogin && (
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
        )}

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


      </div >
    </div >
  );
}
