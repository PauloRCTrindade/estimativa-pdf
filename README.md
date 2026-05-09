# Gerador de Estimativa em PDF

Aplicação web para gerar estimativas de desenvolvimento em PDF, com interface moderna e segura construída com **React + TypeScript + Tailwind CSS + shadcn/ui**.

## 🎯 Objetivo

Esta aplicação permite criar, gerenciar e exportar estimativas de projetos de desenvolvimento em formato PDF, incluindo:
- Timeline visual de desenvolvimento
- Cálculo automático de dias úteis
- Gestão de atividades e etapas
- Histórico de estimativas
- Exportação em PDF
- 🔐 Autenticação segura com Supabase
- 🔐 Autenticação segura com Supabase

## ✨ Refatoração com Shadcn/UI

Este projeto foi completamente refatorado para usar componentes **shadcn/ui**, proporcionando:
- ✅ Interface moderna e profissional
- ✅ Componentes reutilizáveis e tipo-safe
- ✅ Design system consistente
- ✅ Melhor acessibilidade
- ✅ Código mais manutenível

[Veja mais detalhes em REFACTORING.md](./REFACTORING.md)

## 🚀 Quick Start

### Pré-requisitos
- Node.js 20.19+ ou 22.12+
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview de produção
npm run preview

# Lint
npm run lint
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   ├── legend/          # Legenda de cores
│   ├── pdf-preview/     # Preview do PDF
│   ├── section/         # Seções do documento
│   └── time-line/       # Timeline visual
├── data/                # Dados e constantes
├── lib/                 # Utilidades
├── styles/              # Estilos e cores
├── utils/               # Funções auxiliares
├── App.tsx              # Componente principal
└── main.tsx             # Entry point
```

## 🎨 Stack Tecnológico

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 4.2** - Styling
- **shadcn/ui** - Component library
- **Radix UI** - Headless components
- **Lucide React** - Icons
- **html2canvas** - Screenshot to PDF
- **jsPDF** - PDF generation

## 📖 Componentes Principais

### Componentes Shadcn/UI Utilizados
- **Button** - Botões com variantes
- **Card** - Containers estruturados
- **Input** - Campos de entrada
- **Textarea** - Áreas de texto
- **Label** - Rótulos de formulário
- **Separator** - Divisores visuais
- **Badge** - Badges informativos
- **ScrollArea** - Scroll customizado

## 🔧 Configuração

### Tailwind CSS
```js
// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Componentes Shadcn/UI
Adicionar novos componentes:
```bash
npx shadcn add [component-name]
```

## 📝 Desenvolvimento

### Adicionar novo componente shadcn/ui

```bash
npx shadcn add form
npx shadcn add calendar
npx shadcn add select
```

### Adicionar novo componente customizado

Crie em `src/components/seu-componente/index.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card"

export function SeuComponente() {
  return (
    <Card>
      <CardContent>
        Seu conteúdo aqui
      </CardContent>
    </Card>
  )
}
```

## 🎯 Recursos

- ✅ Criação de estimativas
- ✅ Edição de atividades
- ✅ Cálculo automático de duração
- ✅ Gestão de feriados e releases
- ✅ Exportação em PDF
- ✅ Histórico de estimativas
- ✅ Save/Load de templates

## 🔐 Escalabilidade

Para expandir o projeto:

1. **Adicionar validação:** `react-hook-form`
2. **Notificações:** `sonner` ou `react-toastify`
3. **Estado global:** `zustand` ou `redux`
4. **Dark mode:** Tailwind dark mode
5. **Internacionalização:** `i18next`

## 📦 Build

O projeto usa Vite para build otimizado:

```bash
npm run build
# Saída em dist/
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
