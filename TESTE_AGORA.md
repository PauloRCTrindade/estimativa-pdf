# 🚀 Ative o Backend em 2 Passos

## ✅ Passo 1: Executar SQL no Supabase

Acesse: https://app.supabase.com

1. Vá para seu projeto **estimativa-pdf**
2. No menu esquerdo, clique em **SQL Editor**
3. Clique em **New Query**
4. **Cole todo o conteúdo do arquivo `database.sql`**
5. Clique em **Run** (botão verde)
6. Aguarde a mensagem de sucesso ✅

**Importante**: O SQL criará:
- Tabela `estimativas`
- Índices para performance
- Trigger automático para `atualizadoEm`
- RLS policies (políticas de acesso)

---

## ✅ Passo 2: Testar API Localmente

### 2.1 Inicie o servidor
```bash
npm run dev
```

Você deve ver algo como:
```
➜  Local:   http://localhost:5176/
```

### 2.2 Teste o endpoint (abra outro terminal)

**GET (listar vazios):**
```bash
curl http://localhost:3000/api/estimativas
```

Resposta esperada:
```json
[]
```

**POST (criar uma estimativa):**
```bash
curl -X POST http://localhost:3000/api/estimativas \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Teste API",
    "arquiteto": "João Silva",
    "inicio": "2026-05-01",
    "releaseAlvo": "2026-05-15",
    "pontos": "21"
  }'
```

Resposta esperada (com ID gerado):
```json
{
  "id": "xxx-xxx-xxx",
  "titulo": "Teste API",
  "arquiteto": "João Silva",
  ...
  "criadoEm": "2026-05-09T..."
}
```

### 2.3 Verifique no Supabase

Volte ao dashboard Supabase e vá em **Table Editor**. Você deve ver a estimativa criada!

---

## 🎉 Pronto!

Seu backend está funcionando! Agora você pode:

✅ Salvar estimativas no banco  
✅ Listar estimativas antigas  
✅ Editar estimativas existentes  
✅ Deletar estimativas  

---

## 📝 Próximas Ações

1. Integrar a hook `useEstimativas` no seu `App.tsx`
2. Adicionar botão "Salvar Estimativa"
3. Adicionar página de histórico
4. Deploy no Vercel (com as mesmas env vars)

Veja `EXEMPLO_USO.tsx` para um exemplo prático!
