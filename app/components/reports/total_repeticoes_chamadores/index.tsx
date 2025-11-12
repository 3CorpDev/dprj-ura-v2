'use client';

import { useEffect, useState } from 'react';

interface TotalRepeticoesData {
  Data: string;
  Origem: string;
  Repetições: number;
  Classificação: string;
}

interface TotalRepeticoesProps {
  startDate: string;
  endDate: string;
  sortOrder: 'ASC' | 'DESC';
  onLoadingChange: (loading: boolean) => void;
}

export default function ChamadasRepeticoesChamadores({ startDate, endDate, sortOrder, onLoadingChange }: TotalRepeticoesProps) {
  const [data, setData] = useState<TotalRepeticoesData[]>([]);
  const [filteredData, setFilteredData] = useState<TotalRepeticoesData[]>([]);
  const [origemFilter, setOrigemFilter] = useState<string>('');
  const [availableOrigens, setAvailableOrigens] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

    // Formatação de valores
  const formatValue = (value: any, columnName: string) => {
    if (typeof value === 'number') {
      // Se for tempo (duração ou segundos)
      if (columnName.toLowerCase().includes('duracao') || 
          columnName.toLowerCase().includes('segundos')) {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      return value.toLocaleString('pt-BR');
    }
    
    if (typeof value === 'string') {
      // Se parece com data/hora
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          const date = new Date(value);
          return date.toLocaleString('pt-BR');
        } catch {
          return value;
        }
      }
      
      // Formatação para canais (remove partes técnicas)
      if (columnName.toLowerCase().includes('canal')) {
        return value.replace(/\-.*$/, '');
      }
      
      // Formatação para cliente (limpa CLID)
      if (columnName.toLowerCase().includes('cliente')) {
        return value.replace(/['"<>]/g, '').trim();
      }
    }
    
    return value;
  };

  const fetchData = async () => {
    if (!startDate) return;

    console.log('🚀 [TotalRepeticoesChamadores] Iniciando busca de dados...');
    onLoadingChange(true);
    
    try {
      const params = new URLSearchParams({
        startDate,
        sortOrder
      });
      
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/reports/total_repeticoes_chamadores?${params}`);
      const result = await response.json();

      if (result.success) {
        console.log('✅ [TotalRepeticoesChamadores] Dados recebidos:', result.data?.length, 'registros');
        setData(result.data || []);
        
        // Extrair origens únicas para o filtro
        const allOrigins = (result.data || []).map((item: any) => String(item.Origem || ''));
        const uniqueOrigins = Array.from(new Set(allOrigins)) as string[];
        setAvailableOrigens(uniqueOrigins.sort());
        
        setCurrentPage(1);
      } else {
        console.error('❌ [TotalRepeticoesChamadores] Erro na resposta:', result.error);
        alert('Erro ao carregar dados: ' + result.error);
      }
    } catch (error) {
      console.error('💥 [TotalRepeticoesChamadores] Erro na requisição:', error);
      alert('Erro ao conectar com o servidor');
    } finally {
      onLoadingChange(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, sortOrder]);

  // Efeito para filtrar dados baseado na origem
  useEffect(() => {
    if (!data) {
      setFilteredData([]);
      return;
    }
    
    let filtered = data;
    
    // Filtrar por origem se selecionada
    if (origemFilter) {
      filtered = filtered.filter(item => item.Origem === origemFilter);
      console.log(`🔍 [TotalRepeticoesChamadores] Filtrando por origem "${origemFilter}" - ${filtered.length} registros encontrados`);
    } else {
      console.log(`📋 [TotalRepeticoesChamadores] Mostrando todos os registros - ${filtered.length} total`);
    }
    
    setFilteredData(filtered);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  }, [data, origemFilter]);

  const formatColumnName = (columnName: string) => {
    const columnMap: { [key: string]: string } = {
      'Data': 'Data',
      'Origem': 'Origem (Chamador)',
      'Repetições': 'Repetições',
      'Classificação': 'Classificação'
    };

    return columnMap[columnName] || columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 text-sm">
          {data.length === 0 
            ? 'Nenhuma repetição para o período selecionado'
            : 'Nenhuma repetição encontrada para os filtros aplicados'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Filtros */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm">
              <label className="text-gray-700 mr-3 font-medium">🔍 Filtrar por Origem (Chamador):</label>
              <select
                value={origemFilter}
                onChange={(e) => setOrigemFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white min-w-[250px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">📋 Todas as origens ({availableOrigens.length} diferentes)</option>
                {availableOrigens.map((origem) => (
                  <option key={origem} value={origem}>
                    📞 {origem}
                  </option>
                ))}
              </select>
            </div>
            
            {origemFilter && (
              <button
                onClick={() => setOrigemFilter('')}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors"
              >
                ✕ Limpar filtro
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-md border">
            {filteredData.length !== data.length ? (
              <span className="text-blue-700 font-medium">
                📊 Mostrando {filteredData.length} de {data.length} registros
              </span>
            ) : (
              <span>
                📈 Total: {data.length} registros
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controles de paginação no topo */}
      <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center text-xs text-gray-700">
          <span className="mr-1">Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-1 py-1 text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-1">registros</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            ‹ Anterior
          </button>
          
          <span className="text-xs text-gray-700 px-2">
            Página {currentPage} de {totalPages} ({filteredData.length} registros)
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Próxima ›
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {formatColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {currentData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900"
                  >
                    {formatValue(row[column as keyof TotalRepeticoesData], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles de paginação no final */}
      <div className="px-3 py-2 border-t border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center text-xs text-gray-700">
          <span className="mr-1">Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-1 py-1 text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-1">registros</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            ‹ Anterior
          </button>
          
          <span className="text-xs text-gray-700 px-2">
            Página {currentPage} de {totalPages} ({filteredData.length} registros)
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Próxima ›
          </button>
        </div>
      </div>
    </div>
  );
}
