import SearchBar from '@/components/search/SearchBar';
import { Database, TrendingUp, Shield, Users, PawPrint } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <PawPrint className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold">
                GSD Atlas
              </h1>
            </div>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-2xl mx-auto">
              La base de datos genealógica más completa para el Pastor Alemán
            </p>
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">
            Características Principales
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Herramientas profesionales para criadores y entusiastas del Pastor Alemán
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Base de Datos</h3>
              <p className="text-gray-600 text-sm">
                Miles de registros de Pastores Alemanes de todo el mundo
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Pedigree</h3>
              <p className="text-gray-600 text-sm">
                Análisis genealógico avanzado con cálculo de COI
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Salud</h3>
              <p className="text-gray-600 text-sm">
                Registro de pruebas de salud y certificaciones
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Comunidad</h3>
              <p className="text-gray-600 text-sm">
                Conecta con criadores y entusiastas de todo el mundo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Estadísticas de la Plataforma
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-blue-600 mb-2">50,000+</div>
              <div className="text-gray-600">Perros Registrados</div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-green-600 mb-2">100,000+</div>
              <div className="text-gray-600">Pedigrees Analizados</div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-purple-600 mb-2">5,000+</div>
              <div className="text-gray-600">Criadores Activos</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Eres criador?
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Únete a nuestra comunidad y gestiona tu kennel profesionalmente con herramientas avanzadas de análisis genealógico
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Registrarse como Criador
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Más Información
            </button>
          </div>
        </div>
      </section>

      {/* Advertisement Placeholder - Non-intrusive */}
      <section className="py-8 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-500">
            <p>Espacio para publicidad futura</p>
          </div>
        </div>
      </section>
    </div>
  );
}
