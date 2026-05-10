# ⚠️ AÇÃO URGENTE: Corrigir /api/api no Vercel

## Problema Atual
A aplicação ainda está chamando `/api/api/estimativas` resultando em 404.

## Causa
Você pode ter configurado `VITE_API_URL=/api` no Vercel Dashboard, o que duplica o /api.

## Solução - Siga os Passos:

### 1. Acesse Vercel Dashboard
- URL: https://vercel.com
- Seu projeto: `estimativa-pdf`
- Vá para: **Settings > Environment Variables**

### 2. REMOVA ou CORRIJA as variáveis

**❌ NÃO deixe assim:**
```
VITE_API_URL = /api       ← REMOVA ou deixe em branco!
VITE_API_URL = http://localhost:3000/api  ← NÃO isso!
```

**✅ DEIXE assim:**
```
VITE_API_URL = (vazio/em branco - NÃO configure, ou deixe string vazia)
```

**As únicas variáveis que DEVEM estar no Vercel:**
```
SUPABASE_URL = https://zhsdfjmagcpayeemijkb.supabase.co
SUPABASE_ANON_KEY = sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE
VITE_SUPABASE_URL = https://zhsdfjmagcpayeemijkb.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE
```

### 3. Se VITE_API_URL existe:
- **Clique no X para remover** ou
- **Deixe o valor vazio** (se for string vazia, vai funcionar)

### 4. Salve e Aguarde Redeploy
- Vercel redeploy automaticamente
- Leva ~1-2 minutos

### 5. Force Limpeza de Cache
- DevTools (F12) > Console
- Cole e execute:
```javascript
console.log('🔧 API_BASE configurado:', API_BASE);
```
- Você verá qual URL está sendo usada

## Por que Isso Funciona?

Novo código em `src/services/api.ts`:
```typescript
const buildApiBase = () => {
  const apiUrl = import.meta.env.VITE_API_URL?.trim() || '';
  
  if (!apiUrl) {
    return '/api';  // ← Produção: /api
  }
  
  if (apiUrl.endsWith('/api')) {
    return apiUrl;  // ← Já tem /api, não duplica
  }
  
  return `${apiUrl}/api`;  // ← Dev: http://localhost:3000/api
};
```

## Checklist Final

- [ ] Acessei Vercel Dashboard
- [ ] Removi ou deixei VITE_API_URL em branco
- [ ] Mantive apenas as 4 variáveis Supabase
- [ ] Cliquei Save
- [ ] Aguardei redeploy
- [ ] Limpei cache do browser
- [ ] Testei a app

## Se Continuar com Erro

1. **Força redeploy:** Dashboard > Deployments > último deploy > 3 pontos > Redeploy
2. **Verifica logs:** Dashboard > Deployments > último deploy > Logs
3. **Procura por:** "API_BASE" no console
4. **Se vir:** `/api` = Correto ✓
5. **Se vir:** `/api/api` = Ainda falta corrigir Vercel ✗

---

**Tempo estimado:** 2-3 minutos  
**Status:** Deploy do código já foi, aguardando você corrigir Vercel
