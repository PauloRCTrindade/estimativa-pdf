import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from './AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export function ProtectedRoute({ children, onLogout }: ProtectedRouteProps) {
  const { isAuthenticated, user, checkAuth, loading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <div className="text-4xl">⏳</div>
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            👤 {user?.user_metadata?.full_name || user?.email || 'Usuário'}
          </h2>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            🚪 Sair
          </button>
        </div>
      </header>

      {/* Conteúdo protegido */}
      {children}
    </div>
  );
}
