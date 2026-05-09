/**
 * 📚 EXEMPLOS DE USO - Autenticação Supabase
 * 
 * Copie e adapte os exemplos abaixo ao seu código
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthPage } from '@/components/auth/AuthPage';

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 1: App com Autenticação Completa
 * ═══════════════════════════════════════════════════════════
 */
export function Example1_CompleteApp() {
  const { isAuthenticated, checkAuth, logout, loading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl animate-spin">⏳</div>
          <p className="mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <ProtectedRoute onLogout={handleLogout}>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold">Bem-vindo!</h1>
        {/* Seu conteúdo aqui */}
      </div>
    </ProtectedRoute>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 2: Mostrar Dados do Usuário
 * ═══════════════════════════════════════════════════════════
 */
export function Example2_ShowUserData() {
  const { user } = useAuth();

  return (
    <div className="p-4 bg-blue-50 rounded">
      <h2 className="font-bold">Dados do Usuário:</h2>
      <p>Email: {user?.email}</p>
      <p>ID: {user?.id}</p>
      <p>Nome: {user?.user_metadata?.full_name}</p>
    </div>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 3: Login Manual (sem componente)
 * ═══════════════════════════════════════════════════════════
 */
export function Example3_ManualLogin() {
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password123');
    if (result.success) {
      console.log('Login bem-sucedido!');
      window.location.href = '/dashboard';
    } else {
      console.log('Erro:', result.error);
    }
  };

  return (
    <div>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? 'Conectando...' : 'Fazer Login'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 4: Signup Manual
 * ═══════════════════════════════════════════════════════════
 */
export function Example4_ManualSignup() {
  const { signup, loading, error } = useAuth();

  const handleSignup = async () => {
    const result = await signup(
      'novo@example.com',
      'senha123',
      'João Silva'
    );
    if (result.success) {
      console.log('Conta criada! Verifique seu email');
    } else {
      console.log('Erro:', result.error);
    }
  };

  return (
    <div>
      <button
        onClick={handleSignup}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        {loading ? 'Criando...' : 'Criar Conta'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 5: Componente Condicional
 * ═══════════════════════════════════════════════════════════
 */
export function Example5_ConditionalComponent() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  return (
    <div>
      <h1>Olá, {user?.user_metadata?.full_name}!</h1>
      <p>Esta é uma área protegida</p>
    </div>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 6: Associar Estimativas ao Usuário
 * ═══════════════════════════════════════════════════════════
 */
export function Example6_EstimaticeWithUser() {
  const { user } = useAuth();
  const { criar: criarEstimativa } = useEstimativas(); // seu hook

  const handleSalvarComUsuario = async (estimativa: any) => {
    if (!user) {
      alert('Você precisa estar autenticado');
      return;
    }

    // Adicionar user_id à estimativa
    const estimativaComUsuario = {
      ...estimativa,
      user_id: user.id,
    };

    await criarEstimativa(estimativaComUsuario);
  };

  return (
    <button
      onClick={() => handleSalvarComUsuario({})}
      className="px-4 py-2 bg-purple-600 text-white rounded"
    >
      💾 Salvar Estimativa (com User)
    </button>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 7: Recuperar Senha
 * ═══════════════════════════════════════════════════════════
 */
export function Example7_ResetPassword() {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useAuth('');

  const handleReset = async () => {
    const result = await resetPassword(email);
    if (result.success) {
      alert('✅ Email de reset enviado');
    } else {
      alert('❌ Erro ao enviar email');
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        className="px-3 py-2 border rounded"
      />
      <button
        onClick={handleReset}
        disabled={loading}
        className="px-4 py-2 bg-orange-600 text-white rounded"
      >
        {loading ? 'Enviando...' : '📧 Recuperar Senha'}
      </button>
    </div>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 8: Check Auth ao Carregar
 * ═══════════════════════════════════════════════════════════
 */
export function Example8_CheckAuthOnLoad() {
  const { checkAuth, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Executar quando componente monta
    checkAuth();
  }, []);

  if (loading) return <div>Verificando autenticação...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <p>✅ Você está autenticado</p>
      ) : (
        <p>❌ Você não está autenticado</p>
      )}
    </div>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 9: Logout com Confirmação
 * ═══════════════════════════════════════════════════════════
 */
export function Example9_LogoutWithConfirm() {
  const { logout, loading } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      const result = await logout();
      if (result.success) {
        window.location.href = '/login';
      }
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded"
    >
      {loading ? 'Saindo...' : '🚪 Sair'}
    </button>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * EXEMPLO 10: Combo Auth Page
 * ═══════════════════════════════════════════════════════════
 */
export function Example10_FullAuthPage() {
  const { isAuthenticated, checkAuth, loading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div>
      {loading ? (
        <div>Carregando...</div>
      ) : isAuthenticated ? (
        <div>Você está logado!</div>
      ) : (
        <AuthPage onAuthSuccess={() => window.location.reload()} />
      )}
    </div>
  );
}

/**
 * ═══════════════════════════════════════════════════════════
 * COMO USAR:
 * 
 * 1. Escolha um exemplo acima
 * 2. Copie o código
 * 3. Cole no seu componente
 * 4. Adapte ao seu caso de uso
 * 5. Teste localmente
 * 
 * ═══════════════════════════════════════════════════════════
 */
