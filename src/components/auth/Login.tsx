import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Hourglass, EnvelopeSimple, Eye, EyeSlash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

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
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Recuperar Senha</h2>
            <p className="text-sm text-muted-foreground">
              Digite seu email para receber um link de reset
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>

            {resetError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                Email enviado! Verifique sua caixa de entrada
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1 gap-2" size="sm">
                {loading ? (
                  <><Hourglass className="h-3.5 w-3.5 animate-spin" /> Enviando...</>
                ) : (
                  <><EnvelopeSimple className="h-3.5 w-3.5" /> Enviar Link</>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} size="sm">
                Voltar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Login</h2>
          <p className="text-sm text-muted-foreground">
            Bem-vindo de volta! Faça login com suas credenciais
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full" size="sm">
            {loading ? (
              <><Hourglass className="h-3.5 w-3.5 animate-spin mr-2" /> Fazendo login...</>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs text-primary hover:underline w-full text-center"
          >
            Esqueceu a senha?
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-primary hover:underline font-medium"
            >
              Criar agora
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
