//new/pages/LoginPage.tsx
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Lock, Mail, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import logo from '../styles/img/logo.png';

interface LoginPageProps {
  initialView?: 'login' | 'register';
}

export function LoginPage({ initialView = 'login' }: LoginPageProps) {
  const { t } = useTranslation(['public_landing', 'auth/Login', 'auth/register', 'common']);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLogin, setIsLogin] = useState(initialView === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);

  useEffect(() => {
    api.getSalonSettings().then(setSalonSettings).catch(console.error);
  }, []);

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
    setError("");

    if (isLogin) {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      setError(t('auth/Login:fill_both_fields', 'Please fill in both fields'));
      return;
    }

    try {
      setLoading(true);
      const response = await api.login(formData.username, formData.password);

      if (response.success && response.token) {
        login(response.user, response.token);
        toast.success(`${t('auth/Login:welcome', 'Welcome')} ${response.user.full_name || response.user.username}!`);

        // Redirect based on role
        if (response.user.role === 'client') {
          // Redirect clients to their account dashboard
          navigate("/account/dashboard");
        } else {
          // Redirect staff/admin to admin dashboard
          navigate("/admin/dashboard");
        }
      } else {
        if (response.error_type === "email_not_verified" && response.email) {
          toast.error(t('auth/verify:email_not_verified', 'Email not verified'));
          setTimeout(() => navigate("/verify-email", { state: { email: response.email } }), 1500);
          return;
        }
        setError(t('auth/Login:authorization_error', 'Authorization failed'));
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const message = err.message || t('auth/Login:login_error', 'Login error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Basic validation matches Register.tsx
    if (!formData.username || !formData.password || !formData.full_name || !formData.email) {
      setError(t('auth/register:error_fill_all_fields', 'All fields are required'));
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth/register:error_passwords_dont_match', 'Passwords do not match'));
      return;
    }
    if (!formData.agreedToTerms) {
      setError(t('auth/register:error_accept_privacy', 'You must accept the terms'));
      return;
    }

    try {
      setLoading(true);
      // Default to 'client' role for public registration unless specified otherwise
      const response = await api.register(
        formData.username,
        formData.password,
        formData.full_name,
        formData.email,
        formData.phone,
        'client', // role
        '', // position
        formData.agreedToTerms,
        true // subscribe to newsletter
      );

      if (response.success) {
        toast.success(t('auth/register:code_sent_to_email', 'Verification code sent to email'));
        // Navigate to existing verification page
        setTimeout(() => navigate("/verify-email", { state: { email: formData.email } }), 1000);
      } else {
        setError(response.error || t('auth/register:error_registration', 'Registration failed'));
      }
    } catch (err: any) {
      console.error("Register error:", err);
      setError(err.message || t('auth/register:error_registration', 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={salonSettings?.logo_url || logo}
            alt={salonSettings?.name || 'M Le Diamant'}
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <p className="text-muted-foreground">
            {isLogin ? t('auth/Login:login_title', 'Login to your account') : t('auth/register:register_title', 'Create new account')}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 py-2 rounded-lg transition-colors ${isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
            >
              {t('auth/Login:login', 'Login')}
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 py-2 rounded-lg transition-colors ${!isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
            >
              {t('auth/register:register_button', 'Register')}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
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
              <label className="block text-sm font-medium mb-2">{t('auth/Login:username', 'Username')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder={t('auth/Login:enter_login', 'Enter username')}
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

            <div>
              <label className="block text-sm font-medium mb-2">{t('auth/Login:password', 'Password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>

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
                  Я согласен с{' '}
                  <a href="/terms" className="text-primary hover:underline">
                    условиями использования
                  </a>{' '}
                  и{' '}
                  <a href="/privacy-policy" className="text-primary hover:underline">
                    политикой конфиденциальности
                  </a>
                </label>
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <a href="/forgot-password" className="text-sm text-primary hover:underline">
                  Забыли пароль?
                </a>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full hero-button-primary h-11">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isLogin ? 'Вход...' : 'Регистрация...'}</span>
                </div>
              ) : (
                isLogin ? 'Войти' : 'Зарегистрироваться'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary">
              ← Вернуться на главную
            </a>
          </div>
        </div>

        {!isLogin && (
          <div className="mt-6 p-4 bg-card rounded-lg border border-border">
            <h3 className="font-semibold mb-2 text-sm">Условия использования</h3>
            <div className="text-xs text-muted-foreground space-y-2 max-h-40 overflow-y-auto">
              <p>1. Вы обязуетесь предоставлять только достоверную информацию.</p>
              <p>2. Мы гарантируем конфиденциальность ваших данных.</p>
              <p>3. Вы можете отменить запись за 24 часа до приема.</p>
              <p>4. При неявке без предупреждения может быть применена комиссия.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
