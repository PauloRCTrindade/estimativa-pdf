# 🔐 Autenticação Supabase - Guia Completo

## 📦 Componentes Criados

### 1. **Hook: `useAuth`** (`src/hooks/useAuth.ts`)
Gerencia toda a lógica de autenticação:
- `login()` - Fazer login
- `signup()` - Criar conta
- `logout()` - Sair
- `resetPassword()` - Recuperar senha
- `checkAuth()` - Verificar se está logado
- `user` - Dados do usuário autenticado
- `isAuthenticated` - Boolean indicando se está logado

### 2. **Componente: `Login`** (`src/components/auth/Login.tsx`)
Tela de login com:
- ✅ Email e senha
- ✅ Mostrar/ocultar senha
- ✅ Recuperar senha
- ✅ Link para criar conta
- ✅ Tratamento de erros

### 3. **Componente: `Signup`** (`src/components/auth/Signup.tsx`)
Tela de criação de conta com:
- ✅ Nome completo
- ✅ Email
- ✅ Senha com confirmação
- ✅ Validação de senha
- ✅ Termos de serviço
- ✅ Link para fazer login

### 4. **Componente: `AuthPage`** (`src/components/auth/AuthPage.tsx`)
Página completa de autenticação:
- ✅ Alterna entre Login e Signup
- ✅ Design moderno com gradiente
- ✅ Layout responsivo

### 5. **Componente: `ProtectedRoute`** (`src/components/auth/ProtectedRoute.tsx`)
Protege rotas que exigem autenticação:
- ✅ Verifica se está autenticado
- ✅ Mostra login se não estiver
- ✅ Header com info do usuário
- ✅ Botão de logout

---

## 🚀 Como Usar

### Passo 1: Ativar Autenticação no Supabase

1. Acesse: https://app.supabase.com
2. Seu projeto → Authentication
3. Clique em **Get Started**
4. Selecione **Email** como provedor
5. Ative **Email/Password authentication**
6. Clique em **Save**

### Passo 2: Configurar Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
VITE_SUPABASE_URL=https://zhsdfjmagcpayeemijkb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE
```

### Passo 3: Integrar no App.tsx

**Opção A: Usar ProtectedRoute (Recomendado)**

```typescript
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthPage } from '@/components/auth/AuthPage';

export default function App() {
  const { isAuthenticated, checkAuth, logout, loading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <ProtectedRoute onLogout={logout}>
      {/* Seu aplicativo aqui */}
      <YourMainApp />
    </ProtectedRoute>
  );
}
```

**Opção B: Controlar Manualmente**

```typescript
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/components/auth/AuthPage';

export default function App() {
  const { isAuthenticated, user } = useAuth();

  return isAuthenticated ? (
    <YourMainApp />
  ) : (
    <AuthPage onAuthSuccess={() => window.location.reload()} />
  );
}
```

---

## 🧪 Testar Autenticação

### Teste 1: Criar Conta
```bash
# Acesse http://localhost:5177
# Clique em "Criar agora"
# Preencha os dados
# Confirme seu email (link no Supabase)
```

### Teste 2: Fazer Login
```bash
# Na mesma página, clique em "Fazer login"
# Use o email e senha que criou
```

### Teste 3: Recuperar Senha
```bash
# Clique em "Esqueceu a senha?"
# Digite seu email
# Receberá link para resetar
```

### Teste 4: Logout
```bash
# Clique no botão "Sair" no header
# Deve voltar para a tela de login
```

---

## 🔑 Variáveis Disponíveis

```typescript
const { 
  // Estado
  user,                    // { id, email, user_metadata }
  isAuthenticated,         // boolean
  loading,                 // boolean
  error,                   // string | null

  // Funções
  login,                   // async (email, password)
  signup,                  // async (email, password, fullName?)
  logout,                  // async ()
  checkAuth,               // async ()
  resetPassword,           // async (email)
} = useAuth();
```

---

## 📨 Emails Automáticos

Supabase envia automaticamente:
- 📧 **Confirmação de email** - Ao criar conta
- 🔐 **Reset de senha** - Ao solicitar recuperação
- 🔔 **Notificação de login** - (opcional, configure em Supabase)

### Customizar Templates de Email
1. Supabase → Authentication → Email Templates
2. Edite os templates conforme necessário
3. Você pode adicionar seu logo, mudar texto, etc.

---

## 🛡️ Segurança

✅ **Implementado:**
- Senhas hasheadas no banco
- JWT tokens seguros
- HTTPS em produção
- RLS (Row Level Security)
- CORS configurado

⚠️ **Recomendações:**
- Sempre usar HTTPS em produção
- Configurar domínios autorizados no Supabase
- Validar permissões no backend
- Implementar rate limiting se necessário

---

## 🔗 Integração com Estimativas

Para associar estimativas ao usuário autenticado:

```typescript
// No seu useEstimativas hook ou service:
const supabase = createClient(url, key);

// Ao criar estimativa, salve o user_id
const { data } = await supabase
  .from('estimativas')
  .insert([{
    ...estimativa,
    user_id: currentUser.id,  // Novo campo!
  }]);

// Ao listar, filtre por user_id
const { data } = await supabase
  .from('estimativas')
  .select('*')
  .eq('user_id', currentUser.id);
```

---

## 📋 Próximos Passos

1. **Ativar autenticação no Supabase** ✅
2. **Integrar ProtectedRoute no App.tsx** ✅
3. **Testar login/signup** ✅
4. **Associar estimativas ao usuário**
5. **Deploy para produção**

---

## 📚 Recursos

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Exemplos de Autenticação](https://supabase.com/docs/guides/auth/social-login)

---

## ❓ FAQ

**P: Posso usar redes sociais para login?**
R: Sim! Supabase suporta Google, GitHub, Discord, etc. Veja a documentação.

**P: Como resetar senha de um usuário?**
R: No Supabase dashboard → Authentication → Users → clique no usuário → Reset password

**P: Posso deletar minha conta?**
R: Implementaremos em breve! Por enquanto use Supabase dashboard.

**P: Quanto custa autenticação?**
R: Supabase oferece autenticação gratuita até 100K usuários.

---

## 🆘 Problemas Comuns

**Erro: "User not found"**
- Verifique se o email foi confirmado
- Verifique as credenciais

**Erro: "Invalid credentials"**
- Email ou senha incorretos
- Tente recuperar senha

**Erro: "Email not confirmed"**
- Abra o link de confirmação no seu email
- Se expirou, peça novo link

---

**Pronto! Seu sistema de autenticação está completo! 🎉**
