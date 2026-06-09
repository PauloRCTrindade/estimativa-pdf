import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from './AuthPage';
import { SignOut } from '@phosphor-icons/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onLogout?: () => void;
  navContent?: React.ReactNode;
  settingsButton?: React.ReactNode;
}

export function ProtectedRoute({ children, onLogout, navContent, settingsButton }: ProtectedRouteProps) {
  const { isAuthenticated, user, checkAuth, loading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <img 
              src="/loading_naruto_inspirado.svg" 
              alt="Carregando" 
              className="w-16 h-16"
            />
          </div>
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  const userName = user?.user_metadata?.full_name || user?.email || 'Usuário';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header moderno */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-4 lg:px-8">
          {/* Esquerda: logo + nome */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              EP
            </div>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold leading-none">{userName}</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Estimativa PDF</p>
            </div>
          </div>

          {/* Centro: navegação em pills */}
          <div className="flex-1 flex justify-center">
            {navContent}
          </div>

          {/* Direita: settings + logout */}
          <div className="flex items-center gap-1.5">
            {settingsButton}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <SignOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo protegido */}
      <main className="mx-auto max-w-[1800px] flex-1 min-w-0 w-full px-4 py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
