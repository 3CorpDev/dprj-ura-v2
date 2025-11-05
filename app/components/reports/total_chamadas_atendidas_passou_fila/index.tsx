import React from 'react';

interface ReportData {
  [key: string]: any;
}

interface TotalChamadasAtendidasPassouFilaProps {
  data: ReportData[];
  loading: boolean;
}

export default function TotalChamadasAtendidasPassouFila({
  data,
  loading
}: TotalChamadasAtendidasPassouFilaProps) {
  
  const formatValue = (value: any, columnName: string) => {
    // Formatação específica baseada no nome da coluna e tipo de dado
    if (value === null || value === undefined) {
      return '-';
    }

    const columnLower = columnName.toLowerCase();
    
    // Formatação para fila - manter como string
    if (columnLower === 'fila') {
      return value.toString();
    }
    
    // Formatação para quantidade - formatar como número
    if (columnLower === 'quantidade') {
      const num = parseInt(value);
      return isNaN(num) ? value : num.toLocaleString('pt-BR');
    }
    
    return value;
  };

  const formatColumnName = (columnName: string) => {
    // Mapeamento específico para os campos da procedure sp_relatorio_filas_conectadas_total
    const columnMap: { [key: string]: string } = {
      'fila': '📞 Fila',
      'quantidade': '📊 Quantidade'
    };
    
    return columnMap[columnName.toLowerCase()] || columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getColumns = () => {
    if (data.length === 0) return [];
    // Retornar apenas as colunas que queremos exibir (fila e quantidade)
    const allColumns = Object.keys(data[0]);
    return allColumns.filter(col => ['fila', 'quantidade'].includes(col.toLowerCase()));
  };

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
      {/* Header elegante para relatório de filas */}
      <div className="px-4 py-3 border-b-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-800">
            <span className="font-semibold text-blue-800">📊 Total de registros: </span>
            <span className="font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded-full text-xs">
              {data.length}
            </span>
          </div>
          <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full border border-gray-200">
            📞 Filas Conectadas
          </div>
        </div>
      </div>

      {/* Tabela com design melhorado */}
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-2 text-left text-sm font-semibold text-white uppercase tracking-wider border-r border-blue-500 last:border-r-0"
                >
                  {formatColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr 
                key={index} 
                className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors duration-200`}
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 last:border-r-0 font-medium"
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
