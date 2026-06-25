# AGENTS.md — Guia para Agentes de Código

Este documento descreve a arquitetura, convenções e fluxos do projeto `estimativa-pdf`, com base no conteúdo real dos arquivos do repositório. A linguagem principal do projeto é o **português brasileiro** (nomenclatura de domínio, documentação e comentários).

Leia este arquivo antes de fazer qualquer alteração de código. Ele substitui qualquer versão anterior.

---

## Visão Geral do Projeto

`estimativa-pdf` é uma aplicação web para criar, gerenciar e exportar estimativas de projetos de desenvolvimento em PDF. A aplicação possui duas grandes áreas:

1. **Estimativa**: formulário com informações do projeto, detalhamento de pacotes e atividades, documento com premissas/restricoes/pontos, visão geral com timeline visual colorida e salvamento no Supabase.
2. **Kanban**: quadro de acompanhamento de tarefas vinculado às estimativas, com colunas, cards, tarefas aninhadas, templates, arquivamento e filtros.

Funcionalidades principais:
- Formulário de estimativa com datas, releases, feriados, atividades e pacotes de trabalho.
- Cálculo automático de dias úteis, considerando feriados, releases, dias parados, esteira de pré-produção e janelas de CHG.
- Timeline visual colorida e exportação do documento em PDF via `html2canvas` + `jsPDF`.
- Histórico de estimativas com busca por arquiteto/título.
- Quadro Kanban para acompanhamento de tarefas vinculado às estimativas.
- Autenticação por email/senha via Supabase Auth.

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19.2.5 + TypeScript ~6.0.2 |
| Build Tool | Vite 8.0.10 |
| Estilos | Tailwind CSS 4.2.4 + PostCSS (`@tailwindcss/postcss`) |
| Componentes UI | shadcn/ui 4.7.0 (style: `radix-nova`, baseColor: `neutral`, iconLibrary: `lucide`) |
| Ícones | Phosphor Icons (`@phosphor-icons/react`) e Lucide React |
| Fonte | Geist Variable (`@fontsource-variable/geist`) |
| Backend local | Express em `dev-server.js` |
| Backend produção | Vercel Serverless Functions na pasta `api/` |
| Banco de dados | Supabase PostgreSQL |
| Auth | Supabase Auth (`@supabase/supabase-js`) |
| PDF | `html2canvas` 1.4.1 + `jspdf` 4.2.1 |
| Data utility | `date-fns` 4.1.0 |

Node.js requerido: **22.22.2** (definido em `.nvmrc`).

---

## Estrutura de Diretórios

