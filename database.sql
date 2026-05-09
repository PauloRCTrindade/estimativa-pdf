-- Criar tabela de estimativas
CREATE TABLE estimativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas
  titulo TEXT NOT NULL,
  arquiteto TEXT NOT NULL,
  inicio DATE NOT NULL,
  releaseAlvo DATE NOT NULL,
  
  -- Dados da estimativa
  feriados TEXT,
  releases TEXT,
  premissas TEXT,
  restricoes TEXT,
  observacoes TEXT,
  pontos TEXT,
  
  -- Configurações
  chgDias INTEGER DEFAULT 0,
  esteiraPreProd TEXT,
  diasParados TEXT,
  
  -- Atividades (armazenadas como JSON)
  atividades JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para melhor performance
  CONSTRAINT titulo_not_empty CHECK (titulo <> ''),
  CONSTRAINT arquiteto_not_empty CHECK (arquiteto <> '')
);

-- Criar índices
CREATE INDEX idx_estimativas_criadoEm ON estimativas(criadoEm DESC);
CREATE INDEX idx_estimativas_releaseAlvo ON estimativas(releaseAlvo);

-- Criar trigger para atualizar atualizadoEm automaticamente
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

-- Habilitar RLS (Row Level Security) - opcional, para controle de acesso
ALTER TABLE estimativas ENABLE ROW LEVEL SECURITY;

-- Política pública (remova se quiser adicionar autenticação depois)
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
