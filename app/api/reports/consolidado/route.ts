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
  console.log('🚀 [Reports/Consolidado] Iniciando chamada da procedure de relatório consolidado...');
  
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortOrder = searchParams.get('sortOrder') || 'DESC';
  
  console.log('📋 [Reports/Consolidado] Parâmetros recebidos:');
  console.log('  📅 Data inicial:', startDate);
  console.log('  📅 Data final:', endDate);
  console.log('  🔄 Ordenação:', sortOrder);

  if (!startDate) {
    console.error('❌ [Reports/Consolidado] Data inicial não fornecida');
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
  console.log('📅 [Reports/Consolidado] Data final processada:', finalEndDate);

  let conn;
  try {
    console.log('🔗 [Reports/Consolidado] Obtendo conexão do pool...');
    conn = await pool.getConnection();
    console.log('✅ [Reports/Consolidado] Conexão obtida com sucesso');
    
    const procedureName = 'sp_relatorio_consolidado_periodo_cdr_entrantes';
    const procedureParams = [startDate, finalEndDate, sortOrder];
    
    console.log('🔧 [Reports/Consolidado] Preparando chamada da procedure:');
    console.log('  📞 Procedure:', procedureName);
    console.log('  📝 Parâmetros:', procedureParams);
    console.log('🌏 [Reports/Consolidado] ATENÇÃO: Servidor na China - datas passadas diretamente sem conversão de fuso');

    console.log('⚡ [Reports/Consolidado] Executando procedure...');
    const startTime = Date.now();
    
    const rows = await conn.query(
      `CALL ${procedureName}(?, ?, ?)`,
      procedureParams
    );
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️ [Reports/Consolidado] Procedure executada em ${executionTime}ms`);
    
    console.log('📊 [Reports/Consolidado] Resultado bruto da procedure:');
    console.log('  🔍 Tipo:', typeof rows);
    console.log('  📏 É array:', Array.isArray(rows));
    console.log('  📊 Length:', rows?.length);
    
    // A procedure retorna um array com os resultados
    const data = rows[0] || [];
    
    console.log('📋 [Reports/Consolidado] Dados processados:');
    console.log('  📊 Quantidade de registros:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('  🗂️ Campos do primeiro registro:', Object.keys(data[0]));
      console.log('  📄 Primeiro registro completo:', JSON.stringify(data[0], null, 2));
      console.log('  📄 Último registro completo:', JSON.stringify(data[data.length - 1], null, 2));
    }

    // Verificar se temos dados válidos
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ [Reports/Consolidado] Nenhum dado retornado pela procedure');
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

    console.log('✅ [Reports/Consolidado] Retornando dados com sucesso');
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
    console.error('💥 [Reports/Consolidado] Erro ao executar procedure:', error);
    console.error('📝 [Reports/Consolidado] Detalhes do erro:');
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
        error: 'Erro ao executar relatório consolidado',
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
      console.log('🔚 [Reports/Consolidado] Liberando conexão...');
      await conn.release();
      console.log('✅ [Reports/Consolidado] Conexão liberada');
    }
  }
}