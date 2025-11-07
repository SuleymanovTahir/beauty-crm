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

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">{t('usercabinet:credentials.title')}</p>
              <p>{t('usercabinet:credentials.username')} <code className="bg-white px-2 py-1 rounded">admin</code></p>
              <p>{t('usercabinet:credentials.password')} <code className="bg-white px-2 py-1 rounded">admin123</code></p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              {t('usercabinet:backToHome')}
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl text-pink-600 mb-1">👨‍💼</div>
            <p className="text-xs text-gray-600">{t('usercabinet:roles.admin')}</p>
          </div>
          <div>
            <div className="text-2xl text-purple-600 mb-1">📊</div>
            <p className="text-xs text-gray-600">{t('usercabinet:roles.manager')}</p>
          </div>
          <div>
            <div className="text-2xl text-blue-600 mb-1">💅</div>
            <p className="text-xs text-gray-600">{t('usercabinet:roles.employee')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}