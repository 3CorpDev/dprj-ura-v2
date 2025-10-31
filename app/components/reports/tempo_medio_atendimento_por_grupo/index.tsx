'use client';

import { useEffect, useState } from 'react';

interface TempoMedioData {
  [key: string]: any; // Estrutura flexível para se adaptar aos campos retornados pela procedure
}

interface TempoMedioProps {
  startDate: string;
  endDate: string;
  sortOrder: 'ASC' | 'DESC';
  onLoadingChange: (loading: boolean) => void;
}

export default function RelatorioTempoMedioPorGrupo({ startDate, endDate, sortOrder, onLoadingChange }: TempoMedioProps) {
  const [data, setData] = useState<TempoMedioData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = async () => {
    if (!startDate) return;

    console.log('🚀 [TempoMedio] Iniciando busca de dados...');
    onLoadingChange(true);
    
    try {
      const params = new URLSearchParams({
        startDate,
        sortOrder
      });
      
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/reports/tempo_medio_atendimento_por_grupo?${params}`);
      const result = await response.json();

      if (result.success) {
        console.log('✅ [TempoMedio] Dados recebidos:', result.data?.length, 'registros');
        const reportData = result.data || [];
        setData(reportData);
        
        // Extrair colunas dinamicamente do primeiro registro
        if (reportData.length > 0) {
          setColumns(Object.keys(reportData[0]));
        } else {
          setColumns([]);
        }
        
        setCurrentPage(1);
      } else {
        console.error('❌ [TempoMedio] Erro na resposta:', result.error);
        alert('Erro ao carregar dados: ' + result.error);
        setData([]);
        setColumns([]);
      }
    } catch (error) {
      console.error('💥 [TempoMedio] Erro na requisição:', error);
      alert('Erro ao carregar dados do relatório de tempo médio por grupo');
      setData([]);
      setColumns([]);
    } finally {
      onLoadingChange(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, sortOrder]);

  const formatValue = (value: any, columnName: string) => {
    // Formatação específica baseada no nome da coluna
    if (typeof value === 'number') {
      // Se for tempo em segundos, converte para mm:ss
      if (columnName.toLowerCase().includes('tempo') && columnName.toLowerCase().includes('segundo')) {
        const roundedSeconds = Math.round(value);
        const mins = Math.floor(roundedSeconds / 60);
        const secs = roundedSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      }
      // Outros números, retorna como está
      return value.toLocaleString('pt-BR');
    }
    
    // Se for data, formata para pt-BR
    if (columnName.toLowerCase().includes('data') && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString('pt-BR');
      } catch {
        return value;
      }
    }
    
    return value;
  };

  const formatColumnName = (columnName: string) => {
    // Converte snake_case para título legível
    return columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Paginação
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 text-sm">
          {startDate ? 'Nenhum dado encontrado para o período selecionado' : 'Configure as datas para visualizar o relatório'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-xs">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {formatColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column} className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                    {formatValue(row[column], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação compacta */}
      <div className="bg-white px-3 py-2 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xs text-gray-700">
              {startIndex + 1} a {Math.min(endIndex, data.length)} de {data.length}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-3 border border-gray-300 rounded px-1 py-0.5 text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ‹
            </button>
            
            <span className="text-xs text-gray-700 px-2">
              {currentPage}/{totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}