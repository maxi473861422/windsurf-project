'use client';

import { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle, Info, Search } from 'lucide-react';

export default function SimulatorPage() {
  const [sireId, setSireId] = useState('');
  const [damId, setDamId] = useState('');
  const [sireData, setSireData] = useState<any>(null);
  const [damData, setDamData] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (type: 'sire' | 'dam') => {
    const id = type === 'sire' ? sireId : damId;
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dogs/${id}`);
      if (!response.ok) {
        throw new Error('Perro no encontrado');
      }
      const data = await response.json();
      if (type === 'sire') {
        setSireData(data.data);
      } else {
        setDamData(data.data);
      }
    } catch (err) {
      setError('Error al buscar el perro. Verifica el ID.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!sireData || !damData) {
      setError('Debes seleccionar ambos padres');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/breeding/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sireId: sireData.id,
          damId: damData.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al simular la cría');
      }

      const data = await response.json();
      setSimulation(data);
    } catch (err) {
      setError('Error al simular la cría. Por favor, intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCOIColor = (coi: number) => {
    if (coi < 0.0625) return 'text-green-600 bg-green-50';
    if (coi < 0.125) return 'text-yellow-600 bg-yellow-50';
    if (coi < 0.25) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthRiskColor = (risk: string) => {
    if (risk === 'low') return 'text-green-600 bg-green-50';
    if (risk === 'medium') return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Calculator className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Simulador de Cría</h1>
          </div>
          <p className="text-gray-600">
            Analiza la compatibilidad genética entre dos ejemplares antes de la cría
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Parent Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Sire */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Padre (Macho)</h2>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={sireId}
                onChange={(e) => setSireId(e.target.value)}
                placeholder="ID del padre"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSearch('sire')}
                disabled={loading || !sireId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {sireData && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{sireData.name}</h3>
                <p className="text-sm text-gray-600">{sireData.registrationNumber}</p>
                <p className="text-sm text-blue-600 mt-1">COI 5G: {(sireData.coi5 * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>

          {/* Dam */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Madre (Hembra)</h2>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={damId}
                onChange={(e) => setDamId(e.target.value)}
                placeholder="ID de la madre"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSearch('dam')}
                disabled={loading || !damId}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {damData && (
              <div className="bg-pink-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{damData.name}</h3>
                <p className="text-sm text-gray-600">{damData.registrationNumber}</p>
                <p className="text-sm text-pink-600 mt-1">COI 5G: {(damData.coi5 * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Simulate Button */}
        <div className="mb-8">
          <button
            onClick={handleSimulate}
            disabled={loading || !sireData || !damData}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Calculando...' : 'Simular Cría'}
          </button>
        </div>

        {/* Results */}
        {simulation && (
          <div className="space-y-6">
            {/* COI Result */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Coeficiente de Endogamia (COI)</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCOIColor(simulation.coi)}`}>
                  {simulation.coiPercentage}%
                </span>
              </div>
              <p className="text-gray-600 mb-4">
                El COI estima la probabilidad de que dos alelos sean idénticos por descendencia.
              </p>
              {simulation.commonAncestors && simulation.commonAncestors.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Ancestros Comunes</h3>
                  <ul className="space-y-2">
                    {simulation.commonAncestors.map((ancestor: any, index: number) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{ancestor.name}</span>
                        <span className="text-gray-500">{(ancestor.contribution * 100).toFixed(2)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Health Risks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Riesgos de Salud</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(simulation.healthRisks || {}).map(([key, risk]: [string, any]) => (
                  <div key={key} className={`p-4 rounded-lg ${getHealthRiskColor(risk.risk)}`}>
                    <h3 className="font-medium text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h3>
                    <p className="text-sm text-gray-600">Riesgo: {risk.risk}</p>
                    {risk.probability !== undefined && (
                      <p className="text-sm text-gray-600">Probabilidad: {(risk.probability * 100).toFixed(0)}%</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones</h2>
              <ul className="space-y-3">
                {simulation.recommendations && simulation.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start space-x-3">
                    {rec.includes('High') || rec.includes('Alta') ? (
                      <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                    ) : rec.includes('baja') || rec.includes('low') ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    )}
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Advertisement Placeholder */}
        <div className="mt-8 bg-gray-200 rounded-lg h-24 flex items-center justify-center text-gray-500">
          <p>Espacio para publicidad futura</p>
        </div>
      </div>
    </div>
  );
}
