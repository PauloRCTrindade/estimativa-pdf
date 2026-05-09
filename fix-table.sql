-- SQL para completar a tabela estimativas se estiver incompleta
-- Execute isso se receber erro de "column does not exist"

-- Adicionar colunas se não existirem
ALTER TABLE estimativas ADD COLUMN IF NOT EXISTS criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE estimativas ADD COLUMN IF NOT EXISTS atualizadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_estimativas_criadoEm ON estimativas(criadoEm DESC);
CREATE INDEX IF NOT EXISTS idx_estimativas_releaseAlvo ON estimativas(releaseAlvo);

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_update_atualizadoEm ON estimativas;

CREATE OR REPLACE FUNCTION update_atualizadoEm()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizadoEm = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_atualizadoEm
BEFORE UPDATE ON estimativas
FOR EACH ROW
EXECUTE FUNCTION update_atualizadoEm();

-- Pronto! Agora execute: npm run setup:db
