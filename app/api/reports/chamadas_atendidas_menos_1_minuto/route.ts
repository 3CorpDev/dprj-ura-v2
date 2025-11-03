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
  console.log('🚀 [Reports/ChamadasMenos1Min] Iniciando consulta de chamadas atendidas inferiores a 1 minuto...');
  
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortOrder = searchParams.get('sortOrder') || 'DESC';
  
  console.log('📋 [Reports/ChamadasMenos1Min] Parâmetros recebidos:');
  console.log('  📅 Data inicial:', startDate);
  console.log('  📅 Data final:', endDate);
  console.log('  🔄 Ordenação:', sortOrder);

  if (!startDate) {
    console.error('❌ [Reports/ChamadasMenos1Min] Data inicial não fornecida');
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
  console.log('� [Reports/ChamadasMenos1Min] Data final processada:', finalEndDate);

  let conn;
  try {
    console.log('🔗 [Reports/ChamadasMenos1Min] Obtendo conexão do pool...');
    conn = await pool.getConnection();
    console.log('✅ [Reports/ChamadasMenos1Min] Conexão obtida com sucesso');

    console.log('🔧 [Reports/ChamadasMenos1Min] Executando query direta no banco de dados...');
    const startTime = Date.now();
    // Construir a query SQL com filtros
    let query = `
      SELECT 
        calldate as data,
        duration as duracao,
        billsec as segundos,
        clid as cliente,
        src as origem,
        dst as destino,
        channel as canal_origem,
        dstchannel as canal_destino
      FROM asterisk.cdr
      WHERE disposition = 'ANSWERED'
        AND billsec < 60
        AND calldate >= ?
    `;
    
    const queryParams = [startDate];
    
    // Se tiver data final, adiciona condição
    if (endDate) {
      query += ' AND calldate <= ?';
      queryParams.push(endDate + ' 23:59:59');
    }
    
    query += ` ORDER BY calldate ${sortOrder}`;
    
    console.log('📝 [Reports/ChamadasMenos1Min] Query SQL:', query);
    console.log('📝 [Reports/ChamadasMenos1Min] Parâmetros:', queryParams);
    console.log('🌏 [Reports/ChamadasMenos1Min] ATENÇÃO: Servidor na China - datas passadas diretamente sem conversão de fuso');

    console.log('⚡ [Reports/ChamadasMenos1Min] Executando query...');
    const rows = await conn.query(query, queryParams);
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️ [Reports/ChamadasMenos1Min] Query executada em ${executionTime}ms`);
    
    console.log('📊 [Reports/ChamadasMenos1Min] Resultado bruto da query:');
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
    
    console.log('📋 [Reports/ChamadasMenos1Min] Dados processados:');
    console.log('  📊 Quantidade de registros:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('  🗂️ Campos do primeiro registro:', Object.keys(data[0]));
      console.log('  📄 Primeiro registro completo:', JSON.stringify(data[0], null, 2));
      console.log('  📄 Último registro completo:', JSON.stringify(data[data.length - 1], null, 2));
    }

    // Verificar se temos dados válidos
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ [Reports/ChamadasMenos1Min] Nenhum dado retornado pela query');
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

    console.log('✅ [Reports/ChamadasMenos1Min] Retornando dados com sucesso');
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
    const executionTime = Date.now() - startTime;
    console.error('❌ [Reports/ChamadasMenos1Min] Erro na API:', error);
    console.error('❌ [Reports/ChamadasMenos1Min] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.log(`⏱️ [Reports/ChamadasMenos1Min] Falha após ${executionTime}ms`);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor ao buscar dados de chamadas atendidas em menos de 1 minuto',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        executionTime
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      try {
        await conn.end();
        console.log('🔗 [Reports/ChamadasMenos1Min] Conexão com MariaDB fechada');
      } catch (err) {
        console.error('❌ [Reports/ChamadasMenos1Min] Erro ao fechar conexão:', err);
      }
    }
  }
}
