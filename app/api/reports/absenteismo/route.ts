import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('🚀 [Reports/Absenteísmo] Iniciando consulta de absenteísmo...');
  
  const { searchParams } = new URL(request.url);
  const sortOrder = searchParams.get('sortOrder') || 'ASC';
  
  console.log('📋 [Reports/Absenteísmo] Parâmetros recebidos:');
  console.log('  🔄 Ordenação:', sortOrder);

  try {
    console.log('🔄 [Reports/Absenteísmo] Usando endpoint dinâmico /api/query/select');
    
    const requestBody = {
      tabela: 'asterisk.vAbsenteismo',
      campos: [
        { campo: 'nome_agente', alias: 'nome_agente', type: 'String' },
        { campo: 'ramal', alias: 'ramal', type: 'Number' },
        { campo: 'total_dias_ativos', alias: 'total_dias_ativos', type: 'Number' },
        { campo: 'dias_7_dias', alias: 'dias_7_dias', type: 'String' },
        { campo: 'dias_15_dias', alias: 'dias_15_dias', type: 'String' },
        { campo: 'dias_30_dias', alias: 'dias_30_dias', type: 'String' },
        { campo: 'DATE_FORMAT(ultimo_dia_ativo, "%Y-%m-%d")', alias: 'ultimo_dia_ativo', type: 'String' }
      ],
      orderby: { campo: 'nome_agente', direcao: sortOrder }
    };
    
    console.log('� [Reports/Absenteísmo] Enviando para endpoint dinâmico:', requestBody);
    
    const response = await fetch('http://localhost:3002/api/query/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP do endpoint dinâmico: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Reports/Absenteísmo] Dados recebidos do endpoint dinâmico:', result);
    
    if (result.success) {
      console.log('📊 [Reports/Absenteísmo] Total de registros:', result.data?.length || 0);
      return NextResponse.json({
        success: true,
        data: result.data || [],
        total: result.total || 0,
        executionTime: result.executionTime
      });
    } else {
      console.error('❌ [Reports/Absenteísmo] Erro no endpoint dinâmico:', result.error);
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Erro no endpoint dinâmico'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('💥 [Reports/Absenteísmo] Erro durante requisição:', error.message);
    console.error('🔍 [Reports/Absenteísmo] Stack trace:', error.stack);
    
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
