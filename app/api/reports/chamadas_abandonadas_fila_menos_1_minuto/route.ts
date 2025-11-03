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
  console.log('🚀 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Iniciando consulta de chamadas abandonadas em fila com menos de 1 minuto...');
  
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortOrder = searchParams.get('sortOrder') || 'DESC';
  
  console.log('📋 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Parâmetros recebidos:');
  console.log('  📅 Data inicial:', startDate);
  console.log('  📅 Data final:', endDate);
  console.log('  🔄 Ordenação:', sortOrder);

  if (!startDate) {
    console.error('❌ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Data inicial não fornecida');
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
  console.log('� [Reports/ChamadasAbandonadasNaFilaMenos1Min] Data final processada:', finalEndDate);

  let conn;
  try {
    console.log('🔗 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Obtendo conexão do pool...');
    conn = await pool.getConnection();
    console.log('✅ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Conexão obtida com sucesso');

    console.log('🔧 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Executando query direta no banco de dados...');
    const startTime = Date.now();
    // Construir a query SQL com filtros
    let query = `
      SELECT 
        created as data,
        callid as 'ID Chamada',
        queuename as 'Nome da Fila',
        agent as Agente,
        data1 as tempo
      FROM asterisk.queues_log
      WHERE event = 'ABANDON'
        AND CAST(data1 AS UNSIGNED) < 60
        AND created >= ?
    `;
    
    const queryParams = [startDate];
    
    // Se tiver data final, adiciona condição
    if (endDate) {
      query += ' AND created <= ?';
      queryParams.push(endDate + ' 23:59:59');
    }
    
    query += ` ORDER BY created ${sortOrder}`;
    
    console.log('📝 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Query SQL:', query);
    console.log('📝 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Parâmetros:', queryParams);
    console.log('🌏 [Reports/ChamadasAbandonadasNaFilaMenos1Min] ATENÇÃO: Servidor na China - datas passadas diretamente sem conversão de fuso');

    console.log('⚡ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Executando query...');
    const rows = await conn.query(query, queryParams);
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Query executada em ${executionTime}ms`);
    
    console.log('📊 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Resultado bruto da query:');
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
    
    console.log('📋 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Dados processados:');
    console.log('  📊 Quantidade de registros:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('  🗂️ Campos do primeiro registro:', Object.keys(data[0]));
      console.log('  📄 Primeiro registro completo:', JSON.stringify(data[0], null, 2));
      console.log('  📄 Último registro completo:', JSON.stringify(data[data.length - 1], null, 2));
    }

    // Verificar se temos dados válidos
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Nenhum dado retornado pela query');
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

    console.log('✅ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Retornando dados com sucesso');
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
    console.error('💥 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Erro ao executar query:', error);
    console.error('� [Reports/ChamadasAbandonadasNaFilaMenos1Min] Detalhes do erro:');
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
        error: 'Erro ao executar relatório de chamadas abandonadas na fila com menos de 1 minuto',
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
      console.log('🔚 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Liberando conexão...');
      await conn.release();
      console.log('✅ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Conexão liberada');
    }
  }
}
