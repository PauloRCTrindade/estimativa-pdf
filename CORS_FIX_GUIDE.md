# Guia de Resolução de Erro CORS em Produção

## Problema
Erro: `Requisição cross-origin bloqueada: A diretiva Same Origin não permite a leitura do recurso remoto em http://localhost:3000/api/estimativas`

## Causas
1. A aplicação está tentando acessar `http://localhost:3000` de um domínio diferente
2. `VITE_API_URL` não está configurada em produção
3. CORS não está configurado corretamente no backend

## Soluções

### 1. Para Desenvolvimento Local

O `vite.config.ts` foi atualizado com proxy automático:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

Execute:
```bash
npm run dev:all  # Executa frontend e backend simultaneamente
```

### 2. Para Produção no Vercel

#### Passo 1: Configurar a URL da API
Se sua API está no Vercel, crie dois projetos:
- **Frontend**: seu-app.vercel.app
- **Backend**: seu-api.vercel.app

Se usar um único projeto Vercel com API em `/api`:
```bash
VITE_API_URL=https://seu-app.vercel.app
```

#### Passo 2: Adicionar Variáveis de Ambiente no Vercel
1. Acesse: Vercel Dashboard > Seu Projeto > Settings > Environment Variables
2. Adicione:
   ```
   VITE_API_URL=https://seu-app.vercel.app
   (ou a URL correta da sua API)
   ```

#### Passo 3: Configurar CORS no Backend
O `dev-server.js` foi atualizado com CORS específico:
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',     // Desenvolvimento local
      'https://seu-app.vercel.app', // Produção
      process.env.FRONTEND_URL,     // Variável de ambiente
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS não permitido'));
    }
  },
  credentials: true,
};
```

### 3. Se a API Está em Outro Servidor

Se o backend está em um servidor separado (ex: servidor Node externo):

1. Atualize o backend para aceitar requests de seus domínios:
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://seu-app.vercel.app',
    'https://seu-dominio.com',
  ],
  credentials: true,
}));
```

2. Configure `VITE_API_URL` em Vercel:
```
VITE_API_URL=https://seu-api-dominio.com
```

### 4. Checklist de Verificação

- [ ] `VITE_API_URL` está configurada em `.env.production`
- [ ] Variável de ambiente `VITE_API_URL` foi adicionada no Vercel
- [ ] CORS está habilitado no backend para seu domínio de produção
- [ ] Frontend URL corresponde ao domínio do Vercel
- [ ] Backend URL está acessível publicamente

### 5. Testar em Produção

Após fazer deploy:
1. Abra DevTools (F12) > Console
2. Procure por mensagens de erro CORS
3. Verifique que `VITE_API_URL` está com o valor correto (veja em Network > XHR)

## Arquivos Modificados
- `vite.config.ts` - Adicionado proxy para desenvolvimento
- `dev-server.js` - CORS específico configurado
- `.env` - Adicionada `VITE_API_URL`
- `.env.production` - Criado com instruções para produção

## Próximos Passos
1. Configure `VITE_API_URL` no Vercel Dashboard
2. Faça deploy novamente
3. Teste a aplicação em produção