```
├── api/                        # Vercel Serverless Functions (backend em produção)
│   ├── [[...slug]].js          # Roteador central: /api/estimativas, /api/data-masses,
│   │                           # /api/data-mass-columns, /api/data-mass-tags, /api/kanban/*
│   └── lib/
│       ├── supabase.js         # Cliente Supabase para funções serverless
│       ├── auth.js             # verifyAuth, unauthorized, setCorsHeaders
│       └── case-converter.js   # camelToSnakeObj, snakeToCamelObj
├── src/                        # Código-fonte do frontend
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes shadcn/ui (Button, Card, Dialog, etc.)
│   │   ├── auth/               # Login, Signup, AuthPage, ProtectedRoute
│   │   ├── kanban/             # Views, modais e helpers do Kanban
│   │   ├── atividades-list/
│   │   ├── calculo-financeiro/
│   │   ├── date-picker/
│   │   ├── date-range-input/
│   │   ├── date-range-list/
│   │   ├── documentos-exportacao/
│   │   ├── estimativa-historico/
│   │   ├── estimativa-pacotes/
│   │   ├── form-field/
│   │   ├── form-section/
│   │   ├── legend/
│   │   ├── pdf-preview/
│   │   ├── section/
│   │   └── time-line/
│   ├── pages/                  # Páginas/aba da aplicação
│   │   ├── details/
│   │   ├── document/
│   │   ├── financial/
│   │   ├── information/
│   │   ├── kanban/
│   │   ├── overview/
│   │   └── save/
│   ├── features/estimativa/    # Hooks de domínio da estimativa
│   │   ├── useEstimativaForm.ts
│   │   ├── useTimelineCalculations.ts
│   │   ├── usePdfGeneration.ts
│   │   └── useEstimativaCrud.ts
│   ├── hooks/                  # Hooks customizados
│   │   ├── useAuth.ts
│   │   ├── useDragScroll.ts
│   │   ├── useEstimativas.ts
│   │   └── useKanban.ts
│   ├── services/               # Clientes HTTP
│   │   ├── api.ts              # API de estimativas
│   │   └── kanbanApi.ts        # API do Kanban
│   ├── types/                  # Tipos TypeScript globais
│   │   └── index.ts
│   ├── utils/                  # Funções utilitárias
│   │   └── index.ts
│   ├── styles/                 # Cores e estilos inline para PDF
│   │   └── index.ts
│   ├── data/                   # Dados estáticos (releases, feriados 2026)
│   │   └── index.ts
│   ├── lib/utils.ts            # `cn()` do shadcn/ui
│   ├── App.tsx                 # Componente raiz com estado global
│   ├── main.tsx                # Entry point do React
│   └── index.css               # Tailwind + variáveis CSS + dark mode
├── dev-server.js               # Servidor Express local
├── database.sql                # Schema PostgreSQL completo
├── setup-db.js                 # Script de verificação de conexão/schema
├── vercel.json                 # Configuração do deploy na Vercel
├── vite.config.ts              # Configuração do Vite + proxy /api
├── tsconfig.json               # Projeto TypeScript com referências
├── tsconfig.app.json           # Config do app (strict: false)
├── eslint.config.js            # ESLint flat config
├── tailwind.config.js          # Tailwind v4 compat config
├── postcss.config.js           # PostCSS com @tailwindcss/postcss
└── components.json             # Configuração do shadcn/ui
```

---

## Comandos de Build, Teste e Desenvolvimento

Instalação:
```bash
npm install
```

Desenvolvimento:
```bash
npm run dev              # Vite frontend (porta padrão 5177)
npm run dev:api          # Servidor Express API na porta 3003
npm run dev:all          # Frontend + API simultâneos
```

Build e qualidade:
```bash
npm run build            # tsc -b && vite build (gera dist/)
npm run preview          # Preview da build de produção
npm run lint             # ESLint (App.tsx tem regras relaxadas)
```

Testes:
```bash
npm run test:backend        # node test-save-backend.js
npm run test:backend:ts     # npx tsx test-backend-integration.ts
```

Setup:
```bash
npm run setup:db         # Valida conexão e schema no Supabase
```

---

## Convenções de Código

### Idioma
- **Português brasileiro** para nomes de domínio, variáveis e tipos relacionados ao negócio:
  - `titulo`, `arquiteto`, `inicio`, `releaseAlvo`, `feriados`, `premissas`, `atividades`, `pacotes`.
- **Inglês** para termos técnicos: `handler`, `loading`, `error`, `token`, `columns`, `cards`, `tasks`.

### Nomenclatura
- Componentes React: `PascalCase`.
- Hooks customizados: prefixo `use` (ex: `useAuth`, `useEstimativas`).
- Funções de serviço: verbos em português (`listarEstimativas`, `criarEstimativa`, `obterEstimativa`, `atualizarEstimativa`, `deletarEstimativa`).
- Tipos/interfaces: `PascalCase`, preferencialmente com prefixo do domínio (`KanbanCard`, `Estimativa`, `AppForm`).

### Imports
- Use o alias `@/` para tudo dentro de `src/`.
- Exemplos: `import { Button } from "@/components/ui/button";`, `import { cn } from "@/lib/utils";`.
- Configurado em `tsconfig.json` e `vite.config.ts`.

### TypeScript
- O projeto usa `strict: false` e `noImplicitAny: false` em `tsconfig.app.json`.
- Arquivos legados misturam JS sem tipagem. Novos arquivos devem usar tipos.
- `App.tsx` é parcialmente ignorado pelo ESLint com regras reduzidas (`@typescript-eslint/no-unused-vars` off, `react-hooks/exhaustive-deps` off, `react-refresh/only-export-components` off).

### Estilos
- UI geral: Tailwind CSS + classes shadcn/ui.
- Área de preview do PDF mantém estilos inline (`CSSProperties` em `src/styles/index.ts`) para compatibilidade com `html2canvas`/`jsPDF`.
- Cores no PDF devem ser HEX (ex: `#10b981`) — `oklch` causa erro no `html2canvas`. A função `assertHexColor` valida isso em `src/utils/index.ts`.

