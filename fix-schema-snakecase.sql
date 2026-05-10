-- Recriar tabela estimativas com snake_case (padrão PostgreSQL/Supabase)
DROP TABLE IF EXISTS estimativas CASCADE;

CREATE TABLE estimativas (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT titulo_not_empty CHECK (titulo <> ''),
  CONSTRAINT arquiteto_not_empty CHECK (arquiteto <> '')
);

-- Criar índices
CREATE INDEX idx_estimativas_created_at ON estimativas(created_at DESC);
CREATE INDEX idx_estimativas_release_alvo ON estimativas(release_alvo);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_updated_at
BEFORE UPDATE ON estimativas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE estimativas ENABLE ROW LEVEL SECURITY;

-- Criar política para SELECT (permitir acesso público para teste)
CREATE POLICY "Public estimativas are viewable by everyone"
  ON estimativas FOR SELECT
  USING (true);

-- Criar política para INSERT (permitir inserts públicos)
CREATE POLICY "Anyone can create estimativas"
  ON estimativas FOR INSERT
  WITH CHECK (true);

-- Criar política para UPDATE (permitir updates públicos)
CREATE POLICY "Anyone can update estimativas"
  ON estimativas FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Criar política para DELETE (permitir deletes públicos)
CREATE POLICY "Anyone can delete estimativas"
  ON estimativas FOR DELETE
  USING (true);
