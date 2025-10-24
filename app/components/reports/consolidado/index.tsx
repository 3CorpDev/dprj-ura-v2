'use client';

import { useEffect, useState } from 'react';

interface ConsolidadoData {
  data_referencia: string;
  tempo_medio_atendimento_segundos: number;
  chamadas_atendidas_fila: number;
  chamadas_atendidas_menos_1_min: number;
  abandonadas_menos_1_min: number;
  abandonadas_mais_1_min: number;
}

interface ConsolidadoProps {
  startDate: string;
  endDate: string;
  sortOrder: 'ASC' | 'DESC';
  onLoadingChange: (loading: boolean) => void;
}

export default function RelatorioConsolidado({ startDate, endDate, sortOrder, onLoadingChange }: ConsolidadoProps) {
  const [data, setData] = useState<ConsolidadoData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = async () => {
    if (!startDate) return;

    console.log('🚀 [Consolidado] Iniciando busca de dados...');
    onLoadingChange(true);
    
    try {
      const params = new URLSearchParams({
        startDate,
        sortOrder
      });
      
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/reports/consolidado?${params}`);
      const result = await response.json();

      if (result.success) {
        console.log('✅ [Consolidado] Dados recebidos:', result.data?.length, 'registros');
        setData(result.data || []);
        setCurrentPage(1);
      } else {
        console.error('❌ [Consolidado] Erro na resposta:', result.error);
        alert('Erro ao carregar dados: ' + result.error);
        setData([]);
      }
    } catch (error) {
      console.error('💥 [Consolidado] Erro na requisição:', error);
      alert('Erro ao carregar dados do relatório consolidado');
      setData([]);
    } finally {
      onLoadingChange(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, sortOrder]);

  const formatTime = (seconds: number) => {
    const roundedSeconds = Math.round(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Referência
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tempo Médio
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Atendidas Fila
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Atendidas &lt; 1min
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Abandonadas &lt; 1min
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Abandonadas &gt; 1min
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {formatDate(row.data_referencia)}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {formatTime(row.tempo_medio_atendimento_segundos)}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {row.chamadas_atendidas_fila}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {row.chamadas_atendidas_menos_1_min}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {row.abandonadas_menos_1_min}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {row.abandonadas_mais_1_min}
                </td>
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