---

## Banco de Dados e Convenções de Schema

### Tabelas principais
- `estimativas` — dados das estimativas.
- `kanban_columns` — colunas do quadro Kanban.
- `kanban_cards` — cards do quadro Kanban.
- `kanban_tasks` — tarefas aninhadas dos cards.

### Regra crítica: lowercase vs camelCase
O PostgreSQL do Supabase usa **colunas em lowercase sem separadores**:
- `releasealvo`, `chgdias`, `esteirapreprod`, `diasparados`, `criadoem`, `atualizadoem`, `columnid`, `estimateid`, `parentid`, `cardid`, `duedate`.

O frontend trabalha em **camelCase**:
- `releaseAlvo`, `chgDias`, `esteiraPreProd`, `diasParados`, `criadoEm`, `atualizadoEm`, `columnId`, `estimateId`, `parentId`, `cardId`, `dueDate`.

**Sempre mantenha a conversão nos handlers de API.** As rotas possuem conversores, mas a implementação varia por arquivo:
- `api/[[...slug]].js` (roteador central): usa `estimativaCamelToLowercase` (`.toLowerCase()` em todas as chaves) e `estimativaLowercaseToCamel` (mapeamento explícito de chaves conhecidas) nas operações de `estimativas`.
- `api/lib/case-converter.js`: exporta `camelToSnakeObj` e `snakeToCamelObj` usados pelas rotas do Kanban (`api/kanban/`).
- `dev-server.js`: usa `camelToSnakeCase` (conversão real com underscore) para estimativas e `toCamelKanban` (com `kanbanKeyMap`) para Kanban.

- Campos especiais JSONB: `pacotes` (estimativa) e `cronograma_real` (card do Kanban) devem preservar sua estrutura interna em camelCase — **nunca converter recursivamente**. O handler de cards dentro do roteador central (`api/[[...slug]].js`) e `dev-server.js` extraem `cronogramaReal` antes de aplicar `camelToSnake` e o reinstalam no payload para preservar as chaves internas.

### Schema SQL
O schema completo está em `database.sql`. Ele inclui:
- Triggers `BEFORE UPDATE` para atualizar `atualizado_em`.
- Índices para `criado_em`, `release_alvo`, `column_id`, `card_id`, `parent_id`.
- RLS (Row Level Security) habilitado com políticas abertas (`"Allow all"`) no momento.

---

## Arquitetura da API

### Ambiente de desenvolvimento local
- O frontend (`npm run dev`) roda em uma porta Vite (ex: `5177`).
- A API local (`npm run dev:api`) roda na porta `3003` via `cross-env PORT=3003`.
- `vite.config.ts` faz proxy de `/api` para `http://localhost:3003`.
- `src/services/api.ts` monta a URL base a partir de `VITE_API_URL`:
  - se vazio, usa `/api`;
  - se terminar com `/api`, usa como está;
  - senão, concatena `/api`.

### Ambiente de produção (Vercel)
- O frontend é servido pelo Vercel a partir de `dist/`.
- As rotas serverless ficam em `api/` e são acessadas em `/api/*`.
- **NÃO configure `VITE_API_URL=/api` no Vercel.** Deixe a variável vazia ou não a defina, para evitar URLs duplicadas como `/api/api/estimativas`.

### Endpoints disponíveis
```
GET    /api/estimativas                listar com filtros opcionais (?arquiteto=&titulo=)
POST   /api/estimativas                criar
GET    /api/estimativas/:id            obter uma
PUT    /api/estimativas/:id            atualizar
DELETE /api/estimativas/:id            deletar
GET    /api/kanban/board               board completo
GET    /api/kanban/columns             listar colunas
POST   /api/kanban/columns             criar coluna
PUT    /api/kanban/columns/:id         atualizar coluna
DELETE /api/kanban/columns/:id         deletar coluna
GET    /api/kanban/cards               listar cards
POST   /api/kanban/cards               criar card
PUT    /api/kanban/cards/:id           atualizar card
DELETE /api/kanban/cards/:id           deletar card
GET    /api/kanban/tasks               listar tasks
POST   /api/kanban/tasks               criar task
PUT    /api/kanban/tasks/:id           atualizar task
DELETE /api/kanban/tasks/:id           deletar task
```

