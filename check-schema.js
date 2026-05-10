/**
 * Script para verificar as colunas da tabela estimativas
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhsdfjmagcpayeemijkb.supabase.co';
const supabaseKey = 'sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Verificando schema da tabela estimativas...\n');

  try {
    // Tentar listar uma estimativa para ver o schema
    const { data, error } = await supabase
      .from('estimativas')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao acessar tabela:', error.message);
      
      // Tentar listar as tabelas disponíveis
      console.log('\n📋 Tentando listar tabelas disponíveis...');
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Primeira estimativa encontrada:');
      console.log('\n📊 Colunas disponíveis:');
      Object.keys(data[0]).forEach(col => {
        console.log(`  - ${col}: ${typeof data[0][col]}`);
      });
    } else {
      console.log('⚠️  Nenhuma estimativa encontrada, mas tabela existe.');
      console.log('\n✅ Testando inserção com dados camelCase...');
      
      const testData = {
        titulo: 'Teste Schema',
        arquiteto: 'Tester',
        inicio: '2024-01-15',
        releaseAlvo: '2024-03-15',
        feriados: 'Nenhum',
        releases: 'v1.0',
        premissas: 'teste',
        restricoes: 'nenhuma',
        observacoes: 'teste',
        atividades: [],
        pontos: '5'
      };

      const { data: created, error: insertError } = await supabase
        .from('estimativas')
        .insert([testData])
        .select();

      if (insertError) {
        console.error('\n❌ Erro ao inserir:', insertError.message);
        console.log('\n💡 Tentando com snake_case...');
        
        const snakeCaseData = {
          titulo: 'Teste Schema',
          arquiteto: 'Tester',
          inicio: '2024-01-15',
          release_alvo: '2024-03-15',
          feriados: 'Nenhum',
          releases: 'v1.0',
          premissas: 'teste',
          restricoes: 'nenhuma',
          observacoes: 'teste',
          atividades: [],
          pontos: '5'
        };

        const { data: createdSnake, error: snakeError } = await supabase
          .from('estimativas')
          .insert([snakeCaseData])
          .select();

        if (snakeError) {
          console.error('❌ Erro com snake_case também:', snakeError.message);
        } else {
          console.log('✅ Sucesso com snake_case!');
          console.log('Colunas:', Object.keys(createdSnake[0]));
        }
      } else {
        console.log('✅ Sucesso com camelCase!');
        console.log('Colunas:', Object.keys(created[0]));
      }
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkSchema();
