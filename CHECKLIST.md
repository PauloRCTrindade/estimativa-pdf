# ✅ Checklist de Setup - Backend Supabase

Complete este checklist para ter o backend 100% funcional:

## 🟦 1. Dependências
- [x] `@supabase/supabase-js` - Instalado
- [x] `@vercel/node` - Instalado
- [ ] Rode `npm install` para garantir tudo foi instalado

## 🟦 2. Supabase
- [ ] Criar conta em https://supabase.com
- [ ] Criar novo projeto Supabase
- [ ] Copiar `SUPABASE_URL`
- [ ] Copiar `SUPABASE_ANON_KEY`
- [ ] Executar SQL do arquivo `database.sql` no SQL Editor do Supabase
- [ ] Confirmar que a tabela `estimativas` foi criada

## 🟦 3. Variáveis de Ambiente

### Local
- [ ] Criar arquivo `.env.local` com:
  ```
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_ANON_KEY=xxx
  VITE_API_URL=http://localhost:3000
  ```
- [ ] Criar arquivo `.env` com as mesmas credenciais do Supabase

### Vercel
- [ ] Ir para o projeto no Vercel
- [ ] Adicionar `SUPABASE_URL` em Environment Variables
- [ ] Adicionar `SUPABASE_ANON_KEY` em Environment Variables
- [ ] Salvar as variáveis

## 🟦 4. Testar Localmente
- [ ] Rodar `npm run dev`
- [ ] Verificar que o dev server inicia sem erros
- [ ] Testar endpoint: `http://localhost:3000/api/estimativas`
- [ ] Deve retornar um array vazio `[]`

## 🟦 5. Arquivos Criados
- [x] `/api/estimativas.ts` - Endpoints GET/POST
- [x] `/api/estimativas/[id].ts` - Endpoints GET/PUT/DELETE
- [x] `/api/lib/supabase.ts` - Configuração Supabase
- [x] `/src/services/api.ts` - Funções de API
- [x] `/src/hooks/useEstimativas.ts` - Hook React
- [x] `/database.sql` - Schema do banco
- [x] `/SETUP_BACKEND.md` - Documentação
- [x] `/EXEMPLO_USO.tsx` - Exemplo de uso
- [x] `/vercel.json` - Config Vercel
- [x] `/.env.example` - Exemplo de env
- [x] `package.json` - Dependências atualizadas

## 🟦 6. Integração no Frontend
- [ ] Importar `useEstimativas` no seu componente
- [ ] Adicionar botão "Salvar Estimativa"
- [ ] Chamar `criar(formData)` ao clicar
- [ ] Mostrar mensagem de sucesso/erro
- [ ] (Opcional) Adicionar página com histórico de estimativas

## 🟦 7. Deploy
- [ ] Fazer commit de todos os arquivos
  ```bash
  git add .
  git commit -m "feat: add backend API with Supabase"
  ```
- [ ] Push para main
  ```bash
  git push origin main
  ```
- [ ] Vercel faz deploy automático
- [ ] Verificar se deployment foi bem-sucedido

## 🟦 8. Teste Final em Produção
- [ ] Testar em https://seu-app.vercel.app
- [ ] Criar uma estimativa
- [ ] Verificar se foi salva no Supabase
- [ ] Listar histórico
- [ ] Deletar uma estimativa
- [ ] Verificar se foi deletada no Supabase

## 🚀 Pronto!

Quando todos os checkboxes estiverem marcados, seu backend estará 100% funcional!

## 📝 Notas Importantes

- Sempre manter `.env` e `.env.local` fora do git (estão em `.gitignore`)
- As credenciais do Supabase são públicas (chave anon), então é seguro
- RLS (Row Level Security) está habilitado, mas com políticas abertas
- Para adicionar autenticação depois, veja documentação do Supabase Auth

## ❓ Problemas Comuns

**Erro: "SUPABASE_URL is not defined"**
- Verifique se o arquivo `.env` existe na raiz
- Reinicie o servidor: `npm run dev`

**Erro: "Cannot find module"**
- Rode `npm install` novamente
- Delete `node_modules` e `.package-lock.json`
- Rode `npm install` de novo

**API retorna erro 400**
- Verifique as credenciais do Supabase
- Verifique se a tabela foi criada
- Veja os logs no console

Precisa de ajuda? Consulte `SETUP_BACKEND.md`
