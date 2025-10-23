'use server'

import { MongoClient, ObjectId } from 'mongodb';
// import { CallRecord } from '../../types/types';
import { adjustToGMTMinus3 } from '@/lib/utils';

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
const DB_NAME = 'ura_dprj';
const COLLECTION_NAME = 'records';

// Interface para os parâmetros de busca
interface SearchParams {
    searchQuery?: string | null;
    statusCall?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}

// Função para buscar registros de chamadas com paginação
export async function getCallRecordsWithPagination({
    searchQuery = null,
    statusCall = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 20,
    sortField = 'datetime',
    sortOrder = 'desc'
}: SearchParams = {}) {
    try {
        await client.connect();
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Construir a query
        let query: any = {};

        // Adicionar filtro de busca por número, protocolo ou uniqueid
        if (searchQuery) {
            query.$or = [
                { customer_number: { $regex: searchQuery, $options: 'i' } },
                { uniqueid: { $regex: searchQuery, $options: 'i' } },
                { protocol: { $regex: searchQuery, $options: 'i' } },
                { 'metadata.processo': { $regex: searchQuery, $options: 'i' } }
            ];
        }

        // Filtrar por status (ativo/inativo)
        if (statusCall === 'active') {
            query.active = true;
        } else if (statusCall === 'finished') {
            query.active = false;
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

        // Configurar ordenação
        const sort: any = {};
        sort[sortField] = sortOrder === 'asc' ? 1 : -1;

        // Buscar registros com paginação
        const records = await collection
            .find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();

        // Mapear resultados para o formato esperado
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
            hangup_time: record.hangup_time ? adjustToGMTMinus3(new Date(record.hangup_time)) : undefined
        }));

        return {
            records: formattedRecords,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error('[getCallRecordsWithPagination] Erro ao buscar registros:', error);
        throw new Error('Erro ao buscar registros de chamadas');
    } finally {
        await client.close();
    }
}

// Função para obter estatísticas do dashboard
export async function getDashboardStats() {
    try {
        await client.connect();
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Total de ligações
        const totalCalls = await collection.countDocuments();

        // Ligações ativas
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
        // Apenas para chamadas finalizadas que têm hangup_time
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
        console.error('[getDashboardStats] Erro ao buscar estatísticas:', error);
        throw new Error('Erro ao buscar estatísticas do dashboard');
    } finally {
        await client.close();
    }
}

// Função para buscar detalhes de uma chamada específica pelo ID
export async function getCallRecordById(id: string) {
    try {
        await client.connect();
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        const record = await collection.findOne({ _id: new ObjectId(id) });

        if (!record) {
            return null;
        }

        return {
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
            hangup_time: record.hangup_time ? adjustToGMTMinus3(new Date(record.hangup_time)) : undefined
        };

    } catch (error) {
        console.error('[getCallRecordById] Erro ao buscar registro:', error);
        throw new Error('Erro ao buscar detalhes da chamada');
    } finally {
        await client.close();
    }
} 

// // Função para inserir ou atualizar pausa no MongoDB
// export async function insertOrUpdatePause(pauseData: { 
//     extension: string;
//     paused: boolean;
//     pausedReason: string;
//     queue: string;
//     lastPause: string;
// }) {
//     try {
//         await client.connect();
//         const database = client.db(DB_NAME);
//         const collection = database.collection('pauses');

//         const currentTime = Math.floor(Date.now() / 1000);
//         const lastPauseTime = parseInt(pauseData.lastPause);
        
//         // Busca registro existente
//         const existingPause = await collection.findOne({ extension: pauseData.extension });
        
//         let totalPauseTime = 0;
//         if (existingPause) {
//             totalPauseTime = existingPause.totalPauseTime || 0;
//             if (existingPause.lastPause) {
//                 totalPauseTime += (currentTime - lastPauseTime);
//             }
//         }

//         // Atualiza ou insere novo documento
//         await collection.updateOne(
//             { extension: pauseData.extension },
//             {
//                 $set: {
//                     paused: pauseData.paused,
//                     pausedReason: pauseData.pausedReason,
//                     queue: pauseData.queue,
//                     lastPause: pauseData.lastPause,
//                     totalPauseTime: totalPauseTime
//                 }
//             },
//             { upsert: true }
//         );

//         return { success: true };
//     } catch (error) {
//         console.error('[insertOrUpdatePause] Erro ao inserir/atualizar pausa:', error);
//         throw new Error('Erro ao processar pausa');
//     } finally {
//         await client.close();
//     }
// }

// // Função para obter tempo total de pausa por ramal
// export async function getTotalPauseTime(extension: string) {
//     try {
//         await client.connect();
//         const database = client.db(DB_NAME);
//         const collection = database.collection('pauses');

//         const pause = await collection.findOne({ extension });
        
//         if (!pause) {
//             return { totalPauseTime: 0 };
//         }

//         let totalPauseTime = pause.totalPauseTime || 0;

//         // Se estiver em pausa, adiciona o tempo atual
//         if (pause.paused && pause.lastPause) {
//             const currentTime = Math.floor(Date.now() / 1000);
//             const lastPauseTime = parseInt(pause.lastPause);
//             totalPauseTime += (currentTime - lastPauseTime);
//         }

//         return { totalPauseTime };
//     } catch (error) {
//         console.error('[getTotalPauseTime] Erro ao buscar tempo de pausa:', error);
//         throw new Error('Erro ao buscar tempo de pausa');
//     } finally {
//         await client.close();
//     }
// }
