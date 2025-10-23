'use server'

import { adjustToGMTMinus3 } from '@/lib/utils';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let _client: MongoClient | null = null;
function ensureClient() {
  if (!_client) {
    if (!uri) throw new Error('MONGODB_URI is not defined');
    _client = new MongoClient(uri);
  }
  return _client;
}

const client = new Proxy({}, {
  get(_t, prop) {
    const real = ensureClient();
    // @ts-ignore
    const v = real[prop as keyof MongoClient];
    return typeof v === 'function' ? (v as Function).bind(real) : v;
  }
}) as unknown as MongoClient;
// ...existing code above remains unchanged (module header)
const DB_NAME = 'ura_dprj';
const COLLECTION_NAME = 'records';



export async function getCallRecords() {
  try {
    await client.connect();
    const database = client.db('ura_dprj');
    const collection = database.collection('records');

    const records = await collection
      .find({ active: true })
      .sort({ datetime: -1 })
      .limit(50)
      .toArray();

    return records.map(record => ({
      _id: record._id.toString(),
      source_channel: record.source_channel,
      customer_number: record.customer_number,
      uniqueid: record.uniqueid,
      datetime: adjustToGMTMinus3(new Date(record.datetime)),
      active: record.active,
      ivr_id: record.ivr_id,
      metadata: {
        cpf: record.metadata?.cpf,
        processo: record.metadata?.processo,
        protocolo: record.metadata?.protocolo,
        created_at: record.metadata?.created_at ? adjustToGMTMinus3(new Date(record.metadata.created_at)) : null,
        updated_at: record.metadata?.updated_at ? adjustToGMTMinus3(new Date(record.metadata.updated_at)) : null
      },
      hangup_cause: record.hangup_cause,
      hangup_time: record.hangup_time ? adjustToGMTMinus3(new Date(record.hangup_time)) : undefined
    }));

  } catch (error) {
    console.error('[getCallRecords] Erro ao buscar registros:', error);
    return [];
  } finally {
    await client.close();
  }
}

