import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface SignupProps {
  onSignupSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function Signup({ onSignupSuccess, onSwitchToLogin }: SignupProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { signup, loading, error } = useAuth();
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (password !== confirmPassword) {
      alert('❌ As senhas não conferem');
      return;
    }

    if (password.length < 6) {
      alert('❌ A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!agreedToTerms) {
      alert('❌ Você deve aceitar os termos de serviço');
      return;
    }

    const result = await signup(email, password, fullName);
    if (result.success) {
      setSignupSuccess(true);
      setTimeout(() => {
        onSignupSuccess?.();
      }, 2000);
    }
  };

  if (signupSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 space-y-6 text-center">
        <div className="space-y-4">
          <div className="text-4xl">✅</div>
          <h1 className="text-2xl font-bold">Conta Criada com Sucesso!</h1>
          <p className="text-gray-600">
            Verifique seu email ({email}) para confirmar sua conta.
          </p>
          <p className="text-sm text-gray-500">
            Você será redirecionado em breve...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Criar Conta</h1>
        <p className="text-sm text-gray-600">
          Preencha os dados para criar uma nova conta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome Completo</label>
          <Input
            type="text"
            placeholder="João Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

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
          <p className="text-xs text-gray-500">
            Mínimo 6 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Confirmar Senha</label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-gray-600">
            Concordo com os{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">
              Política de Privacidade
            </a>
          </label>
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
          {loading ? '⏳ Criando conta...' : '✨ Criar Conta'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Ou</span>
        </div>
      </div>

      <p className="text-sm text-center text-gray-600">
        Já tem uma conta?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Fazer login
        </button>
      </p>
    </Card>
  );
}