### Autenticação nas requisições
- Os serviços em `src/services/*.ts` aceitam um `token?: string` opcional.
- O token é obtido via `useAuth().getToken()`, que recupera o `access_token` da sessão Supabase.
- Enviado no header `Authorization: Bearer <token>`.
- Nos handlers serverless (`api/`), as rotas de mutação (POST, PUT, DELETE) exigem autenticação via `verifyAuth`. As rotas GET são públicas no momento.
- O `dev-server.js` não exige autenticação (uso local apenas).

### Comportamento especial do backend local
`dev-server.js` implementa `safeEstimativaInsert` e `safeEstimativaUpdate`, que tentam inserir/atualizar no Supabase e removem automaticamente campos desconhecidos caso o erro indique `Could not find the '...' column`. Esse mecanismo existe para lidar com diferenças entre o payload enviado e o schema real.

---

## Autenticação

A autenticação é feita via **Supabase Auth** com provedor Email/Password.

Componentes:
- `src/hooks/useAuth.ts` — hook com `login`, `signup`, `logout`, `resetPassword`, `checkAuth`, `getToken`.
- `src/components/auth/Login.tsx` — tela de login.
- `src/components/auth/Signup.tsx` — tela de criação de conta.
- `src/components/auth/AuthPage.tsx` — alternador entre login/signup.
- `src/components/auth/ProtectedRoute.tsx` — envolve rotas protegidas e exibe header com logout.

Variáveis de ambiente necessárias (frontend):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Para associar estimativas a um usuário no futuro, adicione `user_id` à tabela `estimativas` e atualize as RLS policies.

---

## Testes

### Testes automatizados de backend
- `test-save-backend.js` — cria, lista e valida uma estimativa via API local.
- `test-backend-integration.ts` — versão TypeScript do teste de integração.

### Auto-testes do frontend
- `src/utils/index.ts` exporta `runSelfTests()`, que executa `console.assert` sobre datas, feriados, releases, cores e normalização de atividades.
- Chamado em `App.tsx` ao carregar: `if (typeof window !== "undefined") runSelfTests();`.

### Testes manuais recomendados
- Criar/listar/editar/deletar estimativa.
- Verificar se a timeline respeita feriados, releases e dias parados.
- Exportar PDF e conferir renderização.
- Kanban: criar colunas, cards, tarefas e mover cards entre colunas.

---

## Deploy

O deploy padrão é na **Vercel**:
- `vercel.json` define `buildCommand`, `devCommand` e `outputDirectory: "dist"`. O roteamento `/api/*` é feito automaticamente pelas Serverless Functions da pasta `api/`, sem rewrites manuais.
- O build gera a pasta `dist/`.
- As variáveis de ambiente do Supabase devem estar configuradas no dashboard da Vercel.

Checklist de variáveis obrigatórias no Vercel:
```
SUPABASE_URL
SUPABASE_ANON_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
# VITE_API_URL deve ficar VAZIA ou não ser definida
```

---

## Segurança

- O projeto usa RLS no Supabase, mas atualmente com políticas abertas (`"Allow all"`).
- A `SUPABASE_ANON_KEY` e `VITE_SUPABASE_ANON_KEY` são seguras para o frontend.
- Tokens JWT de autenticação são gerenciados pelo Supabase e armazenados automaticamente.
- O `dev-server.js` lê variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) e não possui credenciais hardcoded. Sempre prefira variáveis de ambiente.
- O CORS está configurado tanto no `dev-server.js` quanto em `api/lib/auth.js`, permitindo origins locais e `process.env.FRONTEND_URL`/`VERCEL_URL` em produção.
- **Nunca commite arquivos `.env`, `.env.local` ou `.env.production`** — eles contêm credenciais e já estão no `.gitignore`.

---

## Arquivos de Referência Importantes

