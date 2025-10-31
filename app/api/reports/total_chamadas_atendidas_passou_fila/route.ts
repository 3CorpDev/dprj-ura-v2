import { NextRequest, NextResponse } from 'next/server';
import mariadb from 'mariadb';

// Pool de conexão para melhor performance (updated)
const pool = mariadb.createPool({
  host: process.env.DB_HOST_DPRJ,
  user: process.env.DB_USER_DPRJ,
  password: process.env.DB_PASSWORD_DPRJ,
  database: process.env.DB_NAME_DPRJ,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT_DPRJ),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortOrder = searchParams.get('sortOrder') || 'DESC';

  console.log('🚀 [total_chamadas_atendidas_passou_fila] Iniciando requisição...');
  console.log('🌏 [total_chamadas_atendidas_passou_fila] Servidor na China - processando datas sem conversão automática');
  console.log('📅 [total_chamadas_atendidas_passou_fila] Data inicial recebida:', startDate);
  console.log('📅 [total_chamadas_atendidas_passou_fila] Data final recebida:', endDate);
  console.log('🔄 [total_chamadas_atendidas_passou_fila] Ordenação:', sortOrder);

  if (!startDate) {
    console.log('❌ [total_chamadas_atendidas_passou_fila] Data inicial é obrigatória');
    return NextResponse.json({ 
      success: false, 
      error: 'Data inicial é obrigatória' 
    }, { status: 400 });
  }

  let connection;
  
  try {
    console.log('🔌 [total_chamadas_atendidas_passou_fila] Obtendo conexão do pool...');
    connection = await pool.getConnection();
    console.log('✅ [total_chamadas_atendidas_passou_fila] Conexão obtida com sucesso');

    // Formatar as datas para incluir horário - CORREÇÃO FUSO HORÁRIO CHINA
    // Força as datas a serem interpretadas como horário local (Brasil) evitando conversão automática do servidor
    const startDateTime = `${startDate} 00:00:00`;
    const endDateTime = endDate ? `${endDate} 23:59:59` : `${startDate} 23:59:59`;

    console.log('🔍 [total_chamadas_atendidas_passou_fila] Executando procedure sp_consulta_fila...');
    console.log('📊 [total_chamadas_atendidas_passou_fila] Campos retornados: data, nome_fila, agente, telefone');
    console.log('⏰ [total_chamadas_atendidas_passou_fila] Data/hora inicial:', startDateTime);
    console.log('⏰ [total_chamadas_atendidas_passou_fila] Data/hora final:', endDateTime);
    console.log('🌏 [total_chamadas_atendidas_passou_fila] ATENÇÃO: Servidor na China - datas forçadas para horário local');

    // Executar a procedure
    const rows = await connection.query(
      'CALL sp_consulta_fila(?, ?, ?)',
      [startDateTime, endDateTime, sortOrder]
    );

    console.log('📊 [total_chamadas_atendidas_passou_fila] Resultado da procedure:', rows);

    // A procedure retorna um array de arrays, precisamos pegar o primeiro
    const data = Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0]) ? rows[0] : [];
    
    console.log('✅ [total_chamadas_atendidas_passou_fila] Dados processados:', Array.isArray(data) ? data.length : 0, 'registros');
    console.log('🔍 [total_chamadas_atendidas_passou_fila] Primeiros registros:', Array.isArray(data) ? data.slice(0, 3) : []);

    return NextResponse.json({
      success: true,
      data: data,
      total: Array.isArray(data) ? data.length : 0,
      message: `Relatório gerado com ${Array.isArray(data) ? data.length : 0} registros`
    });

  } catch (error: any) {
    console.error('💥 [total_chamadas_atendidas_passou_fila] Erro na execução:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
    
  } finally {
    if (connection) {
      console.log('🔌 [total_chamadas_atendidas_passou_fila] Liberando conexão...');
      connection.release();
      console.log('✅ [total_chamadas_atendidas_passou_fila] Conexão liberada');
    }
  }
}
