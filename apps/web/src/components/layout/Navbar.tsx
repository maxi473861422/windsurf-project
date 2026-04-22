'use client';

import Link from 'next/link';
import { Search, User, Menu, X, Database, Upload, Calculator, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">GSD</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Atlas</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/search" className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1">
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1">
              <Database className="w-4 h-4" />
              <span>Base de Datos</span>
            </Link>
            <Link href="/pedigree" className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>Pedigree</span>
            </Link>
            <Link href="/simulator" className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1">
              <Calculator className="w-4 h-4" />
              <span>Simulador</span>
            </Link>
            <Link href="/import" className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1">
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </Link>
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/login" className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </Link>
            <Link
              href="/auth/register"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Registrarse
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 py-3 space-y-3">
            <Link
              href="/search"
              className="block text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </Link>
            <Link
              href="/dashboard"
              className="block text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Database className="w-4 h-4" />
              <span>Base de Datos</span>
            </Link>
            <Link
              href="/pedigree"
              className="block text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Pedigree</span>
            </Link>
            <Link
              href="/simulator"
              className="block text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Calculator className="w-4 h-4" />
              <span>Simulador</span>
            </Link>
            <Link
              href="/import"
              className="block text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </Link>
            <div className="border-t border-gray-200 pt-3 space-y-3">
              <Link
                href="/auth/login"
                className="block text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </Link>
              <Link
                href="/auth/register"
                className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-center transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
