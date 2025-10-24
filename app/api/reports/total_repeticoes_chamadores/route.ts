import { NextResponse } from 'next/server';

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

  try {
    console.log('🔄 [Reports/TotalRepeticoesChamadores] Usando endpoint dinâmico /api/query/select');
    
    // Construir as condições WHERE
    const whereConditions = [
      { campo: 'calldate', valor: startDate, operacao: '>=' }
    ];
    
    // Se tiver data final, adiciona condição
    if (endDate) {
      whereConditions.push({ campo: 'created', valor: endDate + ' 23:59:59', operacao: '<=' });
    }
    
    const requestBody = {
      tabela: 'asterisk.vTotalRepeticoesChamadores',
      campos: [
        { campo: 'calldate', alias: 'Data', type: 'Date' },
        { campo: 'chamador', alias: 'Origem', type: 'Number' },
        { campo: 'total_chamadas', alias: 'Repetições', type: 'String' },
        { campo: 'classificacao', alias: 'Classificação', type: 'String' }
      ],
      where: whereConditions,
      whereType: 'AND',
      orderby: { campo: 'calldate', direcao: sortOrder }
    };
    
    console.log('� [Reports/TotalRepeticoesChamadores] Enviando para endpoint dinâmico:', requestBody);
    
    const response = await fetch('http://localhost:3002/api/query/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP do endpoint dinâmico: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Reports/TotalRepeticoesChamadores] Dados recebidos do endpoint dinâmico:', result);
    
    if (result.success) {
      console.log('📊 [Reports/TotalRepeticoesChamadores] Total de registros:', result.data?.length || 0);
      return NextResponse.json({
        success: true,
        data: result.data || [],
        total: result.total || 0,
        executionTime: result.executionTime
      });
    } else {
      console.error('❌ [Reports/TotalRepeticoesChamadores] Erro no endpoint dinâmico:', result.error);
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Erro no endpoint dinâmico'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('💥 [Reports/TotalRepeticoesChamadores] Erro durante requisição:', error.message);
    console.error('🔍 [Reports/TotalRepeticoesChamadores] Stack trace:', error.stack);
    
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
