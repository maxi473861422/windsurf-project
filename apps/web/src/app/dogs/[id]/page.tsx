'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PedigreeTree from '@/components/pedigree/PedigreeTree';
import { Loader2, AlertCircle, Calendar, MapPin, PawPrint, Shield, Award } from 'lucide-react';

export default function DogProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [dog, setDog] = useState<any>(null);
  const [pedigree, setPedigree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'pedigree' | 'health' | 'titles'>('info');

  useEffect(() => {
    fetchDogData();
  }, [id]);

  const fetchDogData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dogRes, pedigreeRes] = await Promise.all([
        fetch(`/api/dogs/${id}`),
        fetch(`/api/pedigree/${id}?generations=5`),
      ]);

      if (!dogRes.ok) {
        throw new Error('Error fetching dog data');
      }

      const dogData = await dogRes.json();
      const pedigreeData = await pedigreeRes.json();

      setDog(dogData.data);
      setPedigree(pedigreeData.data);
    } catch (err) {
      setError('Error al cargar los datos del perro. Por favor, intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !dog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Perro no encontrado'}</p>
        </div>
      </div>
    );
  }

  const sexColor = dog.sex === 'MALE' ? 'text-blue-600' : 'text-pink-600';
  const sexLabel = dog.sex === 'MALE' ? 'Macho' : 'Hembra';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="md:flex">
            {/* Photo */}
            <div className="md:w-1/3 bg-gray-100 aspect-square md:aspect-auto">
              {dog.photos?.[0]?.url ? (
                <img
                  src={dog.photos[0].url}
                  alt={dog.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PawPrint className="w-24 h-24 text-gray-300" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="md:w-2/3 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{dog.name}</h1>
                  {dog.registrationNumber && (
                    <p className="text-gray-600">{dog.registrationNumber}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  dog.sex === 'MALE' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                }`}>
                  {sexLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {dog.birthDate && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(dog.birthDate).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
                {dog.country && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{dog.country}</span>
                  </div>
                )}
                {dog.color && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <PawPrint className="w-4 h-4" />
                    <span>{dog.color}</span>
                  </div>
                )}
                {dog.coi5 !== undefined && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Shield className="w-4 h-4" />
                    <span>COI 5G: {(dog.coi5 * 100).toFixed(2)}%</span>
                  </div>
                )}
              </div>

              {/* Parents */}
              {(dog.sire || dog.dam) && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Padres</h3>
                  <div className="flex space-x-4">
                    {dog.sire && (
                      <a href={`/dogs/${dog.sire.id}`} className="text-blue-600 hover:underline">
                        Padre: {dog.sire.name}
                      </a>
                    )}
                    {dog.dam && (
                      <a href={`/dogs/${dog.dam.id}`} className="text-pink-600 hover:underline">
                        Madre: {dog.dam.name}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setActiveTab('pedigree')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pedigree'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pedigree
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'health'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Salud
              </button>
              <button
                onClick={() => setActiveTab('titles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'titles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Títulos
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'info' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Detallada</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Número de Registro</dt>
                    <dd className="mt-1 text-sm text-gray-900">{dog.registrationNumber || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Chip</dt>
                    <dd className="mt-1 text-sm text-gray-900">{dog.chipNumber || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estado</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {dog.isAlive ? 'Vivo' : 'Fallecido'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Criador</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {dog.breeder?.kennelName || dog.breeder?.legalName || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {activeTab === 'pedigree' && pedigree && (
              <PedigreeTree pedigree={pedigree} maxGenerations={5} />
            )}

            {activeTab === 'health' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Registro de Salud</h3>
                {dog.healthRecords && dog.healthRecords.length > 0 ? (
                  <div className="space-y-4">
                    {dog.healthRecords.map((record: any) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{record.type}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            record.result === 'normal' || record.result === 'clear' ? 'bg-green-100 text-green-800' :
                            record.result === 'affected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.result}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{record.notes || 'Sin notas'}</p>
                        {record.date && (
                          <p className="text-xs text-gray-500 mt-2">
                            Fecha: {new Date(record.date).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hay registros de salud disponibles.</p>
                )}
              </div>
            )}

            {activeTab === 'titles' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Títulos y Premios</h3>
                {dog.titles && dog.titles.length > 0 ? (
                  <div className="space-y-4">
                    {dog.titles.map((title: any) => (
                      <div key={title.id} className="flex items-center space-x-3 border border-gray-200 rounded-lg p-4">
                        <Award className="w-5 h-5 text-yellow-500" />
                        <div>
                          <h4 className="font-medium text-gray-900">{title.name}</h4>
                          <p className="text-sm text-gray-600">{title.organization?.name || 'Organización'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hay títulos registrados.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Advertisement Placeholder */}
        <div className="bg-gray-200 rounded-lg h-24 flex items-center justify-center text-gray-500">
          <p>Espacio para publicidad futura</p>
        </div>
      </div>
    </div>
  );
}
