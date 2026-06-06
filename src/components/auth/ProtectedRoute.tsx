import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from './AuthPage';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <img 
              src="/loading_naruto_inspirado.svg" 
              alt="Carregando" 
              className="w-16 h-16"
            />
          </div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  return (
    <div>
      {/* Header com informações do usuário */}
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 items-center">
          {/* Esquerda: logo + nome */}
          <div className="flex items-center gap-3">
            <img 
              src="/chikamaru-thinking.svg" 
              alt="Chikamaru pensando" 
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-700 p-1"
            />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {user?.user_metadata?.full_name || user?.email || 'Usuário'}
            </h2>
          </div>

          {/* Centro: navegação */}
          <div className="flex justify-center">
            {navContent}
          </div>

          {/* Direita: settings + logout */}
          <div className="flex justify-end items-center gap-2">
            {settingsButton}
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition"
            >
              🚪 Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo protegido */}
      {children}
    </div>
  );
}
