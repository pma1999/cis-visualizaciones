import React from 'react';

/**
 * Componente para los controles de interacción con los gráficos
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.viewMode - Modo de visualización actual
 * @param {Function} props.setViewMode - Función para cambiar el modo de visualización
 * @param {boolean} props.exporting - Si se está exportando el gráfico
 * @param {Function} props.handleExportChart - Función para exportar el gráfico
 * @param {Function} props.openInNewTab - Función para abrir el gráfico en una nueva pestaña
 * @param {boolean} props.isFullscreenPage - Si se está mostrando en pantalla completa
 * @param {boolean} props.darkMode - Si se está usando el modo oscuro
 */
const ChartControls = ({ 
  viewMode, 
  setViewMode, 
  exporting, 
  handleExportChart, 
  openInNewTab, 
  isFullscreenPage = false, 
  darkMode = false 
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isFullscreenPage && (
        <select
          className={`text-xs p-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          aria-label="Modo de visualización"
        >
          <option value="absolute">Valores absolutos</option>
          <option value="relative">Valores relativos (%)</option>
        </select>
      )}
      
      <div className="flex items-center space-x-1">
        <button
          onClick={handleExportChart}
          className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors ${exporting ? 'cursor-not-allowed opacity-50' : ''}`}
          title="Descargar gráfico"
          disabled={exporting}
        >
          {exporting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
        
        {!isFullscreenPage && (
          <button
            onClick={openInNewTab}
            className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            title="Abrir en nueva pestaña"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChartControls; 