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
  const startTime = Date.now();
  console.log('🚀 [Reports/Absenteísmo] Iniciando consulta de absenteísmo...');
  
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortOrder = searchParams.get('sortOrder') || 'ASC';
  
  console.log('📋 [Reports/Absenteísmo] Parâmetros recebidos:');
  console.log('  📅 Data inicial:', startDate);
  console.log('  📅 Data final:', endDate);
  console.log('  🔄 Ordenação:', sortOrder);

  let conn;
  try {
    console.log('� [Reports/Absenteísmo] Obtendo conexão do pool...');
    conn = await pool.getConnection();
    console.log('✅ [Reports/Absenteísmo] Conexão obtida com sucesso');

    console.log('🔧 [Reports/Absenteísmo] Executando query direta no banco de dados...');
    
    // Construir query com filtros de data se fornecidos
    let query = `
      SELECT 
        nome_agente,
        ramal,
        total_dias_ativos,
        dias_7_dias,
        dias_15_dias,
        dias_30_dias,
        DATE_FORMAT(ultimo_dia_ativo, "%Y-%m-%d") as ultimo_dia_ativo
      FROM asterisk.vAbsenteismo
    `;
    
    const queryParams = [];
    
    // Adicionar filtros de data se fornecidos
    if (startDate || endDate) {
      query += ' WHERE ';
      const conditions = [];
      
      if (startDate) {
        conditions.push('ultimo_dia_ativo >= ?');
        queryParams.push(startDate);
      }
      
      if (endDate) {
        conditions.push('ultimo_dia_ativo <= ?');
        queryParams.push(endDate);
      }
      
      query += conditions.join(' AND ');
    }
    
    query += ` ORDER BY nome_agente ${sortOrder}`;
    
    console.log('📝 [Reports/Absenteísmo] Query SQL:', query);
    console.log('📝 [Reports/Absenteísmo] Parâmetros:', queryParams);
    console.log('🌏 [Reports/Absenteísmo] ATENÇÃO: Servidor na China - sem conversão de fuso');

    console.log('⚡ [Reports/Absenteísmo] Executando query...');
    const rows = await conn.query(query, queryParams);
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️ [Reports/Absenteísmo] Query executada em ${executionTime}ms`);
    
    console.log('📊 [Reports/Absenteísmo] Resultado bruto da query:');
    console.log('  🔍 Tipo:', typeof rows);
    console.log('  📏 É array:', Array.isArray(rows));
    console.log('  📊 Length:', rows?.length);
    
    // Converter BigInt para string se necessário
    const data = rows.map((row: any) => {
      const convertedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        convertedRow[key] = typeof value === 'bigint' ? value.toString() : value;
      }
      return convertedRow;
    });
    
    console.log('📋 [Reports/Absenteísmo] Dados processados:');
    console.log('  📊 Quantidade de registros:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('  🗂️ Campos do primeiro registro:', Object.keys(data[0]));
      console.log('  📄 Primeiro registro completo:', JSON.stringify(data[0], null, 2));
      console.log('  📄 Último registro completo:', JSON.stringify(data[data.length - 1], null, 2));
    }

    // Verificar se temos dados válidos
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ [Reports/Absenteísmo] Nenhum dado retornado pela query');
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Nenhum dado encontrado para o período especificado',
        params: { startDate, endDate, sortOrder },
        executionTime
      });
    }

    console.log('✅ [Reports/Absenteísmo] Retornando dados com sucesso');
    return NextResponse.json({
      success: true,
      data,
      totalRecords: data.length,
      params: { startDate, endDate, sortOrder },
      executionTime
    });

  } catch (error) {
    console.error('💥 [Reports/Absenteísmo] Erro ao executar query:', error);
    console.error('� [Reports/Absenteísmo] Detalhes do erro:');
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
    
    const executionTime = Date.now() - startTime;
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao executar relatório de absenteísmo',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        params: { startDate, endDate, sortOrder },
        executionTime
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      console.log('🔚 [Reports/Absenteísmo] Liberando conexão...');
      await conn.release();
      console.log('✅ [Reports/Absenteísmo] Conexão liberada');
    }
  }
}
