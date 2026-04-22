'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Dog, PawPrint, TrendingUp, FileText, Settings, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentDogs, setRecentDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, dogsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dogs/recent?limit=6'),
      ]);

      const statsData = await statsRes.json();
      const dogsData = await dogsRes.json();

      setStats(statsData);
      setRecentDogs(dogsData.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Resumen de tu kennel y estadísticas generales
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Dog className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats?.totalDogs || 0}</span>
            </div>
            <h3 className="font-semibold text-gray-900">Total Perros</h3>
            <p className="text-sm text-gray-500">Registrados en tu kennel</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <PawPrint className="w-6 h-6 text-pink-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats?.activeLitters || 0}</span>
            </div>
            <h3 className="font-semibold text-gray-900">Camadas Activas</h3>
            <p className="text-sm text-gray-500">Camadas en curso</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats?.avgCOI || 0}%</span>
            </div>
            <h3 className="font-semibold text-gray-900">COI Promedio</h3>
            <p className="text-sm text-gray-500">Índice de endogamia</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats?.pedigreesAnalyzed || 0}</span>
            </div>
            <h3 className="font-semibold text-gray-900">Pedigrees</h3>
            <p className="text-sm text-gray-500">Analizados</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Dog className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">Registrar Nuevo Perro</span>
            </button>
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <PawPrint className="w-5 h-5 text-pink-600" />
              <span className="text-gray-700">Crear Camada</span>
            </button>
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-gray-700">Simular Cría</span>
            </button>
          </div>
        </div>

        {/* Recent Dogs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Perros Recientes</h2>
          {recentDogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentDogs.map((dog) => (
                <div key={dog.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <PawPrint className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{dog.name}</h3>
                      <p className="text-sm text-gray-500">{dog.registrationNumber || 'Sin registro'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay perros registrados aún</p>
          )}
        </div>

        {/* Settings Link */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button className="flex items-center space-x-3 text-gray-700 hover:text-gray-900">
            <Settings className="w-5 h-5" />
            <span>Configuración del Kennel</span>
          </button>
        </div>

        {/* Advertisement Placeholder */}
        <div className="mt-8 bg-gray-200 rounded-lg h-24 flex items-center justify-center text-gray-500">
          <p>Espacio para publicidad futura</p>
        </div>
      </div>
    </div>
  );
}
