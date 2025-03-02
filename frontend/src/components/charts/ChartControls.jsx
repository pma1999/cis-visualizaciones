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
 * @param {number} props.zoom - Nivel de zoom actual
 * @param {Function} props.increaseZoom - Función para aumentar el zoom
 * @param {Function} props.decreaseZoom - Función para disminuir el zoom
 * @param {Function} props.resetZoom - Función para resetear el zoom
 * @param {boolean} props.showLegend - Si se muestra la leyenda
 * @param {Function} props.toggleLegend - Función para mostrar/ocultar la leyenda
 * @param {Function} props.toggleAspectRatio - Función para cambiar la relación de aspecto
 * @param {Function} props.toggleFullscreen - Función para alternar pantalla completa
 * @param {boolean} props.isFullscreen - Si el gráfico está en pantalla completa
 * @param {boolean} props.hideViewModeSelector - Si se debe ocultar el selector de modo de visualización
 */
const ChartControls = ({ 
  viewMode, 
  setViewMode, 
  exporting, 
  handleExportChart, 
  openInNewTab, 
  isFullscreenPage = false, 
  darkMode = false,
  zoom = 100,
  increaseZoom,
  decreaseZoom,
  resetZoom,
  showLegend,
  toggleLegend,
  toggleAspectRatio,
  toggleFullscreen,
  isFullscreen = false,
  hideViewModeSelector = false
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isFullscreenPage && !hideViewModeSelector && (
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
        {/* Zoom controls */}
        {increaseZoom && decreaseZoom && resetZoom && (
          <>
            <button
              onClick={increaseZoom}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors ${zoom >= 200 ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Aumentar zoom"
              disabled={zoom >= 200}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            
            <button
              onClick={decreaseZoom}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors ${zoom <= 40 ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Disminuir zoom"
              disabled={zoom <= 40}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            
            <button
              onClick={resetZoom}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors ${zoom === 100 ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Restablecer zoom"
              disabled={zoom === 100}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {zoom !== 100 && (
              <div className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                {zoom}%
              </div>
            )}
          </>
        )}

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
        
        {toggleLegend && (
          <button
            onClick={toggleLegend}
            className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            title={showLegend ? "Ocultar leyenda" : "Mostrar leyenda"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        )}
        
        {toggleAspectRatio && (
          <button
            onClick={toggleAspectRatio}
            className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            title="Cambiar relación de aspecto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 4h-4m0 0v4m0-4L7 14M5 20h4m0 0v-4m0 4L17 10" />
            </svg>
          </button>
        )}
        
        {toggleFullscreen && (
          <button
            onClick={toggleFullscreen}
            className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            title={isFullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChartControls; 