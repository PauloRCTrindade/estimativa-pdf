# Configuração do Vercel - Guia Completo

## ❌ Problema Encontrado
A aplicação em produção está falhando porque as variáveis de ambiente **não estão configuradas no Vercel Dashboard**.

Erro: `Erro ao listar estimativas` / `Erro ao criar estimativa`

## ✅ Solução - Configurar Variáveis no Vercel

### Passo 1: Acessar o Vercel Dashboard
1. Acesse [vercel.com](https://vercel.com)
2. Selecione seu projeto `estimativa-pdf`
3. Vá para **Settings** (Configurações)
4. Clique em **Environment Variables** (Variáveis de Ambiente)

### Passo 2: Adicionar Variáveis de Ambiente

Adicione as seguintes variáveis (copie do `.env` local):

| Chave | Valor | Onde encontrar |
|-------|-------|----------------|
| `SUPABASE_URL` | `https://zhsdfjmagcpayeemijkb.supabase.co` | `.env` linha 1 |
| `SUPABASE_ANON_KEY` | `sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE` | `.env` linha 2 |
| `VITE_SUPABASE_URL` | `https://zhsdfjmagcpayeemijkb.supabase.co` | `.env` linha 3 |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE` | `.env` linha 4 |
| `VITE_API_URL` | `/api` | Deixe como URL relativa |

### Passo 3: Configurar para Qual Ambiente

Para cada variável, selecione:
- **Production** ✓
- **Preview** ✓  
- **Development** (opcional)

### Passo 4: Salvar e Fazer Redeploy

1. Clique em **Save**
2. A página mostrará: "Saved! Redeploying..."
3. Aguarde o deploy completar (alguns minutos)
4. Visite https://estimativa-pdf.vercel.app e teste

## 🔍 Como Verificar se Funcionou

### No Console do Navegador (F12)
1. Abra DevTools (F12)
2. Vá para **Console**
3. Procure por:
   - ✅ Se viu: Sem erros de API = Funcionou!
   - ❌ Se viu: `❌ Supabase não configurado` = Variáveis faltando

### Testando a API Diretamente
```bash
curl https://estimativa-pdf.vercel.app/api/estimativas
```

Se retornar JSON com dados = Funcionou!

## ⚠️ Checklist

- [ ] Acessei vercel.com e entrei no projeto
- [ ] Fui para Settings > Environment Variables
- [ ] Adicionei as 5 variáveis da tabela acima
- [ ] Selecionei Production/Preview para cada uma
- [ ] Cliquei Save
- [ ] Aguardei o deploy completar
- [ ] Testei a app em https://estimativa-pdf.vercel.app

## 🚀 Se Ainda Não Funcionar

1. **Forçar redeploy:**
   - Dashboard > Deployments > Clique nos 3 pontos (...) > Redeploy

2. **Limpar cache:**
   - Abra a app: Ctrl+Shift+Del para limpar cache
   - Ou use Incognito: Ctrl+Shift+P (privado)

3. **Verificar logs:**
   - Dashboard > Deployments > Clique no último deploy > Logs
   - Procure por: `SUPABASE_URL` ou erros do Supabase

## 📝 Variáveis de Ambiente Explicadas

- `SUPABASE_URL`: Endereço do banco de dados
- `SUPABASE_ANON_KEY`: Chave pública para acesso (segura para frontend)
- `VITE_*`: Variáveis que ficam visíveis no frontend (safe)
- `VITE_API_URL`: URL base das requisições de API (relativa = mesmo domínio)

---

**⏰ Tempo estimado:** 5 minutos  
**Última atualização:** 10/05/2026
