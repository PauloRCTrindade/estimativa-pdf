-- Adicionar colunas de timestamp se não existirem
ALTER TABLE estimativas
ADD COLUMN IF NOT EXISTS criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS atualizadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualizar registros existentes se as colunas forem adicionadas
UPDATE estimativas 
SET criadoEm = NOW(), atualizadoEm = NOW()
WHERE criadoEm IS NULL OR atualizadoEm IS NULL;
