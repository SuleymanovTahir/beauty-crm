import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/app/components/ui/button';
import { Input } from '../../src/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/app/components/ui/card';
import { Label } from '../../src/app/components/ui/label';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === 'admin' && password === 'admin123') {
      const adminUser = {
        id: 1,
        username: 'admin',
        full_name: 'Admin User',
        role: 'admin',
        email: 'admin@example.com',
        phone: '+971 50 123 4567'
      };
      login(adminUser, 'demo_token_admin123');
      navigate('/account');
    } else {
      alert('Invalid credentials. Use admin/admin123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-black text-white hover:bg-black/90">
              Sign In
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Demo: admin / admin123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
