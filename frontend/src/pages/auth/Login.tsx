import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';

interface LoginProps {
  onLogin: (user: { role: string; name: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - в production это будет работать с Supabase
    onLogin({ role: 'admin', name: 'Администратор' });
    toast.success('Вы успешно вошли в систему');
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl text-gray-900 mb-2">Beauty Salon CRM</h1>
          <p className="text-gray-600">Вход в систему управления</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  required
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="admin"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="••••••"
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600" size="lg">
              Войти
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button variant="link" className="text-pink-600">
              Забыли пароль?
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Вернуться на главную
          </Button>
        </div>
      </div>
    </div>
  );
}
