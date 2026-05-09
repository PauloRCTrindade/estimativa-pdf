import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthPage } from '@/components/auth/AuthPage';

/**
 * Exemplo de como usar autenticação no seu App.tsx
 * 
 * Copie o código abaixo e adapte ao seu App.tsx
 */

export function AppWithAuth() {
  const { isAuthenticated, checkAuth, logout, loading } = useAuth();

  useEffect(() => {
    // Verificar se o usuário já está logado ao carregar
    checkAuth();
  }, []);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <div className="text-4xl">⏳</div>
          </div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostrar página de login/signup
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  // Se está autenticado, mostrar conteúdo protegido
  return (
    <ProtectedRoute onLogout={handleLogout}>
      {/* Seu App original aqui */}
      <div className="p-4">
        <h1>Bem-vindo ao seu App!</h1>
        {/* Adicione seu componente principal aqui */}
      </div>
    </ProtectedRoute>
  );
}

/**
 * INTEGRAÇÃO NO APP.TSX:
 * 
 * 1. Importe os componentes:
 *    import { useAuth } from '@/hooks/useAuth';
 *    import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
 *    import { AuthPage } from '@/components/auth/AuthPage';
 * 
 * 2. No seu App.tsx, substitua o conteúdo por:
 *    export default function App() {
 *      const { isAuthenticated, checkAuth, logout, loading } = useAuth();
 * 
 *      useEffect(() => {
 *        checkAuth();
 *      }, []);
 * 
 *      if (loading) return <LoadingScreen />;
 * 
 *      return (
 *        <ProtectedRoute onLogout={logout}>
 *          <seu-conteudo-aqui />
 *        </ProtectedRoute>
 *      );
 *    }
 * 
 * 3. Pronto! Agora seu app está protegido com autenticação
 */
