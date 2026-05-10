# 🧪 Guia de Testes - Salvamento no Backend

Este guia explica como testar o salvamento das informações no backend.

## 📋 Testes Disponíveis

### 1. Teste Simples em Node.js
```bash
npm run test:backend
```

**O que testa:**
- ✅ Criar estimativa via POST
- ✅ Verificar se foi salva no banco
- ✅ Listar estimativas
- ✅ Validar dados convertidos corretamente

**Arquivo:** `test-save-backend.js`

### 2. Teste Integrado em TypeScript
```bash
npm run test:backend:ts
```

**O que testa:**
- ✅ Criar estimativa
- ✅ Validar salvamento
- ✅ Listar estimativas
- ✅ Verificar conversão camelCase ↔ snake_case
- ✅ Verificar timestamps (criadoEm, atualizadoEm)
- ✅ Limpeza automática de dados de teste

**Arquivo:** `test-backend-integration.ts`

## 🚀 Antes de Rodar os Testes

1. **Inicie o backend:**
```bash
npm run dev:api
```

2. **Ou inicie tudo de uma vez:**
```bash
npm run dev:all
```

3. **Configure a URL da API (opcional):**
```bash
# Padrão é http://localhost:3000
API_URL=http://localhost:3000 npm run test:backend
```

## 📊 Exemplo de Saída

```
============================================================
🧪 SUITE DE TESTES - SALVAMENTO NO BACKEND
============================================================

✅ Teste 1: Criar Estimativa
   Estimativa criada com ID: 12345

✅ Teste 2: Validar Salvamento
   Estimativa encontrada no banco de dados

✅ Teste 3: Listar Estimativas
   Listadas 42 estimativas

✅ Teste 4: Dados Conversão Case
   Resposta em camelCase correto

✅ Teste 5: Timestamps
   35 estimativas com timestamps

============================================================
📊 RESULTADO: 5/5 testes passaram
============================================================
```

## 🔍 O que cada teste valida

### Criar Estimativa
- Verifica se a requisição POST retorna HTTP 201/200
- Confirma que a resposta contém um ID válido
- Valida que todos os campos foram salvos

### Validar Salvamento
- Faz uma requisição GET para listar estimativas
- Procura pela estimativa criada no passo anterior
- Confirma que não houve perda de dados

### Listar Estimativas
- Verifica se o endpoint GET retorna um array
- Confirma que há estimativas no banco

### Conversão de Case
- Valida que a resposta está em **camelCase**
- Não deve conter underscores (_)
- Exemplo: `criadoEm` e não `criado_em`

### Timestamps
- Verifica se estimativas têm `criadoEm`
- Verifica se estimativas têm `atualizadoEm`
- Valida o formato de data/hora

## 🐛 Troubleshooting

### Erro: "Cannot GET /api/estimativas"
```bash
# O backend não está rodando
npm run dev:api
```

### Erro: "Connection refused"
```bash
# Verifique se o backend está na porta 3000
# Ou configure a URL correta:
API_URL=http://localhost:3001 npm run test:backend
```

### Erro: "Estimativa não encontrada"
- Pode ser um problema no Supabase
- Verifique se a tabela existe: `SELECT * FROM estimativas;`
- Verifique as credenciais no arquivo `.env`

### Teste falha na conversão de case
- Verifique os conversores em `api/estimativas.ts`
- Confirme que `camelToSnake` e `snakeToCamel` estão corretos

## 💡 Dados de Teste

Os testes criam estimativas com dados como:

```typescript
{
  titulo: 'Teste de Salvamento',
  arquiteto: 'Tester',
  inicio: '2024-01-15',
  releaseAlvo: '2024-03-15',
  feriados: 'Sem feriados',
  releases: 'Release 1.0',
  premissas: 'Premissa de teste',
  restricoes: 'Nenhuma restrição',
  observacoes: 'Teste automatizado de salvamento',
  atividades: [
    { descricao: 'Atividade 1', dias: 5, recurso: 'Dev 1' }
  ],
  pontos: '13',
  chgDias: 2,
  esteiraPreProd: 'Sim',
  diasParados: '0'
}
```

## 🧹 Limpeza

O teste TypeScript (`test-backend-integration.ts`) **deleta automaticamente** as estimativas criadas após os testes.

Se precisar limpar manualmente:

```bash
# No Supabase Dashboard
DELETE FROM estimativas WHERE titulo LIKE 'Teste%' OR titulo LIKE '%Test%';
```

## 📝 Próximos Passos

Para testes ainda mais completos, considere adicionar:

- [ ] Testes de atualização (PUT)
- [ ] Testes de deleção (DELETE)
- [ ] Testes de validação de dados
- [ ] Testes de erro e exceções
- [ ] Testes de performance
- [ ] Testes com autenticação

## 🔗 Arquivos Relacionados

- `api/estimativas.ts` - Handler do backend
- `src/services/api.ts` - Serviço de API do frontend
- `test-save-backend.js` - Teste simples
- `test-backend-integration.ts` - Teste integrado
- `src/types/index.ts` - Tipos TypeScript
