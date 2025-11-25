import React, { useState } from 'react';
import { User, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function UserCabinet() {
  const navigate = useNavigate();
  const { t } = useTranslation(['public/UserCabinet', 'common']);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.username || !loginData.password) {
      toast.error(t('usercabinet:fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', loginData.username);
      formData.append('password', loginData.password);

      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        localStorage.setItem('session_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        toast.success(t('usercabinet:loginSuccess'));

        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/admin';
          } else if (data.user.role === 'manager') {
            window.location.href = '/manager';
          } else if (data.user.role === 'employee') {
            window.location.href = '/employee';
          }
        }, 500);
      } else {
        toast.error(t('usercabinet:loginError'));
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error(t('usercabinet:systemError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 bg-gray-50 min-h-screen">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">{t('usercabinet:title')}</h1>
          <p className="text-gray-600">{t('usercabinet:subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="username">{t('usercabinet:username')}</Label>
              <Input
                id="username"
                type="text"
                required
                disabled={loading}
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                placeholder={t('usercabinet:usernamePlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('usercabinet:usernameHint')}</p>
            </div>

            <div>
              <Label htmlFor="password">{t('usercabinet:password')}</Label>
              <Input
                id="password"
                type="password"
                required
                disabled={loading}
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder={t('usercabinet:passwordPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('usercabinet:passwordHint')}</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600"
              size="lg"
            >
              <Lock className="w-4 h-4 mr-2" />
              {loading ? t('usercabinet:loggingIn') : t('usercabinet:loginButton')}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Button
              variant="link"
              className="text-pink-600"
              onClick={() => navigate('/forgot-password')}
            >
              Забыли пароль?
            </Button>
          </div>

          <div className="mt-6 text-center space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/register')}
            >
              Нет аккаунта? Зарегистрироваться
            </Button>

            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              {t('usercabinet:backToHome')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}