- `database.sql` — schema completo do PostgreSQL.
- `SCHEMA_DATABASE.md` — documentação detalhada do schema e conversão lowercase/camelCase.
- `SETUP_BACKEND.md` — guia passo a passo de configuração do Supabase.
- `BACKEND_SUMMARY.md` — resumo do backend local e Vercel.
- `AUTH_GUIDE.md` / `AUTH_SUMMARY.md` — documentação completa de autenticação.
- `CORS_FIX_GUIDE.md` — resolução de problemas CORS.
- `VERCEL_FIX_API_URL.md` — correção do problema `/api/api` em produção.
- `VERCEL_SETUP.md` — configuração das variáveis de ambiente na Vercel.
- `SCRIPTS.md` — guia de comandos npm.
- `REFACTORING.md` — histórico da refatoração para shadcn/ui.

---

## Cronograma real no Gerenciador de Impacto

O card do Kanban possui um cronograma de execução real, independente da estimativa original:

- Campo em `kanban_cards`: `cronograma_real` (JSONB) armazena uma cópia dos `Pacote[]` da estimativa, com datas/horas/overtime remanejados pelo usuário.
- Campo em `kanban_cards`: `real_production_date` (DATE) armazena a data de subida em produção definida no contexto real do card. Inicialmente é igual a `estimativas.release_alvo`, mas pode ser ajustada independentemente dentro do Gerenciador de Impacto.
- A tabela de remanejamento real está em `src/components/kanban/shared/RealScheduleTable.tsx`.
- A lógica de cálculo de datas, overtime e dias úteis foi extraída para `src/utils/schedule.ts` e é compartilhada com a tela Detalhamento (`src/components/estimativa-pacotes`).
- O calendário real (`buildRealCalendar` em `src/components/kanban/shared/kanbanHelpers.ts`) utiliza o `cronogramaReal` quando existir e a `realProductionDate` como data de produção real; caso contrário, mantém o comportamento anterior de offset simples.
- O comparativo estimado × real (`calcScheduleComparison` em `src/components/kanban/shared/kanbanHelpers.ts`) utiliza `realProductionDate` para calcular a janela de CHG, os alertas de risco e a diferença entre término real e produção real. O lado estimado continua usando `estimate.releaseAlvo`.
- Templates não possuem Gerenciador de Impacto. Cards arquivados exibem a tabela em modo leitura.

### Camada utilitária de schedule

`src/utils/schedule.ts` centraliza funções puras de cálculo de cronograma:

- Tipos: `Pacote`, `PacoteAtividade`, `OvertimeFlags`, `ParadoRange`.
- Cálculo de datas: `calcularTermino`, `calcWorkDays`.
- Cálculo de overtime: `calcDiasOvertimeTotal`, `calcTombamentosWorkedCount`.
- Cálculo de dias de atuação: `calcDiasAtuacaoTotal`, `calcTotalDiasAtuacaoPacote`.
- Helpers de dias especiais: `calcFeriadosNoPeriodo`, `calcFimDeSemanaNoPeriodo`, `calcTombamentosNoPeriodo`, `getInicioDayType`.
- Inicialização do real: `initializeRealSchedule`, `rebuildRealScheduleFromEstimate`.

Novos cálculos de cronograma devem ser adicionados nesse arquivo e reutilizados pelas telas de Estimativa e de Kanban.

---

## Dicas para Agentes

- Sempre verifique se a alteração em APIs afeta a conversão lowercase/camelCase. Lembre-se de que a implementação do conversor varia entre `api/estimativas/`, `api/lib/case-converter.js` e `dev-server.js`.
- Ao adicionar novos campos no banco, atualize `database.sql`, os conversores em `api/` e os tipos em `src/types/index.ts`.
- Novos componentes de UI devem preferir componentes de `src/components/ui/`. Use `cn()` para mesclar classes.
- Para PDF, mantenha cores em HEX e estilos inline quando necessário.
- Ao adicionar rotas de API, siga o padrão de CORS já existente nos handlers (`setCorsHeaders` + `OPTIONS` preflight).
- Não altere `App.tsx` de forma a quebrar as regras relaxadas do ESLint sem atualizar `eslint.config.js`.
- Os campos JSONB `pacotes` e `cronograma_real` devem preservar chaves internas em camelCase — nunca aplique conversão recursiva de camelCase neles.
- `dev-server.js` roda na porta 3003 via `npm run dev:api`, enquanto `vite.config.ts` espera o proxy em `localhost:3003`.