export async function searchCallRecords(
  searchQuery: string | null,
  startDate?: string | null,
  endDate?: string | null,
  statusCall: string | null = 'all',
  page: number = 1,
  limit: number = 20,
  optionFilter: string | null = null
) {
  try {
    await client.connect();
    const database = client.db(DB_NAME);
    const collection = database.collection(COLLECTION_NAME);

    // Construir a query
    let query: any = {};

    // Filtrar por número de telefone, protocolo ou uniqueid
    if (searchQuery) {
      query.$or = [
        { customer_number: { $regex: searchQuery, $options: 'i' } },
        { uniqueid: { $regex: searchQuery, $options: 'i' } },
        { protocol: { $regex: searchQuery, $options: 'i' } },
        { 'metadata.processo': { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Filtrar por status ativo/inativo com base no statusCall
    if (statusCall === 'active') {
      query.active = true;
    } else if (statusCall === 'finished') {
      query.active = false;
    }

    // Filtrar por opção do IVR (metadata.option)
    if (optionFilter) {
      query['metadata.option'] = optionFilter;
    }

    // Filtrar por intervalo de datas
    if (startDate || endDate) {
      query.datetime = {};

      if (startDate) {
        // Converter de GMT-3 para UTC+0 adicionando 3 horas
        const startDateTime = new Date(startDate + 'T00:00:00.000-03:00');
        query.datetime.$gte = startDateTime;
      }

      if (endDate) {
        // Converter de GMT-3 para UTC+0 adicionando 3 horas e incluindo todo o dia final
        const endDateTime = new Date(endDate + 'T23:59:59.999-03:00');
        query.datetime.$lte = endDateTime;
      }
    }

    // Contar total de registros para paginação
    const total = await collection.countDocuments(query);

    // Calcular skip para paginação
    const skip = (page - 1) * limit;

    // Buscar registros paginados
    const records = await collection
      .find(query)
      .sort({ datetime: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Se não encontrou registros
    if (records.length === 0) {
      return {
        success: false,
        message: statusCall === 'all'
          ? 'Nenhuma ligação encontrada para este número/ID no período especificado.'
          : statusCall === 'active'
            ? 'Nenhuma ligação ativa encontrada para este número/ID no período especificado.'
            : 'Nenhuma ligação finalizada encontrada para este número/ID no período especificado.'
      };
    }

    // Mapear registros para o formato esperado
    const formattedRecords = records.map(record => ({
      _id: record._id.toString(),
      source_channel: record.source_channel,
      customer_number: record.customer_number,
      uniqueid: record.uniqueid,
      datetime: adjustToGMTMinus3(new Date(record.datetime)),
      active: record.active,
      protocol: record.protocol,
      metadata: {
        cpf: record.metadata?.cpf,
        processo: record.metadata?.processo,
        protocolo: record.metadata?.protocolo,
        created_at: record.metadata?.created_at ? adjustToGMTMinus3(new Date(record.metadata.created_at)) : null,
        updated_at: record.metadata?.updated_at ? adjustToGMTMinus3(new Date(record.metadata.updated_at)) : null,
        option: record.metadata?.option,
        suboption: record.metadata?.suboption
      },
      hangup_cause: record.hangup_cause,
      hangup_time: record.hangup_time ? adjustToGMTMinus3(new Date(record.hangup_time)) : null
    }));

    return {
      success: true,
      records: formattedRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

  } catch (error) {
    console.error('[searchCallRecords] Erro ao buscar registros:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao buscar os registros.'
    };
  } finally {
    await client.close();
  }
}

export async function getUniqueIdByCallerNumber(event: any) {
  try {
    await client.connect();
    const database = client.db(DB_NAME);
    const collection = database.collection(COLLECTION_NAME);

    const records = await collection.find({
      customer_number: event.callerNumber,
      active: true
    })
      .sort({ datetime: -1 })
      .limit(1)
      .toArray();

    return records[0] || null;
  } catch (error) {
    console.error('[getUniqueIdByCallerNumber] Erro ao buscar registros:', error);
    return null;
  } finally {
    await client.close();
  }
}

export async function getAdminDashboardStats() {
  try {
    await client.connect();
    const database = client.db(DB_NAME);
    const collection = database.collection(COLLECTION_NAME);

    // Total de ligações (sem filtros)
    const totalCalls = await collection.countDocuments();

    // Ligações ativas (sem filtros)
    const activeCalls = await collection.countDocuments({ active: true });

    // Ligações de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const callsToday = await collection.countDocuments({
      datetime: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Cálculo da duração média (em minutos)
    const pipeline = [
      {
        $match: {
          active: false,
          hangup_time: { $exists: true },
          datetime: { $exists: true }
        }
      },
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ["$hangup_time", "$datetime"] },
              60000 // Converter de milissegundos para minutos
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" }
        }
      }
    ];

    const durationResults = await collection.aggregate(pipeline).toArray();
    const avgDuration = durationResults.length > 0
      ? parseFloat(durationResults[0].avgDuration.toFixed(1))
      : 0;

    return {
      totalCalls,
      activeCalls,
      callsToday,
      avgDuration
    };

  } catch (error) {
    console.error('[getAdminDashboardStats] Erro ao buscar estatísticas:', error);
    return {
      totalCalls: 0,
      activeCalls: 0,
      callsToday: 0,
      avgDuration: 0
    };
  } finally {
    await client.close();
  }
}

// Função para exportar relatório de ligações
export async function exportCallRecords(
  searchQuery: string | null,
  statusCall: string | null,
  startDate?: string | null,
  endDate?: string | null,
  optionFilter: string | null = null
) {
  try {
    await client.connect();
    const database = client.db(DB_NAME);
    const collection = database.collection(COLLECTION_NAME);

    // Construir a query
    let query: any = {};

    // Filtrar por número de telefone, protocolo ou uniqueid
    if (searchQuery) {
      query.$or = [
        { customer_number: { $regex: searchQuery, $options: 'i' } },
        { uniqueid: { $regex: searchQuery, $options: 'i' } },
        { protocol: { $regex: searchQuery, $options: 'i' } },
        { 'metadata.processo': { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Filtrar por status ativo/inativo com base no statusCall
    if (statusCall === 'active') {
      query.active = true;
    } else if (statusCall === 'finished') {
      query.active = false;
    }

    // Filtrar por opção do IVR (metadata.option)
    if (optionFilter) {
      query['metadata.option'] = optionFilter;
    }

    // Filtrar por intervalo de datas
    if (startDate || endDate) {
      query.datetime = {};

      if (startDate) {
        // Converter de GMT-3 para UTC+0 adicionando 3 horas
        const startDateTime = new Date(startDate + 'T00:00:00.000-03:00');
        query.datetime.$gte = startDateTime;
      }

      if (endDate) {
        // Converter de GMT-3 para UTC+0 adicionando 3 horas e incluindo todo o dia final
        const endDateTime = new Date(endDate + 'T23:59:59.999-03:00');
        query.datetime.$lte = endDateTime;
      }
    }

    // Buscar todos os registros sem paginação
    const records = await collection
      .find(query)
      .sort({ datetime: -1 })
      // .limit(1000) // Limitamos a 1000 registros para evitar problemas de memória
      .toArray();

    // Mapear registros para o formato esperado
    const formattedRecords = records.map(record => ({
      _id: record._id.toString(),
      source_channel: record.source_channel,
      customer_number: record.customer_number,
      uniqueid: record.uniqueid,
      datetime: adjustToGMTMinus3(new Date(record.datetime)),
      active: record.active,
      protocol: record.protocol,
      ivr_id: record.ivr_id,
      metadata: {
        cpf: record.metadata?.cpf,
        processo: record.metadata?.processo,
        protocolo: record.metadata?.protocolo,
        option: record.metadata?.option,
        suboption: record.metadata?.suboption
      },
      hangup_cause: record.hangup_cause,
      hangup_time: record.hangup_time ? adjustToGMTMinus3(new Date(record.hangup_time)) : null
    }));

    return {
      success: true,
      records: formattedRecords
    };

  } catch (error) {
    console.error('[exportCallRecords] Erro ao exportar registros:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao exportar os registros.'
    };
  } finally {
    await client.close();
  }
}