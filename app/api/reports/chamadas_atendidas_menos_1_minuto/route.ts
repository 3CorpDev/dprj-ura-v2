import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

  try {
    console.log('🔄 [Reports/ChamadasMenos1Min] Usando endpoint dinâmico /api/query/select');
    
    // Construir as condições WHERE
    const whereConditions = [
      { campo: 'disposition', valor: 'ANSWERED', operacao: '=' },
      { campo: 'billsec', valor: 60, operacao: '<' },
      { campo: 'calldate', valor: startDate, operacao: '>=' }
    ];
    
    // Se tiver data final, adiciona condição
    if (endDate) {
      whereConditions.push({ campo: 'calldate', valor: endDate + ' 23:59:59', operacao: '<=' });
    }
    
    const requestBody = {
      tabela: 'asterisk.cdr',
      campos: [
        { campo: 'calldate', alias: 'data', type: 'Date' },
        { campo: 'duration', alias: 'duracao', type: 'Number' },
        { campo: 'billsec', alias: 'segundos', type: 'Number' },
        { campo: 'clid', alias: 'cliente', type: 'String' },
        { campo: 'src', alias: 'origem', type: 'String' },
        { campo: 'dst', alias: 'destino', type: 'String' },
        { campo: 'channel', alias: 'canal_origem', type: 'String' },
        { campo: 'dstchannel', alias: 'canal_destino', type: 'String' }
      ],
      where: whereConditions,
      whereType: 'AND',
      orderby: { campo: 'calldate', direcao: sortOrder }
    };
    
    console.log('� [Reports/ChamadasMenos1Min] Enviando para endpoint dinâmico:', requestBody);
    
    const response = await fetch('http://localhost:3002/api/query/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP do endpoint dinâmico: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Reports/ChamadasMenos1Min] Dados recebidos do endpoint dinâmico:', result);
    
    if (result.success) {
      console.log('📊 [Reports/ChamadasMenos1Min] Total de registros:', result.data?.length || 0);
      return NextResponse.json({
        success: true,
        data: result.data || [],
        total: result.total || 0,
        executionTime: result.executionTime
      });
    } else {
      console.error('❌ [Reports/ChamadasMenos1Min] Erro no endpoint dinâmico:', result.error);
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Erro no endpoint dinâmico'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('💥 [Reports/ChamadasMenos1Min] Erro durante requisição:', error.message);
    console.error('🔍 [Reports/ChamadasMenos1Min] Stack trace:', error.stack);
    
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
