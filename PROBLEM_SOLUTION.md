# 🔧 Problema: Faltam Colunas na Tabela

O erro mostra que a tabela `estimativas` existe, mas falta a coluna `criadoEm`.

## ✅ Solução Rápida (2 minutos)

### Opção 1: Completar a Tabela (Recomendado)

1. Acesse: https://app.supabase.com
2. SQL Editor → New Query
3. **Cole o conteúdo do arquivo `fix-table.sql`** 
4. Clique em **RUN**
5. Depois execute:
   ```bash
   npm run setup:db
   ```

### Opção 2: Recriar do Zero

Se preferir começar do zero:

1. Acesse: https://app.supabase.com
2. SQL Editor → New Query
3. Execute isto:
   ```sql
   DROP TABLE IF EXISTS estimativas CASCADE;
   ```
4. Depois execute o arquivo `database.sql` completo

---

## 📋 Qual Opção Escolher?

**Opção 1 (Completar)** se:
- ✅ Quer manter os dados existentes
- ✅ Quer resolver rápido
- ✅ Recomendado para a maioria dos casos

**Opção 2 (Recriar)** se:
- ✅ Não há dados importantes na tabela
- ✅ Quer começar limpo
- ✅ Garantir 100% que está correto

---

## 🧪 Depois de Executar

Teste a API:
```bash
curl http://localhost:3000/api/estimativas
```

Deve retornar: `[]` (array vazio)

Se retornar erro, execute `npm run setup:db` de novo para verificar.

---

## 📁 Arquivos Relevantes

- `database.sql` - Schema completo
- `fix-table.sql` - Apenas as correções
- `show-sql.js` - Script para mostrar o SQL

---

## 🚀 Depois que funcionar

```bash
# Terminal 1
npm run dev

# Terminal 2  
npm run dev:api

# Terminal 3
npm run dev:all (combina os dois)
```
