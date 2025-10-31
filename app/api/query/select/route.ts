import { NextRequest, NextResponse } from 'next/server';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST_DPRJ!,
  user: process.env.DB_USER_DPRJ!,
  password: process.env.DB_PASSWORD_DPRJ!,
  database: process.env.DB_NAME_DPRJ!,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT_DPRJ || 5),
});


// Converte BigInt e outros objetos em strings seguras para JSON
function normalizeValue(value: any): any {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
}

function normalizeRow(row: any, aliasMap: Record<string, string>): Record<string, any> {
  const novoRow: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    const alias = aliasMap[key] || key;
    novoRow[alias] = normalizeValue(value);
  });
  return novoRow;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tabela, campos, where, whereType, orderby, groupBy, limit, offset } = body;

    if (!tabela) {
      return NextResponse.json({ success: false, message: 'Tabela não informada!' }, { status: 400 });
    }

    const campoNomes = Array.isArray(campos)
      ? campos.map((c: any) => typeof c === 'string' ? c : c.campo)
      : ['*'];

    const colunas = Array.isArray(campos)
      ? campos.map((c: any) => ({
          campo: typeof c === 'string' ? c : c.campo,
          alias: typeof c === 'string' ? c : c.alias || c.campo,
          type: typeof c === 'string' ? 'String' : c.type || 'String',
        }))
      : [];

    const aliasMap = colunas.reduce((acc: Record<string, string>, c) => {
      acc[c.campo] = c.alias;
      return acc;
    }, {});

    let query = `SELECT ${campoNomes.join(', ')} FROM ${tabela}`;
    let countQuery = `SELECT COUNT(*) as total FROM ${tabela}`;
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    const countParams: any[] = [];

    if (Array.isArray(where)) {
      where.forEach((condition) => {
        if (condition.campo && condition.valor !== undefined && condition.operacao) {
          const clause = `${condition.campo} ${condition.operacao} ?`;
          whereClauses.push(clause);
          queryParams.push(condition.valor);
          countParams.push(condition.valor);
        }
      });
    }

    if (whereClauses.length > 0) {
      const operador = ['AND', 'OR'].includes((whereType || '').toUpperCase()) ? whereType.toUpperCase() : 'OR';
      const whereSQL = ` WHERE ${whereClauses.join(` ${operador} `)}`;
      query += whereSQL;
      countQuery += whereSQL;
    }

    // Adicionar GROUP BY se especificado
    if (groupBy) {
      query += ` GROUP BY ${groupBy}`;
    }

    if (orderby?.campo && orderby?.direcao) {
      query += ` ORDER BY ${orderby.campo} ${orderby.direcao}`;
    }

    if (limit) {
      query += ` LIMIT ?`;
      queryParams.push(limit);
    }

    if (offset !== undefined) {
      query += ` OFFSET ?`;
      queryParams.push(offset);
    }

    console.log('🔍 Query SQL:', query);
    console.log('🔍 Parâmetros:', queryParams);

    const conn = await pool.getConnection();
    const result = await conn.query(query, queryParams);
    
    // Para consultas com GROUP BY, não fazemos count separado
    let total = result.length;
    if (!groupBy) {
      const countResult = await conn.query(countQuery, countParams);
      const totalRaw = countResult[0]?.total || 0;
      total = typeof totalRaw === 'bigint' ? Number(totalRaw) : totalRaw;
    }
    
    conn.release();

    const dataComAlias = result.map((row: any) => normalizeRow(row, aliasMap));

    console.log('✅ Resultado processado:', { total, registros: dataComAlias.length });

    return NextResponse.json({
      success: true,
      colunas,
      total,
      data: dataComAlias,
    });
  } catch (err: any) {
    console.error('❌ Erro ao executar consulta:', err.message);
    console.error('🔍 Stack trace:', err.stack);
    return NextResponse.json({
      success: false,
      message: 'Erro ao recuperar dados!',
      error: err.message,
    }, { status: 500 });
  }
}
