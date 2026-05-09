#!/bin/bash

# Script para executar setup do backend
# Uso: ./run-setup.sh

echo "🚀 Iniciando setup do backend..."
echo ""

# Detectar Node version
NODE_VERSION=$(node --version)
echo "Node version: $NODE_VERSION"

# Se estiver rodando com Node 18, avisar
if [[ $NODE_VERSION == v18.* ]]; then
    echo "⚠️  Detectado Node 18, Supabase recomenda Node 20+"
    if command -v nvm &> /dev/null; then
        echo "ℹ️  Tentando usar Node 22..."
        source ~/.nvm/nvm.sh
        nvm use 22.22.2 || true
    fi
fi

# Executar setup-db.js
echo ""
echo "Executando setup database..."
node setup-db.js

echo ""
echo "✅ Pronto!"
echo ""
echo "📝 Verificar:"
echo "  - .env.local está configurado? (SUPABASE_URL e SUPABASE_ANON_KEY)"
echo "  - SQL foi executado no Supabase? (https://app.supabase.com)"
echo "  - API está rodando? (node dev-server.js)"
echo ""
echo "🧪 Testar API:"
echo "  curl http://localhost:3000/api/estimativas"
