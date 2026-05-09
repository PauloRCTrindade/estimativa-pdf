-- Script SIMPLES para adicionar as colunas que faltam
-- Cole isto no Supabase SQL Editor e execute

ALTER TABLE estimativas ADD COLUMN criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE estimativas ADD COLUMN atualizadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();
