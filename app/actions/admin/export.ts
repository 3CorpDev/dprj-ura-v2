'use server'

import { adjustToGMTMinus3 } from "@/lib/utils";
import { exportCallRecords } from "../callRecords";

// Função para gerar um arquivo CSV a partir dos registros
export async function generateCSV(
  searchQuery: string | null, 
  statusCall: string | null,
  startDate?: string | null,
  endDate?: string | null,
  optionFilter: string | null = null
) {
  try {

    if (statusCall === 'active') {
      statusCall = 'active';
    } else if (statusCall === 'finished') {
      statusCall = 'finished';
    } else {
      statusCall = 'all';
    }

    const result = await exportCallRecords(
      searchQuery,
      statusCall,
      startDate,
      endDate,
      optionFilter
    );

    if (!result.success || !result.records) {
      return {
        success: false,
        message: 'Não foi possível gerar o relatório.'
      };
    }

    // Cabeçalhos CSV
    const headers = [
      'ID',
      'Data/Hora',
      'Telefone',
      'ID Unico',
      'Protocolo',
      'Processo',
      'CPF',
      'Status',
      'Opcao',
      'Sub-opcao',
      'ID IVR',
      'Data de Termino',
    //   'Causa de Termino'
    ];

    // Transformar registros em linhas CSV
    const records = result.records;
    const rows = records.map(record => [
      record._id,
      adjustToGMTMinus3(new Date(record.datetime)).toLocaleString('pt-BR'),
      record.customer_number,
      record.uniqueid,
      record.protocol || 'Cliente nao informou Protocolo',
      record.metadata?.processo || 'Cliente nao informou Processo',
      record.metadata?.cpf || 'Cliente nao informou CPF',
      record.active ? 'Ativo' : 'Finalizado',
      record.metadata?.option || 'Cliente nao informou Opcao',
      record.metadata?.suboption || 'Cliente nao informou Sub-opcao',
      record.ivr_id || '',
      record.hangup_time ? adjustToGMTMinus3(new Date(record.hangup_time)).toLocaleString('pt-BR') : '',
    //   record.hangup_cause || ''
    ]);

    // Criar conteúdo CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(field => {
          // Garantir que campos com vírgulas sejam cercados por aspas
          if (String(field).includes(',')) {
            return `"${field}"`;
          }
          return field;
        }).join(',')
      )
    ].join('\n');

    // Formatação da data para o nome do arquivo
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    return {
      success: true,
      filename: `relatorio_ligacoes_${dateStr}.csv`,
      content: csvContent
    };
  } catch (error) {
    console.error('[generateCSV] Erro ao gerar CSV:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao gerar o arquivo CSV.'
    };
  }
} 