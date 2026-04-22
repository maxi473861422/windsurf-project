'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
          <div className="pl-4">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, número de registro, criador..."
            className="flex-1 px-4 py-3 outline-none text-gray-900 placeholder-gray-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="pr-2"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-l border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
        </div>
      </form>

      {showFilters && (
        <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexo
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="MALE">Macho</option>
                <option value="FEMALE">Hembra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                País
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="ES">España</option>
                <option value="DE">Alemania</option>
                <option value="US">Estados Unidos</option>
                <option value="FR">Francia</option>
                <option value="IT">Italia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="BLACK_TAN">Negro y Fuego</option>
                <option value="SABLE">Sable</option>
                <option value="BLACK">Negro</option>
                <option value="BI_COLOR">Bicolor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="ALIVE">Vivo</option>
                <option value="DECEASED">Fallecido</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
