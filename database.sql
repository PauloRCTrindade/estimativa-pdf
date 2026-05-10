-- Criar tabela de estimativas
CREATE TABLE IF NOT EXISTS estimativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas
  titulo TEXT NOT NULL,
  arquiteto TEXT NOT NULL,
  inicio DATE NOT NULL,
  release_alvo DATE NOT NULL,
  
  -- Dados da estimativa
  feriados TEXT,
  releases TEXT,
  premissas TEXT,
  restricoes TEXT,
  observacoes TEXT,
  pontos TEXT,
  
  -- Configurações
  chg_dias INTEGER DEFAULT 0,
  esteira_pre_prod TEXT,
  dias_parados TEXT,
  
  -- Atividades (armazenadas como JSON)
  atividades JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para melhor performance
  CONSTRAINT titulo_not_empty CHECK (titulo <> ''),
  CONSTRAINT arquiteto_not_empty CHECK (arquiteto <> '')
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_estimativas_criado_em ON estimativas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_estimativas_release_alvo ON estimativas(release_alvo);

-- Criar trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_atualizado_em ON estimativas;

CREATE TRIGGER trigger_update_atualizado_em
BEFORE UPDATE ON estimativas
FOR EACH ROW
EXECUTE FUNCTION update_atualizado_em();

-- Habilitar RLS (Row Level Security) - opcional, para controle de acesso
ALTER TABLE estimativas ENABLE ROW LEVEL SECURITY;

-- Política pública (remova se quiser adicionar autenticação depois)
DROP POLICY IF EXISTS "Enable read access for all users" ON estimativas;
DROP POLICY IF EXISTS "Enable insert for all users" ON estimativas;
DROP POLICY IF EXISTS "Enable update for all users" ON estimativas;
DROP POLICY IF EXISTS "Enable delete for all users" ON estimativas;

CREATE POLICY "Enable read access for all users" ON estimativas
AS PERMISSIVE FOR SELECT
USING (true);

CREATE POLICY "Enable insert for all users" ON estimativas
AS PERMISSIVE FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON estimativas
AS PERMISSIVE FOR UPDATE
USING (true);

CREATE POLICY "Enable delete for all users" ON estimativas
AS PERMISSIVE FOR DELETE
USING (true);
