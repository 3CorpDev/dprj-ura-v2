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
  console.log('🚀 [Reports/TotalRepeticoesChamadores] Iniciando consulta do total de repetições por chamador...');
  
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortOrder = searchParams.get('sortOrder') || 'DESC';
  
  console.log('📋 [Reports/TotalRepeticoesChamadores] Parâmetros recebidos:');
  console.log('  📅 Data inicial:', startDate);
  console.log('  📅 Data final:', endDate);
  console.log('  🔄 Ordenação:', sortOrder);

  if (!startDate) {
    console.error('❌ [Reports/TotalRepeticoesChamadores] Data inicial não fornecida');
    return NextResponse.json(
      { 
        success: false,
        error: 'Data inicial é obrigatória' 
      },
      { status: 400 }
    );
  }

  // Se não tiver data final, usa a mesma data inicial
  const finalEndDate = endDate || startDate;
  console.log('� [Reports/TotalRepeticoesChamadores] Data final processada:', finalEndDate);

  let conn;
  try {
    console.log('🔗 [Reports/TotalRepeticoesChamadores] Obtendo conexão do pool...');
    conn = await pool.getConnection();
    console.log('✅ [Reports/TotalRepeticoesChamadores] Conexão obtida com sucesso');

    console.log('🔧 [Reports/TotalRepeticoesChamadores] Executando query direta no banco de dados...');
    const startTime = Date.now();
    
    // Construir a query SQL com filtros de data
    let query = `
      SELECT
        DATE(calldate) AS data,
        source AS chamador,
        COUNT(*) AS chamadas,
        CASE
          WHEN COUNT(*) >= 5 THEN '5x ou mais'
          WHEN COUNT(*) = 4 THEN '4x'
          WHEN COUNT(*) = 3 THEN '3x'
          WHEN COUNT(*) = 2 THEN '2x'
          ELSE '1x'
        END AS classificacao
      FROM vCdrGroupData
      WHERE DATE(calldate) >= ?
    `;
    
    // Para startDate, usar apenas a data (sem hora)
    const queryParams = [startDate];
    
    // Se tiver data final, adiciona condição
    if (endDate && endDate !== startDate) {
      query += ' AND DATE(calldate) <= ?';
      queryParams.push(endDate);
    }
    
    query += ` GROUP BY DATE(calldate), source ORDER BY DATE(calldate) ${sortOrder}, source`;
    
    console.log('📝 [Reports/TotalRepeticoesChamadores] Query SQL:', query);
    console.log('📝 [Reports/TotalRepeticoesChamadores] Parâmetros:', queryParams);
    console.log('🌏 [Reports/TotalRepeticoesChamadores] ATENÇÃO: Servidor na China - datas passadas diretamente sem conversão de fuso');

    console.log('⚡ [Reports/TotalRepeticoesChamadores] Executando query...');
    const rows = await conn.query(query, queryParams);
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️ [Reports/TotalRepeticoesChamadores] Query executada em ${executionTime}ms`);
    
    console.log('📊 [Reports/TotalRepeticoesChamadores] Resultado bruto da query:');
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
    
    console.log('📋 [Reports/TotalRepeticoesChamadores] Dados processados:');
    console.log('  📊 Quantidade de registros:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('  🗂️ Campos do primeiro registro:', Object.keys(data[0]));
      console.log('  📄 Primeiro registro completo:', JSON.stringify(data[0], null, 2));
      console.log('  📄 Último registro completo:', JSON.stringify(data[data.length - 1], null, 2));
    }

    // Verificar se temos dados válidos
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ [Reports/TotalRepeticoesChamadores] Nenhum dado retornado pela query');
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Nenhum dado encontrado para o período especificado',
        params: {
          startDate,
          endDate: finalEndDate,
          sortOrder
        },
        executionTime
      });
    }

    console.log('✅ [Reports/TotalRepeticoesChamadores] Retornando dados com sucesso');
    return NextResponse.json({
      success: true,
      data,
      totalRecords: data.length,
      params: {
        startDate,
        endDate: finalEndDate,
        sortOrder
      },
      executionTime
    });

  } catch (error) {
    console.error('💥 [Reports/TotalRepeticoesChamadores] Erro ao executar query:', error);
    console.error('� [Reports/TotalRepeticoesChamadores] Detalhes do erro:');
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
        error: 'Erro ao executar relatório de total repetições por chamadores',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        params: {
          startDate,
          endDate: finalEndDate,
          sortOrder
        }
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      console.log('🔚 [Reports/TotalRepeticoesChamadores] Liberando conexão...');
      await conn.release();
      console.log('✅ [Reports/TotalRepeticoesChamadores] Conexão liberada');
    }
  }
}
