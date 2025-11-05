'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AbsenteismoData {
  nome_agente: string;
  ramal: string;
  total_dias_ativos: number;
  dias_7_dias: number;
  dias_15_dias: number;
  dias_30_dias: number;
  ultimo_dia_ativo: string;
}

interface AbsenteismoProps {
  onLoadingChange: (loading: boolean) => void;
}

export default function Absenteismo({ onLoadingChange }: AbsenteismoProps) {
  const [data, setData] = useState<AbsenteismoData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Função para obter o número de dias no mês
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Função para converter mês/ano em datas de início e fim
  const getDateRangeFromMonth = (monthYear: string) => {
    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
    
    return { startDate, endDate };
  };

  const fetchData = async (monthYear?: string) => {
    console.log('🚀 [Absenteísmo] Iniciando busca de dados...');
    onLoadingChange(true);
    
    try {
      let url = '/api/reports/absenteismo';
      
      // Se foi fornecido mês/ano, adiciona as datas como parâmetros
      if (monthYear) {
        const { startDate, endDate } = getDateRangeFromMonth(monthYear);
        url += `?startDate=${startDate}&endDate=${endDate}`;
        console.log(`📅 [Absenteísmo] Buscando dados para período: ${startDate} a ${endDate}`);
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        console.log('✅ [Absenteísmo] Dados recebidos:', result.data?.length, 'registros');
        setData(result.data || []);
        setCurrentPage(1);
        setHasSearched(true);
      } else {
        console.error('❌ [Absenteísmo] Erro na resposta:', result.error);
        alert('Erro ao carregar dados: ' + result.error);
      }
    } catch (error) {
      console.error('💥 [Absenteísmo] Erro na requisição:', error);
      alert('Erro ao conectar com o servidor');
    } finally {
      onLoadingChange(false);
    }
  };

  const handleSearch = () => {
    if (selectedMonth) {
      fetchData(selectedMonth);
    } else {
      alert('Por favor, selecione um mês e ano para consultar.');
    }
  };

  // Remover o useEffect que carregava automaticamente
  // useEffect(() => {
  //   fetchData();
  // }, []);

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

  const formatColumnName = (columnName: string) => {
    const columnMap: { [key: string]: string } = {
      'nome_agente': 'Agente',
      'ramal': 'Ramal',
      'total_dias_ativos': 'Dias Ativos',
      'dias_7_dias': '7 Dias',
      'dias_15_dias': '15 Dias',
      'dias_30_dias': '30 Dias',
      'ultimo_dia_ativo': 'Último Dia Ativo'
    };

    return columnMap[columnName] || columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Paginação
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Renderizar seletor de mês/ano sempre no topo
  const renderMonthSelector = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1">
          <label htmlFor="month-selector" className="block text-sm font-medium text-gray-700 mb-2">
            📅 Selecione o Mês/Ano para Consulta
          </label>
          <Input
            id="month-selector"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto"
            placeholder="Selecione mês/ano"
          />
        </div>
        <Button 
          onClick={handleSearch}
          disabled={!selectedMonth}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
        >
          🔍 Consultar Absenteísmo
        </Button>
      </div>
      {selectedMonth && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
          <span className="font-medium">Período selecionado:</span> {
            (() => {
              const { startDate, endDate } = getDateRangeFromMonth(selectedMonth);
              return `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
            })()
          }
        </div>
      )}
    </div>
  );

  // Se não pesquisou ainda ou não tem dados, mostrar apenas o seletor
  if (!hasSearched) {
    return (
      <div>
        {renderMonthSelector()}
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 text-sm">
            👆 Selecione um mês/ano acima para consultar os dados de absenteísmo
          </p>
        </div>
      </div>
    );
  }

  if (data.length === 0 && hasSearched) {
    return (
      <div>
        {renderMonthSelector()}
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 text-sm">
            📊 Nenhum dado de absenteísmo encontrado para o período selecionado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderMonthSelector()}
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
                    {formatValue(row[column as keyof AbsenteismoData], column)}
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
    </div>
  );
}
