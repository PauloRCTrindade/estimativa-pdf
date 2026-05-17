-- Adiciona coluna pacotes à tabela estimativas
-- Execute no Supabase SQL Editor

ALTER TABLE estimativas
ADD COLUMN IF NOT EXISTS pacotes JSONB DEFAULT '[]'::jsonb;
