import { NextResponse } from 'next/server';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST_DPRJ,
  user: process.env.DB_USER_DPRJ,
  password: process.env.DB_PASSWORD_DPRJ,
  database: process.env.DB_NAME_DPRJ,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT_DPRJ),
});

export async function GET(request: Request) {
  console.log('🚀 [Reports/TempoMedioUsuarioCompleto] Iniciando chamada da procedure de tempo médio por usuário completo...');
  
  const { searchParams } = new URL(request.url);
  const ramal = searchParams.get('ramal');
  
  console.log('📋 [Reports/TempoMedioUsuarioCompleto] Parâmetros recebidos:');
  console.log('  📞 Ramal:', ramal);

  if (!ramal) {
    console.error('❌ [Reports/TempoMedioUsuarioCompleto] Parâmetro obrigatório ausente');
    return NextResponse.json(
      { 
        success: false,
        error: 'Parâmetro obrigatório: ramal' 
      },
      { status: 400 }
    );
  }

  console.log('📅 [Reports/TempoMedioUsuarioCompleto] Procedure irá usar data atual automaticamente');

  let conn;
  try {
    console.log('🔗 [Reports/TempoMedioUsuarioCompleto] Obtendo conexão do pool...');
    conn = await pool.getConnection();
    console.log('✅ [Reports/TempoMedioUsuarioCompleto] Conexão obtida com sucesso');
    
    const procedureName = 'sp_tempo_medio_atendimento_por_usuario_completo';
    const procedureParams = [parseInt(ramal)];
    
    console.log('🔧 [Reports/TempoMedioUsuarioCompleto] Preparando chamada da procedure:');
    console.log('  📞 Procedure:', procedureName);
    console.log('  📝 Parâmetros:', procedureParams);
    console.log('📅 [Reports/TempoMedioUsuarioCompleto] Procedure usará data atual automaticamente');

    console.log('⚡ [Reports/TempoMedioUsuarioCompleto] Executando procedure...');
    const startTime = Date.now();
    
    const rows = await conn.query(
      `CALL ${procedureName}(?)`,
      procedureParams
    );
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️ [Reports/TempoMedioUsuarioCompleto] Procedure executada em ${executionTime}ms`);
    
    console.log('📊 [Reports/TempoMedioUsuarioCompleto] Resultado bruto da procedure:');
    console.log('  🔍 Tipo:', typeof rows);
    console.log('  📏 É array:', Array.isArray(rows));
    console.log('  📊 Length:', rows?.length);
    
    // A procedure retorna um array com os resultados
    let data = rows[0] || [];
    
    // Função para converter BigInt para Number
    const convertBigIntToNumber = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj === 'bigint') {
        return Number(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(convertBigIntToNumber);
      }
      
      if (typeof obj === 'object') {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertBigIntToNumber(value);
        }
        return converted;
      }
      
      return obj;
    };
    
    // Converter BigInt para Number nos dados
    data = convertBigIntToNumber(data);
    
    console.log('📋 [Reports/TempoMedioUsuarioCompleto] Dados processados:');
    console.log('  📊 Quantidade de registros:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('  🗂️ Campos do primeiro registro:', Object.keys(data[0]));
      console.log('  📄 Primeiro registro completo:', JSON.stringify(data[0], null, 2));
      console.log('  📄 Último registro completo:', JSON.stringify(data[data.length - 1], null, 2));
    }

    // Verificar se temos dados válidos
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ [Reports/TempoMedioUsuarioCompleto] Nenhum dado retornado pela procedure');
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Nenhum dado encontrado',
        params: {
          ramal
        },
        executionTime
      });
    }

    console.log('✅ [Reports/TempoMedioUsuarioCompleto] Retornando dados com sucesso');
    return NextResponse.json({
      success: true,
      data,
      totalRecords: data.length,
      params: {
        ramal
      },
      executionTime
    });

  } catch (error) {
    console.error('💥 [Reports/TempoMedioUsuarioCompleto] Erro ao executar procedure:', error);
    console.error('📝 [Reports/TempoMedioUsuarioCompleto] Detalhes do erro:');
    if (error instanceof Error) {
      console.error('  🏷️ Nome:', error.name);
      console.error('  💬 Mensagem:', error.message);
      console.error('  🧭 Stack:', error.stack);
    }
    
    // Log adicional para erros do MariaDB
    if (error && typeof error === 'object') {
      console.error('  📊 Código SQL:', (error as any).sqlState || (error as any).code);
      console.error('  🔢 Errno:', (error as any).errno);
      console.error('  📄 SQL Message:', (error as any).sqlMessage);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao executar relatório de tempo médio por usuário completo',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        params: {
          ramal
        }
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      console.log('🔚 [Reports/TempoMedioUsuarioCompleto] Liberando conexão...');
      await conn.release();
      console.log('✅ [Reports/TempoMedioUsuarioCompleto] Conexão liberada');
    }
  }
}