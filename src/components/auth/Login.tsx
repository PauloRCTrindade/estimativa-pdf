import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface LoginProps {
  onLoginSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export function Login({ onLoginSuccess, onSwitchToSignup }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  
  const { login, loading, error, resetPassword } = useAuth();
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await login(email, password);
    if (result.success) {
      onLoginSuccess?.();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);

    const result = await resetPassword(forgotEmail);
    if (result.success) {
      setResetSuccess(true);
      setForgotEmail('');
      setTimeout(() => setShowForgotPassword(false), 2000);
    } else {
      setResetError(result.error);
    }
  };

  if (showForgotPassword) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Recuperar Senha</h1>
          <p className="text-sm text-gray-600">
            Digite seu email para receber um link de reset
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          </div>

          {resetError && (
            <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
              {resetError}
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 rounded bg-green-50 text-green-700 text-sm">
              ✅ Email enviado! Verifique sua caixa de entrada
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? '⏳ Enviando...' : '📧 Enviar Link'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
            >
              Voltar
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="text-sm text-gray-600">
          Bem-vindo de volta! Faça login com suas credenciais
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Senha</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? '⏳ Fazendo login...' : '🔓 Entrar'}
        </Button>
      </form>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-sm text-blue-600 hover:text-blue-700 w-full text-center"
        >
          Esqueceu a senha?
        </button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou</span>
          </div>
        </div>

        <p className="text-sm text-center text-gray-600">
          Não tem uma conta?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Criar agora
          </button>
        </p>
      </div>
    </Card>
  );
}
