'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';

const formatValue = (value: any, type: string) => {
  if (type === 'Date') {
    const date = new Date(value);
    return date.toLocaleDateString('pt-BR');
  }
  if (type === 'Number') {
    return Number(value).toLocaleString('pt-BR');
  }
  return value;
};

export default function Report() {
  const [selectedReport, setSelectedReport] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [colunas, setColunas] = useState<{ campo: string; alias: string; type: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const options = [
    { value: '', label: 'Selecione um relatório' },
    { value: 'relatorio1', label: 'Tempo Médio por Grupo de Atendentes' },
    { value: 'relatorio2', label: 'Quantidade Atendidas que passaram por Fila' },
    { value: 'relatorio3', label: 'Total Inferior a 1 Minuto' },
    { value: 'relatorio4', label: 'Total Abandonadas em Fila (< 1 min)' },
    { value: 'relatorio5', label: 'Total Abandonadas em Fila (> 1 min + repetições)' }
  ];

  const bodies = [
    {
      option: 'relatorio1',
      banco: 'asteriskcdrdb',
      tabela: 'cdr',
      campos: [{ campo: 'calldate', alias: 'Data', type: 'Date' }, { campo: 'src', alias: 'Ramal', type: 'Int' }, { campo: 'channel', alias: 'Canal', type: 'String' }, { campo: 'clid', alias: 'CL ID', type: 'String' }, { campo: 'disposition', alias: 'Dispositivo', type: 'String' }],
      where: [{ campo: 'src', valor: '7007', operacao: '=' }],
      whereType: 'AND',
      orderby: { campo: 'clid', direcao: 'ASC' },
      limit: 1000
    },
    {
      option: 'relatorio2',
      banco: 'asteriskcdrdb',
      tabela: 'cdr',
      campos: [{ campo: 'calldate', alias: 'Data', type: 'Date' }, { campo: 'src', alias: 'Ramal', type: 'Int' }, { campo: 'channel', alias: 'Canal', type: 'String' }, { campo: 'disposition', alias: 'Dispositivo', type: 'String' }, { campo: 'clid', alias: 'CL ID', type: 'String' }],
      where: [{ campo: 'src', valor: '7007', operacao: '=' }],
      whereType: 'AND',
      orderby: { campo: 'clid', direcao: 'ASC' },
      limit: 1000
    },
    {
      option: 'relatorio3',
      banco: 'asteriskcdrdb',
      tabela: 'cdr',
      campos: [{ campo: 'calldate', alias: 'Data', type: 'Date' }, { campo: 'src', alias: 'Ramal', type: 'Int' }, { campo: 'disposition', alias: 'Dispositivo', type: 'String' }, { campo: 'channel', alias: 'Canal', type: 'String' }, { campo: 'clid', alias: 'CL ID', type: 'String' }],
      where: [{ campo: 'src', valor: '7007', operacao: '=' }],
      whereType: 'AND',
      orderby: { campo: 'clid', direcao: 'ASC' },
      limit: 1000
    },
    {
      option: 'relatorio4',
      banco: 'asteriskcdrdb',
      tabela: 'cdr',
      campos: [{ campo: 'calldate', alias: 'Data', type: 'Date' }, { campo: 'disposition', alias: 'Dispositivo', type: 'String' }, { campo: 'src', alias: 'Ramal', type: 'Int' }, { campo: 'channel', alias: 'Canal', type: 'String' }, { campo: 'clid', alias: 'CL ID', type: 'String' }],
      where: [{ campo: 'src', valor: '7007', operacao: '=' }],
      whereType: 'AND',
      orderby: { campo: 'clid', direcao: 'ASC' },
      limit: 1000
    },
    {
      option: 'relatorio5',
      banco: 'asteriskcdrdb',
      tabela: 'cdr',
      campos: [{ campo: 'disposition', alias: 'Dispositivo', type: 'String' }, { campo: 'calldate', alias: 'Data', type: 'Date' }, { campo: 'src', alias: 'Ramal', type: 'Int' }, { campo: 'channel', alias: 'Canal', type: 'String' }, { campo: 'clid', alias: 'CL ID', type: 'String' }],
      where: [{ campo: 'src', valor: '7007', operacao: '=' }],
      whereType: 'AND',
      orderby: { campo: 'clid', direcao: 'ASC' },
      limit: 1000
    }
  ];

  const selectedBody = bodies.find((b) => b.option === selectedReport);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const limit = rowsPerPage;

  const offset = (page - 1) * limit;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReport(e.target.value);
    setFilters({});
    setData([]);
    setColunas([]);
    setPage(1);
  };

  const handleFilterChange = (campo: string, valor: string) => {
    setFilters((prev) => ({ ...prev, [campo]: valor }));
    setPage(1);
  };

  const fetchData = async () => {
    if (!selectedBody) return;

    const dynamicWhere = [...selectedBody.where];
    Object.entries(filters).forEach(([campo, valor]) => {
      if (valor.trim() !== '') {
        dynamicWhere.push({ campo, valor: `%${valor}%`, operacao: 'LIKE' });
      }
    });

    const payload = {
      tabela: selectedBody.tabela,
      campos: selectedBody.campos,
      where: dynamicWhere,
      whereType: selectedBody.whereType,
      orderby: selectedBody.orderby,
      limit,
      offset
    };

    setLoading(true);
    try {
      const res = await fetch('/api/query/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setColunas(result.colunas || []);
        setTotal(result.total || 0);
      } else {
        setData([]);
        setColunas([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Erro ao buscar relatório:', err);
      setData([]);
      setColunas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchData();
    }
  }, [selectedReport, filters, page, rowsPerPage]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <select
        value={selectedReport}
        onChange={handleSelectChange}
        className="w-full p-3 border border-gray-300 rounded-lg"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {colunas.length > 0 && (
        // Para ajustar a quantidade de colunas altere a propriedade: md:grid-cols-5
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> 
          {colunas.map((col) => {
            const value = filters[col.campo] || '';

            if (col.type === 'Date') {
              const parsedDate = value ? new Date(value) : null;

              return (
                <div key={col.campo}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{col.alias}</label>
                  <DatePicker
                    selected={parsedDate}
                    onChange={(date: Date | null) => {
                      const formatted = date
                      ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                          .toISOString()
                          .split('T')[0]
                      : '';
                      handleFilterChange(col.campo, formatted);
                    }}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={`Filtrar por ${col.alias}`}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              );
            }

            const inputType = col.type === 'Int' || col.type === 'Number' ? 'number' : 'text';

            return (
              <div key={col.campo}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{col.alias}</label>
                <input
                  type={inputType}
                  placeholder={`Filtrar por ${col.alias}`}
                  value={value}
                  onChange={(e) => handleFilterChange(col.campo, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end items-center mb-2">
        <label className="mr-2 text-sm text-gray-700">Linhas por página:</label>
        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(1); // reinicia na primeira página
          }}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          {[10, 20, 50, 100].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Carregando dados...</p>}

      {!loading && data.length > 0 && (
        <>
          <div className="overflow-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  {colunas.map((col) => (
                    <th key={col.alias} className="p-2 border border-gray-300 text-left">
                      {col.alias}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {colunas.map((col) => (
                      <td key={col.alias} className="p-2 border border-gray-300">
                        {formatValue(row[col.alias], col.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </>
      )}

      {!loading && selectedReport && data.length === 0 && (
        <p className="text-gray-500">Nenhum dado encontrado.</p>
      )}
    </div>
  );
}
