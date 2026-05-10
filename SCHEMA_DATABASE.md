# 📊 Schema do Banco de Dados - Estimativas

## ⚠️ IMPORTANTE: Nomes das Colunas em Lowercase

O banco de dados PostgreSQL no Supabase usa **colunas em lowercase sem separadores**:

| Campo | Tipo | Obrigatório | Padrão |
|-------|------|-------------|--------|
| `id` | UUID | ✅ | gen_random_uuid() |
| `titulo` | TEXT | ✅ | - |
| `arquiteto` | TEXT | ✅ | - |
| `inicio` | DATE | ✅ | - |
| `releasealvo` | DATE | ✅ | - |
| `feriados` | TEXT | ❌ | NULL |
| `releases` | TEXT | ❌ | NULL |
| `premissas` | TEXT | ❌ | NULL |
| `restricoes` | TEXT | ❌ | NULL |
| `observacoes` | TEXT | ❌ | NULL |
| `pontos` | TEXT | ❌ | NULL |
| `chgdias` | INTEGER | ❌ | 0 |
| `esteirapreprod` | TEXT | ❌ | NULL |
| `diasparados` | TEXT | ❌ | NULL |
| `atividades` | JSONB | ❌ | [] |
| `criadoem` | TIMESTAMP | ✅ | NOW() |
| `atualizadoem` | TIMESTAMP | ✅ | NOW() |

## 🔄 Conversão Necessária

Ao enviar dados ao backend, use **lowercase**:

```javascript
// ❌ ERRADO - não funciona
{
  titulo: "Meu Projeto",
  releaseAlvo: "2024-03-15",  // ❌ camelCase
  chgDias: 2                   // ❌ camelCase
}

// ✅ CORRETO - funciona
{
  titulo: "Meu Projeto",
  releasealvo: "2024-03-15",  // ✅ lowercase
  chgdias: 2                   // ✅ lowercase
}
```

## 📝 Exemplo de Criação

```bash
curl -X POST http://localhost:3000/api/estimativas \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Estimativa de Projeto",
    "arquiteto": "João Silva",
    "inicio": "2024-01-15",
    "releasealvo": "2024-03-15",
    "feriados": "Carnaval",
    "releases": "v1.0",
    "premissas": "Equipe completa disponível",
    "restricoes": "Nenhuma",
    "observacoes": "Projeto crítico",
    "pontos": "21",
    "chgdias": 2,
    "esteirapreprod": "Sim",
    "diasparados": "0",
    "atividades": [
      {
        "descricao": "Análise",
        "dias": 3,
        "recurso": "Analista"
      }
    ]
  }'
```

## 🔧 Update do Backend (Se Necessário)

Se você quiser manter o frontend em camelCase e converter automaticamente no backend, adicione conversores:

```javascript
// dev-server.js
function camelToLowercase(obj) {
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    converted[lowerKey] = value;
  }
  return converted;
}

// POST
app.post('/api/estimativas', async (req, res) => {
  const convertedBody = camelToLowercase(req.body);
  const { data, error } = await supabase
    .from('estimativas')
    .insert([convertedBody])
    .select()
    .single();
  // ...
});
```

## ✅ Testes Passando

- ✅ Criar estimativa
- ✅ Listar estimativas
- ✅ Validar dados salvos
- ✅ Timestamps (criadoem, atualizadoem)
- ✅ Atividades (JSONB)

## 📚 Relacionados

- [test-save-backend.js](test-save-backend.js) - Teste de salvamento
- [dev-server.js](dev-server.js) - Servidor de desenvolvimento
- [database.sql](database.sql) - Schema SQL
