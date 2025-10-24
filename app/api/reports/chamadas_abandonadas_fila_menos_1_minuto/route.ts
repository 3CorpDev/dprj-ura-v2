import { NextResponse } from 'next/server';

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

  try {
    console.log('🔄 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Usando endpoint dinâmico /api/query/select');
    
    // Construir as condições WHERE
    const whereConditions = [
      { campo: 'event', valor: 'ABANDON', operacao: '=' },
      { campo: 'CAST(data1 AS UNSIGNED)', valor: 60, operacao: '<' },
      { campo: 'created', valor: startDate, operacao: '>=' }
    ];
    
    // Se tiver data final, adiciona condição
    if (endDate) {
      whereConditions.push({ campo: 'created', valor: endDate + ' 23:59:59', operacao: '<=' });
    }
    
    const requestBody = {
      tabela: 'asterisk.queues_log',
      campos: [
        { campo: 'created', alias: 'data', type: 'Date' },
        { campo: 'callid', alias: 'ID Chamada', type: 'Number' },
        { campo: 'queuename', alias: 'Nome da Fila', type: 'String' },
        { campo: 'agent', alias: 'Agente', type: 'String' },
        { campo: 'data1', alias: 'tempo', type: 'Number' }
      ],
      where: whereConditions,
      whereType: 'AND',
      orderby: { campo: 'created', direcao: sortOrder }
    };
    
    console.log('� [Reports/ChamadasAbandonadasNaFilaMenos1Min] Enviando para endpoint dinâmico:', requestBody);
    
    const response = await fetch('http://localhost:3002/api/query/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP do endpoint dinâmico: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Dados recebidos do endpoint dinâmico:', result);
    
    if (result.success) {
      console.log('📊 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Total de registros:', result.data?.length || 0);
      return NextResponse.json({
        success: true,
        data: result.data || [],
        total: result.total || 0,
        executionTime: result.executionTime
      });
    } else {
      console.error('❌ [Reports/ChamadasAbandonadasNaFilaMenos1Min] Erro no endpoint dinâmico:', result.error);
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Erro no endpoint dinâmico'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('💥 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Erro durante requisição:', error.message);
    console.error('🔍 [Reports/ChamadasAbandonadasNaFilaMenos1Min] Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
