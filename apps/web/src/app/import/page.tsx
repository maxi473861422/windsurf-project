'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Info } from 'lucide-react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Por favor, selecciona un archivo CSV o Excel válido');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir el archivo');
      }

      const result = await response.json();
      setUploadResult(result);
      setFile(null);
    } catch (err) {
      setError('Error al procesar el archivo. Por favor, intenta nuevamente.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async (type: 'csv' | 'excel') => {
    try {
      const response = await fetch(`/api/import/template?type=${type}`);
      if (!response.ok) throw new Error('Error al descargar la plantilla');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'csv' ? 'plantilla_importacion.csv' : 'plantilla_importacion.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Error al descargar la plantilla');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Upload className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Importar Datos</h1>
          </div>
          <p className="text-gray-600">
            Importa datos de perros desde archivos CSV o Excel
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subir Archivo</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500">
                Formatos aceptados: CSV, XLSX, XLS (máx. 10MB)
              </p>
            </label>
          </div>

          {file && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Importar Datos</span>
              </>
            )}
          </button>
        </div>

        {/* Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plantillas</h2>
          <p className="text-gray-600 mb-4">
            Descarga las plantillas para asegurarte de que tus datos tengan el formato correcto.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={() => downloadTemplate('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar CSV</span>
            </button>
            <button
              onClick={() => downloadTemplate('excel')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar Excel</span>
            </button>
          </div>
        </div>

        {/* Results */}
        {uploadResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              {uploadResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {uploadResult.success ? 'Importación Exitosa' : 'Importación Completada con Errores'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-gray-900">{uploadResult.imported || 0}</p>
                <p className="text-sm text-gray-500">Registros importados</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-gray-900">{uploadResult.updated || 0}</p>
                <p className="text-sm text-gray-500">Registros actualizados</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-gray-900">{uploadResult.errors?.length || 0}</p>
                <p className="text-sm text-gray-500">Errores</p>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">Errores encontrados:</h3>
                <div className="bg-red-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <ul className="space-y-2">
                    {uploadResult.errors.map((error: any, index: number) => (
                      <li key={index} className="text-sm text-red-800">
                        Fila {error.row}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Instrucciones</h2>
          </div>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Descarga la plantilla correspondiente al formato que vayas a usar.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Llena la plantilla con los datos de tus perros siguiendo el formato especificado.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Los campos obligatorios están marcados con un asterisco (*).</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Sube el archivo y espera a que se complete el procesamiento.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">5.</span>
              <span>Revisa los resultados y corrige cualquier error si es necesario.</span>
            </li>
          </ul>
        </div>

        {/* Advertisement Placeholder */}
        <div className="bg-gray-200 rounded-lg h-24 flex items-center justify-center text-gray-500">
          <p>Espacio para publicidad futura</p>
        </div>
      </div>
    </div>
  );
}
