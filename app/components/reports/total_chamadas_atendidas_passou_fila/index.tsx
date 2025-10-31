import React from 'react';

interface ReportData {
  [key: string]: any;
}

interface TotalChamadasAtendidasPassouFilaProps {
  data: ReportData[];
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export default function TotalChamadasAtendidasPassouFila({
  data,
  loading,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}: TotalChamadasAtendidasPassouFilaProps) {
  
  const formatValue = (value: any, columnName: string) => {
    // Formatação específica baseada no nome da coluna e tipo de dado
    if (value === null || value === undefined) {
      return '-';
    }

    const columnLower = columnName.toLowerCase();
    
    // Formatação para datas
    if (columnLower.includes('data') || value.match?.(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return new Date(value).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return value;
      }
    }
    
    // Formatação para telefone
    if (columnLower.includes('telefone') && typeof value === 'string') {
      // Formatar telefone brasileiro
      const digits = value.replace(/\D/g, '');
      if (digits.length === 11) {
        return `(${digits.substr(0,2)}) ${digits.substr(2,5)}-${digits.substr(7,4)}`;
      } else if (digits.length === 10) {
        return `(${digits.substr(0,2)}) ${digits.substr(2,4)}-${digits.substr(6,4)}`;
      }
      return value;
    }
    
    // Para nome_fila e agente - manter como string
    if (columnLower.includes('fila') || columnLower.includes('agente')) {
      return value.toString();
    }
    
    return value;
  };

  const formatColumnName = (columnName: string) => {
    // Mapeamento específico para os campos da procedure sp_consulta_fila
    const columnMap: { [key: string]: string } = {
      'data': '📅 Data/Hora',
      'nome_fila': '📞 Fila', 
      'agente': '👤 Agente',
      'telefone': '📱 Telefone'
    };
    
    return columnMap[columnName.toLowerCase()] || columnName
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 text-sm flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Carregando dados...
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 text-sm">
          Nenhum dado encontrado para o período selecionado
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Controles de paginação no topo */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center text-sm text-gray-700">
          <span className="mr-2">Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2">registros</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            ‹ Anterior
          </button>
          
          <span className="text-sm text-gray-700 px-3">
            Página {currentPage} de {totalPages} ({data.length} registros)
          </span>
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Próxima ›
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {formatColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                  >
                    {formatValue(row[column], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
