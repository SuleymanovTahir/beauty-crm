import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Lock } from 'lucide-react';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    agreedToTerms: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      // Login logic
      alert('Вход выполнен успешно!');
      window.location.href = '/account';
    } else {
      // Register logic
      if (!formData.agreedToTerms) {
        alert('Пожалуйста, согласитесь с условиями');
        return;
      }
      alert('Регистрация выполнена успешно!');
      window.location.href = '/account';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Beauty Salon</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                !isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Имя</label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ваше имя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Телефон</label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+971 XX XXX XXXX"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ваш@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Пароль</label>
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

            <Button type="submit" className="w-full hero-button-primary h-11">
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
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
