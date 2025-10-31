'use client';

import { useState } from 'react';

export default function PageTurnover() {
  const [formData, setFormData] = useState({
    totalFuncionarios: '',
    admissoes: '',
    demissoes: ''
  });
  
  const [result, setResult] = useState<{
    turnover: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTurnover = () => {
    setLoading(true);
    
    try {
      const totalFuncionarios = parseFloat(formData.totalFuncionarios) || 0;
      const admissoes = parseFloat(formData.admissoes) || 0;
      const demissoes = parseFloat(formData.demissoes) || 0;

      // Validação básica
      if (totalFuncionarios <= 0) {
        alert('Por favor, preencha o número total de funcionários.');
        return;
      }

      // Fórmula simplificada: (Admissões + Demissões) / 2 / Total de funcionários × 100
      const turnoverCalculado = ((admissoes + demissoes) / 2) / totalFuncionarios * 100;

      setResult({
        turnover: parseFloat(turnoverCalculado.toFixed(2))
      });

    } catch (error) {
      console.error('Erro no cálculo:', error);
      alert('Erro ao calcular. Verifique os valores inseridos.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      totalFuncionarios: '',
      admissoes: '',
      demissoes: ''
    });
    setResult(null);
  };

  return (
    <div className="p-6">
      {/* Título com largura total */}
      <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl p-1.5 mb-6 shadow-md">
        <h2 className="text-sm font-bold text-green-900 text-center tracking-wide">
          🧮 Calculadora de Turnover
        </h2>
      </div>
      
      {/* Formulário centralizado */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Fórmula:</strong> (Admissões + Demissões) ÷ 2 ÷ Total de Funcionários × 100
                <br />
                <strong>Como usar:</strong> Insira o total de funcionários, número de admissões e demissões do período e clique em "Calcular".
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Total de Funcionários
            </label>
            <input
              type="number"
              name="totalFuncionarios"
              value={formData.totalFuncionarios}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Total de Admissões
            </label>
            <input
              type="number"
              name="admissoes"
              value={formData.admissoes}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Total de Demissões
            </label>
            <input
              type="number"
              name="demissoes"
              value={formData.demissoes}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={calculateTurnover}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg px-5 py-2.5 transition-all duration-200 flex items-center shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculando...
              </>
            ) : (
              'Calcular'
            )}
          </button>

          <button
            onClick={resetForm}
            className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white focus:ring-4 focus:ring-green-300 font-medium rounded-lg px-5 py-2.5 transition-all duration-200 shadow-sm"
          >
            Limpar
          </button>
        </div>

        {/* Resultado */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              📈 Resultado do Turnover
            </h3>
            
            <div className="flex justify-center">
              <div className="bg-white p-8 rounded-lg border-2 border-green-200 text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">{result.turnover}%</div>
                <div className="text-lg text-gray-700 font-medium">Taxa de Turnover</div>
                <div className="text-sm text-gray-500 mt-2">
                  Fórmula: (Admissões + Demissões) ÷ 2 ÷ Total de Funcionários × 100
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded border text-xs text-gray-600">
              <strong>Interpretação:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>Até 5%:</strong> Turnover baixo - boa retenção</li>
                <li>• <strong>5% a 10%:</strong> Turnover moderado - aceitável</li>
                <li>• <strong>10% a 15%:</strong> Turnover alto - atenção necessária</li>
                <li>• <strong>Acima de 15%:</strong> Turnover muito alto - ação urgente</li>
              </ul>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}