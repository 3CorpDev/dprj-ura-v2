'use client';

import { useEffect, useState } from 'react';

type ReportType = 'consolidado' | 'tempo_medio_atendimento_por_grupo' | 'total_chamadas_atendidas_passou_fila' | 'chamadas_atendidas_menos_1_minuto' | 'chamadas_abandonadas_fila_menos_1_minuto' | 'absenteismo';

interface ReportData {
  [key: string]: any;
}

export default function Report() {
  const [selectedReport, setSelectedReport] = useState<ReportType | ''>('');
  const [data, setData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const reportOptions = [
    { value: '', label: 'Selecione um relatório' },
    { value: 'absenteismo', label: 'Absenteísmo' },
    { value: 'chamadas_atendidas_menos_1_minuto', label: 'Chamadas Atendidas Inferiores a 1 Minuto' },
    { value: 'chamadas_abandonadas_fila_menos_1_minuto', label: 'Chamadas Abandonadas na Fila Inferior a 1 Minuto' },
    { value: 'chamadas_abandonadas_fila_mais_1_minuto', label: 'Chamadas Abandonadas na Fila Superior a 1 Minuto' },
    { value: 'consolidado', label: 'Relatório Consolidado CDR' },
    { value: 'tempo_medio_atendimento_por_grupo', label: 'Tempo Médio de Atendimento por Grupo' },
    { value: 'total_chamadas_atendidas_passou_fila', label: 'Total de Chamadas que Passaram pela Fila' },
    { value: 'total_repeticoes_chamadores', label: 'Total de Repetições por Chamador' }
  ];

  const handleReportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newReport = e.target.value as ReportType | '';
    setSelectedReport(newReport);
    setData([]);
    setCurrentPage(1);
    // Reset dates when changing reports
    setStartDate('');
    setEndDate('');
  };

  // Função para garantir formato de data correto independente do fuso horário
  const formatDateForServer = (dateString: string) => {
    // Garante que a data seja enviada no formato YYYY-MM-DD sem conversão de timezone
    if (!dateString) return '';
    
    // Se já está no formato correto, retorna como está
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    // Se está em outro formato, converte garantindo que não haja mudança de dia
    const date = new Date(dateString + 'T00:00:00'); // Força horário local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Função para formatar data para exibição sem conversão de timezone
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    
    // Se está no formato YYYY-MM-DD, converte diretamente para dd/mm/yyyy
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      const result = `${day}/${month}/${year}`;
      console.log(`🗓️ formatDateForDisplay: ${dateString} → ${result}`);
      return result;
    }
    
    return dateString;
  };

  const fetchReportData = async () => {
    if (!selectedReport || (!startDate && selectedReport !== 'absenteismo')) return;

    console.log(`🚀 [${selectedReport}] Iniciando busca de dados...`);
    
    setLoading(true);
    
    try {
      let apiUrl;
      
      if (selectedReport === 'absenteismo') {
        // Relatório de absenteísmo não precisa de filtros de data
        apiUrl = `/api/reports/${selectedReport}`;
        console.log(`🌐 [${selectedReport}] URL da requisição (sem filtros):`, apiUrl);
      } else {
        // Outros relatórios precisam de filtros de data
        console.log(`🌏 [${selectedReport}] ATENÇÃO: Servidor na China (GMT+8) - enviando datas como strings para evitar conversão automática`);
        
        // Formatar datas para garantir consistência
        const formattedStartDate = formatDateForServer(startDate);
        const formattedEndDate = endDate ? formatDateForServer(endDate) : '';
        
        console.log(`📅 [${selectedReport}] Data inicial original:`, startDate, '→ formatada:', formattedStartDate);
        console.log(`📅 [${selectedReport}] Data final original:`, endDate || 'não definida', '→ formatada:', formattedEndDate || 'não definida');
        
        const params = new URLSearchParams({
          startDate: formattedStartDate,
          sortOrder
        });
        
        if (formattedEndDate) {
          params.append('endDate', formattedEndDate);
        }

        apiUrl = `/api/reports/${selectedReport}?${params}`;
        console.log(`🌐 [${selectedReport}] URL da requisição:`, apiUrl);
      }

      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`✅ [${selectedReport}] Dados recebidos:`, result);
      
      if (result.success) {
        setData(result.data || []);
        setCurrentPage(1);
        console.log(`📊 [${selectedReport}] Total de registros:`, result.data?.length || 0);
      } else {
        console.error(`❌ [${selectedReport}] Erro no resultado:`, result.error);
        setData([]);
      }
    } catch (error) {
      console.error(`💥 [${selectedReport}] Erro na requisição:`, error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport && (startDate || selectedReport === 'absenteismo')) {
      fetchReportData();
    }
  }, [selectedReport, startDate, endDate, sortOrder]);

  const formatValue = (value: any, columnName: string) => {
    // Formatação específica baseada no nome da coluna
    if (typeof value === 'number') {
      // Se for tempo (contém 'tempo', 'duration', 'duração', 'segundos')
      if (columnName.toLowerCase().includes('tempo') || 
          columnName.toLowerCase().includes('duration') || 
          columnName.toLowerCase().includes('duração') ||
          columnName.toLowerCase().includes('segundos')) {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      return value.toLocaleString('pt-BR');
    }
    
    if (typeof value === 'string') {
      // Se parece com data/hora (formato YYYY-MM-DD ou similar)
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          const date = new Date(value);
          // Se tem horário, mostra data e hora
          if (value.includes('T') || value.includes(' ')) {
            return date.toLocaleString('pt-BR');
          }
          // Se é só data, mostra só a data
          return date.toLocaleDateString('pt-BR');
        } catch {
          return value;
        }
      }
      
      // Formatação para canais (remove partes técnicas desnecessárias)
      if (columnName.toLowerCase().includes('canal')) {
        return value.replace(/\-.*$/, ''); // Remove tudo após o primeiro hífen
      }
      
      // Formatação para cliente (limpa CLID se necessário)
      if (columnName.toLowerCase().includes('cliente')) {
        // Remove aspas e caracteres especiais do CLID
        return value.replace(/['"<>]/g, '').trim();
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

  const getColumns = () => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  // Paginação
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);
  const columns = getColumns();

  return (
    <div className="p-4">
      {/* Seletor de Relatório */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="mb-4">
          <select
            value={selectedReport}
            onChange={handleReportChange}
            className="w-full max-w-lg border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {reportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Controles de filtro por data - só aparecem quando um relatório está selecionado */}
        {selectedReport && (
          <>
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 rounded-xl p-1.5 mb-2 shadow-md">
              <h2 className="text-sm font-bold text-blue-900 text-center tracking-wide">
                📊 {reportOptions.find(opt => opt.value === selectedReport)?.label}
              </h2>
            </div>
            
            {/* Ocultar filtros para relatório de absenteísmo */}
            {selectedReport !== 'absenteismo' && (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
                      De:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={startDate ? formatDateForDisplay(startDate) : ''}
                        placeholder="dd/mm/aaaa"
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) value = value.substring(0,2) + '/' + value.substring(2);
                          if (value.length >= 5) value = value.substring(0,5) + '/' + value.substring(5);
                          if (value.length > 10) value = value.substring(0,10);
                          
                          // Converter para formato ISO quando completo
                          if (value.length === 10) {
                            const [day, month, year] = value.split('/');
                            if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
                              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              if (date.getDate() == parseInt(day) && date.getMonth() == parseInt(month) - 1) {
                                setStartDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                              }
                            }
                          } else if (value === '') {
                            setStartDate('');
                          }
                        }}
                        className="w-32 border border-gray-300 rounded-md px-2 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={10}
                      />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-0 cursor-pointer"
                      />
                      <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
                      Até:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={endDate ? formatDateForDisplay(endDate) : ''}
                        placeholder="dd/mm/aaaa"
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) value = value.substring(0,2) + '/' + value.substring(2);
                          if (value.length >= 5) value = value.substring(0,5) + '/' + value.substring(5);
                          if (value.length > 10) value = value.substring(0,10);
                          
                          // Converter para formato ISO quando completo
                          if (value.length === 10) {
                            const [day, month, year] = value.split('/');
                            if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
                              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              if (date.getDate() == parseInt(day) && date.getMonth() == parseInt(month) - 1) {
                                setEndDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                              }
                            }
                          } else if (value === '') {
                            setEndDate('');
                          }
                        }}
                        className="w-32 border border-gray-300 rounded-md px-2 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={10}
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-0 cursor-pointer"
                      />
                      <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
                      Ordem:
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
                      className="w-24 border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="DESC">⬇️ Desc</option>
                      <option value="ASC">⬆️ Asc</option>
                    </select>
                  </div>

                  <div>
                    <button
                      onClick={fetchReportData}
                      disabled={!selectedReport || !startDate || loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-2 rounded-md transition-colors duration-200 flex items-center justify-center"
                      title="Clique para Filtrar"
                    >
                      {loading ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Estado de carregamento */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 text-sm flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Carregando dados...
          </p>
        </div>
      )}

      {/* Tabela de dados */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                Página {currentPage} de {totalPages} ({data.length} registros)
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
                        {formatValue(row[column], column)}
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
                Página {currentPage} de {totalPages} ({data.length} registros)
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
      )}

      {/* Mensagem quando não há dados */}
      {!loading && data.length === 0 && selectedReport && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 text-sm">
            Nenhum dado encontrado para o período selecionado
          </p>
        </div>
      )}

      {/* Mensagem inicial */}
      {!selectedReport && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 text-sm">
            Selecione um relatório para começar
          </p>
        </div>
      )}
    </div>
  );
}