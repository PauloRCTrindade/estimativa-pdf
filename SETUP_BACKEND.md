# 🚀 Configuração Backend com Supabase + Vercel

Guia completo para integrar banco de dados na sua aplicação de estimativas.

## 📋 Passo 1: Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em "New Project"
3. Preencha os dados:
   - **Project name:** `estimativa-pdf`
   - **Database password:** Crie uma senha forte
   - **Region:** Escolha mais próxima (ex: `sa-east-1` para Brazil)
4. Clique "Create new project"
5. Aguarde 2-3 minutos para criar

## 🔑 Passo 2: Obter Credenciais

1. Vá para **Project Settings** → **API**
2. Copie:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
3. Salve em um lugar seguro

## 🗄️ Passo 3: Criar Tabelas

1. No Supabase, vá para **SQL Editor**
2. Clique em "New Query"
3. Cole o conteúdo de [`database.sql`](./database.sql)
4. Clique "Run" para executar
5. Pronto! Tabela criada ✅

## 🔧 Passo 4: Configurar Variáveis de Ambiente

### Local (desenvolvimento):

**Crie arquivo `.env.local` na raiz do projeto:**

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-aqui
VITE_API_URL=http://localhost:3000
```

**Crie arquivo `.env` (para o Vercel local):**

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-aqui
```

### Produção (Vercel):

1. Vá para seu projeto no [Vercel](https://vercel.com)
2. Settings → Environment Variables
3. Adicione:
   - `SUPABASE_URL`: `https://seu-projeto.supabase.co`
   - `SUPABASE_ANON_KEY`: `sua-chave-aqui`
4. Clique "Save"

## 📦 Passo 5: Instalar Dependências

```bash
npm install @supabase/supabase-js @vercel/node
```

## 🧪 Passo 6: Testar Localmente

```bash
npm run dev
```

Teste a API:
```bash
# Listar estimativas
curl http://localhost:3000/api/estimativas

# Criar estimativa
curl -X POST http://localhost:3000/api/estimativas \
  -H "Content-Type: application/json" \
  -d '{
    "titulo":"PTI-001",
    "arquiteto":"João",
    "inicio":"2024-01-15",
    "releaseAlvo":"2024-02-15",
    "feriados":"",
    "releases":"",
    "premissas":"",
    "restricoes":"",
    "observacoes":"",
    "atividades":[]
  }'
```

## 📤 Passo 7: Deploy no Vercel

```bash
git add .
git commit -m "feat: add backend API with Supabase"
git push origin main
```

Vercel vai deploy automaticamente!

## 🔗 Usar no Frontend

Agora você pode salvar estimativas:

```typescript
import { useEstimativas } from '@/hooks/useEstimativas';

export function App() {
  const { criar, listar, loading } = useEstimativas();

  async function salvarEstimativa(dados) {
    try {
      const estimativa = await criar(dados);
      console.log('Salvo com ID:', estimativa.id);
    } catch (error) {
      console.error('Erro:', error);
    }
  }

  return (
    <button onClick={() => salvarEstimativa(formData)}>
      {loading ? 'Salvando...' : 'Salvar Estimativa'}
    </button>
  );
}
```

## 📁 Estrutura de Arquivos

```
estimativa-pdf/
├── api/                      # Funções serverless
│   ├── lib/
│   │   └── supabase.ts       # Configuração Supabase
│   ├── estimativas.ts        # GET todos, POST novo
│   └── estimativas/[id].ts   # GET um, PUT, DELETE
├── src/
│   ├── hooks/
│   │   └── useEstimativas.ts # Hook React
│   └── services/
│       └── api.ts            # Funções de API
├── database.sql              # Schema do banco
├── .env.example              # Exemplo de env
└── vercel.json               # Config Vercel
```

## 🚨 Troubleshooting

### "SUPABASE_URL is not defined"
- Verifique se `.env` está na raiz
- Reinicie o servidor: `npm run dev`

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### "No data returned from API"
- Verifique se a tabela foi criada no Supabase
- Confirme as credenciais em `.env`
- Veja logs no SQL Editor do Supabase

### CORS errors
- Já está configurado nos headers de CORS
- Se ainda tiver problema, adicione seu domínio em Supabase → Project Settings → API → CORS

## 🎯 Próximos Passos

1. ✅ Adicionar botão "Salvar Estimativa" no App.tsx
2. ✅ Criar página de "Histórico de Estimativas"
3. ✅ Adicionar autenticação com usuários
4. ✅ Backup automático em PDF

## 📚 Documentação

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Functions](https://vercel.com/docs/functions/serverless-functions)
- [TypeScript with Vercel](https://vercel.com/docs/functions/serverless-functions/typescript)

---

**Precisa de ajuda?** Entre em contato! 🚀
