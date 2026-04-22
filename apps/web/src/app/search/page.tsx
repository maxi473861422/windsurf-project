'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DogCard from '@/components/dog/DogCard';
import { Loader2, AlertCircle } from 'lucide-react';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (query) {
      fetchDogs();
    }
  }, [query, page]);

  const fetchDogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dogs/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error('Error fetching dogs');
      }
      const data = await response.json();
      setDogs(data.data);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError('Error al cargar los resultados. Por favor, intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resultados de búsqueda
          </h1>
          <p className="text-gray-600">
            {query && `Mostrando resultados para "${query}"`}
            {total > 0 && ` (${total} encontrados)`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loading && dogs.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {dogs.map((dog) => (
                <DogCard
                  key={dog.id}
                  id={dog.id}
                  name={dog.name}
                  registrationNumber={dog.registrationNumber}
                  sex={dog.sex}
                  birthDate={dog.birthDate}
                  color={dog.color}
                  country={dog.country}
                  photoUrl={dog.photos?.[0]?.url}
                  coi={dog.coi5}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-4 py-2 rounded-lg ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}

        {/* No Results */}
        {!loading && dogs.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-gray-600">
              Intenta con otros términos de búsqueda o filtros diferentes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
