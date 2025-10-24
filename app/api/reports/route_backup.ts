import { NextResponse } from 'next/server';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST_DPRJ,
  user: process.env.DB_USER_DPRJ,
  password: process.env.DB_PASSWORD_DPRJ,
  database: process.env.DB_NAME_DPRJ,
  connectionLimit: 5,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortOrder = searchParams.get('sortOrder') || 'DESC';

  if (!startDate) {
    return NextResponse.json(
      { error: 'Data inicial é obrigatória' },
      { status: 400 }
    );
  }

  // Se não tiver data final, usa a mesma data inicial
  const finalEndDate = endDate || startDate;

  let conn;
  try {
    conn = await pool.getConnection();
    
    console.log('[Reports] Calling procedure with params:', {
      startDate,
      endDate: finalEndDate,
      sortOrder
    });

    const rows = await conn.query(
      'CALL sp_relatorio_consolidado_periodo_cdr_entrantes(?, ?, ?)',
      [startDate, finalEndDate, sortOrder]
    );

    // A procedure retorna um array com os resultados
    const data = rows[0] || [];

    console.log('[Reports] Procedure result:', data);

    return NextResponse.json({
      success: true,
      data,
      params: {
        startDate,
        endDate: finalEndDate,
        sortOrder
      }
    });

  } catch (error) {
    console.error('[Reports] Error calling procedure:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao executar relatório',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}