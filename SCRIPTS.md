# 🚀 Scripts para Setup e Desenvolvimento

## 📝 Comandos Disponíveis

### 1️⃣ Setup do Database
```bash
npm run setup:db
```
Executa o script de setup do Supabase automaticamente.
- Valida variáveis de ambiente
- Verifica conexão com Supabase
- Mostra status da tabela

### 2️⃣ Iniciar API (Development)
```bash
npm run dev:api
```
Inicia o servidor de API local na porta 3000.
- Conecta ao Supabase
- Expõe endpoints `/api/estimativas`
- Com hot reload

### 3️⃣ Iniciar Frontend (Development)
```bash
npm run dev
```
Inicia o servidor Vite na porta 5177.

### 4️⃣ Iniciar Tudo Junto
```bash
npm run dev:all
```
Inicia frontend E API simultaneamente em terminais paralelos.
- Frontend: http://localhost:5177
- API: http://localhost:3000
- Pressione `q` para sair de ambos

### 5️⃣ Build para Produção
```bash
npm run build
```
Compila TypeScript e constrói bundle Vite.

### 6️⃣ Preview da Build
```bash
npm run preview
```
Visualiza a build de produção localmente.

### 7️⃣ Lint
```bash
npm run lint
```
Verifica erros de código com ESLint.

---

## 🔧 Workflow Recomendado

### Primeira Vez (Setup Completo)

**Terminal 1 - Setup DB:**
```bash
# Você já configurou .env.local? Se não:
# Copie do .env.example ou crie com:
# SUPABASE_URL=https://zhsdfjmagcpayeemijkb.supabase.co
# SUPABASE_ANON_KEY=sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE
# VITE_API_URL=http://localhost:3000

npm run setup:db
```

**Se receber erro na tabela, execute manualmente no Supabase:**
1. Acesse https://app.supabase.com
2. SQL Editor → New Query
3. Cole todo o conteúdo de `database.sql`
4. Clique RUN

### Desenvolvimento Diário

**Terminal 1 - Iniciar ambos:**
```bash
npm run dev:all
```

Ou em dois terminais:

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run dev:api
```

### Testar API

```bash
# Listar (deve retornar [])
curl http://localhost:3000/api/estimativas

# Criar
curl -X POST http://localhost:3000/api/estimativas \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Teste",
    "arquiteto": "João",
    "inicio": "2026-05-01",
    "releaseAlvo": "2026-05-15",
    "pontos": "21"
  }'

# Listar de novo (deve mostrar o novo item)
curl http://localhost:3000/api/estimativas
```

---

## 📦 Dependências Instaladas

- `express` - Framework web
- `cors` - Middleware CORS
- `@supabase/supabase-js` - Cliente Supabase
- `vite` - Build tool
- `tailwindcss` - CSS framework
- `@vitejs/plugin-react` - React plugin

---

## 🆘 Troubleshooting

### "Module not found"
```bash
npm install
```

### "Cannot connect to Supabase"
Verifique `.env.local`:
```bash
cat .env.local
# Deve mostrar SUPABASE_URL e SUPABASE_ANON_KEY
```

### "API não responde"
```bash
# Verifique se está rodando:
curl http://localhost:3000/health
# Deve retornar: {"status":"OK",...}
```

### "Porta já em uso"
```bash
# Encontrar processo na porta 3000
lsof -i :3000

# Matar processo
kill -9 <PID>
```

### "Node version mismatch"
```bash
nvm use 22.22.2
npm run dev
```

---

## 📚 Arquivos Importantes

- `dev-server.js` - Servidor API local
- `setup-db.js` - Script de setup Supabase
- `database.sql` - Schema PostgreSQL
- `.env.local` - Credenciais (ignorado por git)
- `.env.example` - Template de env vars

---

## ✅ Checklist de Setup

- [ ] `.env.local` criado com credenciais Supabase
- [ ] `npm install` rodou sem erros
- [ ] `npm run setup:db` rodou sem erros
- [ ] SQL foi executado em https://app.supabase.com
- [ ] Tabela `estimativas` aparece em Supabase → Table Editor
- [ ] `npm run dev:api` inicia sem erros
- [ ] `curl http://localhost:3000/api/estimativas` retorna `[]`
- [ ] `npm run dev` inicia sem erros
- [ ] App funciona em http://localhost:5177

---

## 🚀 Próximo Passo

Integrar a hook `useEstimativas` no seu `App.tsx`:

Veja `EXEMPLO_USO.tsx` para um exemplo prático!

```bash
# Abrir arquivo de exemplo
cat EXEMPLO_USO.tsx
```
