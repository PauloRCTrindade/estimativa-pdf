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

-- ================================
-- TABELAS DO KANBAN
-- ================================

CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES estimativas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  description TEXT,
  tags TEXT[],
  due_date DATE,
  priority TEXT CHECK (priority IN ('p1','p2','p3','p4')),
  assignee TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  is_default_template BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT CHECK (priority IN ('p1','p2','p3','p4')),
  assignee TEXT,
  due_date DATE,
  tags TEXT[],
  checklist JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  position INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices Kanban
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_card ON kanban_tasks(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_parent ON kanban_tasks(parent_id);

-- Triggers de updated_at para Kanban
CREATE TRIGGER trigger_update_kanban_columns
BEFORE UPDATE ON kanban_columns
FOR EACH ROW
EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER trigger_update_kanban_cards
BEFORE UPDATE ON kanban_cards
FOR EACH ROW
EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER trigger_update_kanban_tasks
BEFORE UPDATE ON kanban_tasks
FOR EACH ROW
EXECUTE FUNCTION update_atualizado_em();

-- ================================
-- RLS (Row Level Security)
-- ================================

ALTER TABLE estimativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (mesmo padrão)
DROP POLICY IF EXISTS "Allow all" ON estimativas;
DROP POLICY IF EXISTS "Allow all" ON kanban_columns;
DROP POLICY IF EXISTS "Allow all" ON kanban_cards;
DROP POLICY IF EXISTS "Allow all" ON kanban_tasks;

CREATE POLICY "Allow all" ON estimativas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON kanban_columns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON kanban_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON kanban_tasks FOR ALL USING (true) WITH CHECK (true);
