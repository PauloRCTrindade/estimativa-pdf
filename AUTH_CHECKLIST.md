# ✅ Checklist de Integração de Autenticação

## 📋 Pré-requisitos

- [ ] Node.js 22+ instalado (use `.nvmrc`)
- [ ] Supabase project criado
- [ ] Variáveis de ambiente configuradas

## 🔧 Passo 1: Configurar Supabase Auth

- [ ] Acessar https://app.supabase.com
- [ ] Selecionar seu projeto
- [ ] Ir para **Authentication** → **Providers**
- [ ] Ativar **Email** provider
- [ ] Habilitar **Email/Password** authentication
- [ ] Clicar em **Save**

## 📝 Passo 2: Configurar Variáveis de Ambiente

- [ ] Abrir `.env.local`
- [ ] Adicionar `VITE_SUPABASE_URL`
- [ ] Adicionar `VITE_SUPABASE_ANON_KEY`
- [ ] Salvar arquivo

Exemplo:
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu-chave-publica
```

## 💾 Passo 3: Verificar Arquivos Criados

Arquivos que devem existir:

- [ ] `src/hooks/useAuth.ts`
- [ ] `src/components/auth/Login.tsx`
- [ ] `src/components/auth/Signup.tsx`
- [ ] `src/components/auth/AuthPage.tsx`
- [ ] `src/components/auth/ProtectedRoute.tsx`
- [ ] `src/components/auth/index.ts`

## 🔗 Passo 4: Integrar no App.tsx

### Opção A: Usar ProtectedRoute (Recomendado)

```typescript
// No seu App.tsx, adicione:

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function App() {
  const { isAuthenticated, checkAuth, logout, loading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <ProtectedRoute onLogout={() => logout()}>
      {/* Seu App aqui */}
      <main>
        {/* Conteúdo */}
      </main>
    </ProtectedRoute>
  );
}
```

- [ ] Importar `useAuth`
- [ ] Importar `ProtectedRoute`
- [ ] Adicionar `useEffect` para `checkAuth()`
- [ ] Wrappear conteúdo com `<ProtectedRoute>`
- [ ] Testar se funciona

### Opção B: Controle Manual

```typescript
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/components/auth/AuthPage';
import { YourMainApp } from '@/App'; // seu componente original

export default function App() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <YourMainApp />
  ) : (
    <AuthPage onAuthSuccess={() => window.location.reload()} />
  );
}
```

- [ ] Importar `useAuth`
- [ ] Importar `AuthPage`
- [ ] Renderizar condicionalmente
- [ ] Testar se funciona

## 🧪 Passo 5: Testar Autenticação

- [ ] Executar `npm run dev`
- [ ] Abrindo http://localhost:5177
- [ ] Criar nova conta
- [ ] Verificar email de confirmação
- [ ] Fazer login
- [ ] Acessar o app protegido
- [ ] Testar botão de logout
- [ ] Testar "esqueceu a senha"

## 📱 Passo 6: Adaptar Banco de Dados

Para associar estimativas ao usuário:

- [ ] Adicionar coluna `user_id` na tabela `estimativas`
- [ ] Criar foreign key para `auth.users(id)`
- [ ] Criar RLS policies (apenas seu próprio user_id)
- [ ] Atualizar `useEstimativas` hook

### SQL para adicionar user_id:

```sql
-- Adicionar coluna
ALTER TABLE estimativas
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX idx_estimativas_user_id ON estimativas(user_id);

-- RLS: Usuários veem apenas suas estimativas
ALTER TABLE estimativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estimativas"
  ON estimativas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own estimativas"
  ON estimativas FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

- [ ] Executar SQL no Supabase
- [ ] Testar filtro por user_id

## 📊 Passo 7: Atualizar Estimativas Hook

No seu `useEstimativas.ts`:

```typescript
// Ao criar estimativa:
const { data } = await supabase
  .from('estimativas')
  .insert([{
    ...estimativa,
    user_id: user.id, // Adicionar
  }]);

// Ao listar estimativas:
const { data } = await supabase
  .from('estimativas')
  .select('*')
  .eq('user_id', user.id) // Adicionar filtro
  .order('criadoEm', { ascending: false });
```

- [ ] Adicionar `user_id` ao criar
- [ ] Filtrar por `user_id` ao listar
- [ ] Testar se funciona

## 🚀 Passo 8: Deploy para Produção

- [ ] Testar tudo localmente
- [ ] Commit e push para Git
- [ ] Deploy para Vercel
- [ ] Adicionar variáveis de ambiente no Vercel
- [ ] Testar autenticação em produção
- [ ] Configurar domínios autorizados no Supabase

Variáveis no Vercel:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

- [ ] Variables adicionadas no Vercel
- [ ] Deploy realizado
- [ ] Testar em produção

## ✨ Passo 9: Finalização

- [ ] Customizar emails de autenticação (opcional)
- [ ] Adicionar rate limiting (opcional)
- [ ] Implementar 2FA (opcional)
- [ ] Configurar logs de auditoria (opcional)

---

## 🆘 Troubleshooting

### Erro: "Environment variables not found"
- [ ] Verificar `.env.local` existe
- [ ] Verficar variáveis têm o prefixo `VITE_`
- [ ] Reiniciar dev server: `npm run dev`

### Erro: "createClient is not a function"
- [ ] Verificar `useAuth.ts` importa corretamente
- [ ] Verificar `@supabase/supabase-js` está instalado
- [ ] Rodar `npm install`

### Erro: "User not found"
- [ ] Verificar email foi confirmado
- [ ] Verificar credenciais
- [ ] Verificar usuário existe no Supabase

### Erro: "Invalid credentials"
- [ ] Email ou senha incorretos
- [ ] Usar "Recuperar senha" se esqueceu

### Componentes não renderizam
- [ ] Verificar imports
- [ ] Verificar arquivos existem
- [ ] Verificar TypeScript errors: `npm run build`

---

## ✅ Finalizado!

Quando todos os checkboxes estiverem marcados, você tem autenticação completa!

**Próximos passos:**
- Configurar perfil de usuário
- Implementar upload de foto
- Adicionar preferências
- Implementar notificações
- Adicionar integrações

**Precisa de ajuda?**
- Leia `AUTH_GUIDE.md`
- Veja exemplos em `AUTH_EXAMPLES.tsx`
- Consulte `AUTH_INTEGRATION.tsx`
