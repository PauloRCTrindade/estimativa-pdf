#!/bin/bash

# Script de verificação rápida do setup

echo "🔍 Verificando arquivos do backend..."

files=(
  "api/estimativas.ts"
  "api/estimativas/[id].ts"
  "api/lib/supabase.ts"
  "src/services/api.ts"
  "src/hooks/useEstimativas.ts"
  "database.sql"
  "SETUP_BACKEND.md"
  "CHECKLIST.md"
  "EXEMPLO_USO.tsx"
  "vercel.json"
  ".env.example"
)

missing=0

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (FALTANDO)"
    ((missing++))
  fi
done

echo ""
echo "================================"
if [ $missing -eq 0 ]; then
  echo "✅ Todos os arquivos foram criados!"
  echo ""
  echo "📖 Próximos passos:"
  echo "1. Leia: SETUP_BACKEND.md"
  echo "2. Complete: CHECKLIST.md"
  echo "3. Exemplo: EXEMPLO_USO.tsx"
  echo ""
  echo "🚀 Comece criando uma conta Supabase em https://supabase.com"
else
  echo "❌ Faltam $missing arquivo(s)"
fi
echo "================================"
