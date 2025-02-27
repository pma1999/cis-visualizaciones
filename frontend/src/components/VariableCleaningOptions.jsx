import { useState, useEffect, useRef } from "react";
import { getDistribucion } from "../api/cisApi";
import { API_URL } from "../api/cisApi";

export default function VariableCleaningOptions({
  variable,
  excludedValues,
  onExcludedValuesChange,
  label = "Limpiar variable",
  darkMode = false
}) {
  const [distribution, setDistribution] = useState({});
  const [valueLabels, setValueLabels] = useState({});
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalResponses, setTotalResponses] = useState(0);
  const [excludedResponses, setExcludedResponses] = useState(0);
  const searchInputRef = useRef(null);
  
  // Efecto para calcular totales
  useEffect(() => {
    if (Object.keys(distribution).length > 0) {
      // Calcular el total de respuestas
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      setTotalResponses(total);
      
      // Calcular respuestas excluidas
      const excluded = excludedValues.reduce((sum, value) => {
        return sum + (distribution[value] || 0);
      }, 0);
      setExcludedResponses(excluded);
    }
  }, [distribution, excludedValues]);

  useEffect(() => {
    async function fetchData() {
      if (!variable) return;
      
      setLoading(true);
      setLoadingProgress(0);
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + (10 * Math.random());
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      try {
        const dist = await getDistribucion(variable);
        setDistribution(dist);
        
        const response = await fetch(`${API_URL}/metadatos`);
        const metadata = await response.json();
        setValueLabels(metadata.etiquetas_valores[variable] || {});
        
        clearInterval(progressInterval);
        setLoadingProgress(100);
      } catch (error) {
        console.error("Error fetching distribution:", error);
        clearInterval(progressInterval);
      }
      setLoading(false);
    }
    
    fetchData();
    setIsOpen(false); // Reset dropdown state when variable changes
  }, [variable]);

  const handleToggleValue = (value) => {
    if (excludedValues.includes(value)) {
      onExcludedValuesChange(excludedValues.filter(v => v !== value));
    } else {
      onExcludedValuesChange([...excludedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (Object.keys(distribution).length === excludedValues.length) {
      // If all are selected, deselect all
      onExcludedValuesChange([]);
    } else {
      // Otherwise, select all
      onExcludedValuesChange(Object.keys(distribution));
    }
  };

  const handleClearSelection = () => {
    onExcludedValuesChange([]);
  };
  
  const clearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  if (!variable) return null;

  const activeExclusions = excludedValues.length > 0;
  
  // Filtrar valores por búsqueda
  const filteredValues = Object.keys(distribution).filter(value => {
    const label = valueLabels[value] || value;
    const searchString = `${value} ${label}`.toLowerCase();
    return searchTerm === "" || searchString.includes(searchTerm.toLowerCase());
  });
  
  // Ordenar valores por frecuencia (descendente)
  const sortedValues = [...filteredValues].sort((a, b) => {
    return distribution[b] - distribution[a];
  });
  
  // Calcular porcentaje excluido
  const excludedPercentage = totalResponses ? (excludedResponses / totalResponses) * 100 : 0;

  return (
    <div className={`relative mb-4 border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm transition-colors duration-200`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 text-left flex justify-between items-center transition-colors ${
          activeExclusions 
            ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') 
            : ''
        }`}
      >
        <div className="flex items-center">
          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{label}</span>
          {activeExclusions && (
            <div className="flex items-center ml-3">
              <span className={`${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs px-2 py-1 rounded-md`}>
                {excludedValues.length} excluidos
              </span>
              {excludedResponses > 0 && (
                <span className={`ml-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  ({excludedResponses.toLocaleString()} respuestas, {excludedPercentage.toFixed(1)}%)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center">
          {/* Si hay exclusiones activas, mostrar un botón para limpiar rápidamente */}
          {activeExclusions && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleClearSelection();
              }}
              className={`mr-3 text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-red-500'} cursor-pointer`}
              title="Limpiar selección"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClearSelection();
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {loading ? (
            <div className="py-8">
              <div className="flex justify-center mb-3">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
              </div>
              <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Cargando datos de la variable... {loadingProgress.toFixed(0)}%
              </div>
              <div className={`mt-3 mx-auto w-3/4 h-2 bg-gray-200 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className={`h-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} rounded-full`} 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              {/* Header de acciones */}
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div className="flex items-center">
                  <button
                    onClick={handleSelectAll}
                    className={`text-sm px-3 py-1.5 rounded ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {Object.keys(distribution).length === excludedValues.length 
                      ? 'Deseleccionar todos' 
                      : 'Seleccionar todos'}
                  </button>
                  
                  {activeExclusions && (
                    <button
                      onClick={handleClearSelection}
                      className={`ml-2 text-sm px-3 py-1.5 rounded ${
                        darkMode 
                          ? 'bg-red-900/40 hover:bg-red-900/60 text-red-200' 
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                      }`}
                    >
                      Limpiar selección
                    </button>
                  )}
                </div>
                
                {/* Contador de resultados */}
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {Object.keys(distribution).length} valores | {totalResponses.toLocaleString()} respuestas
                </div>
              </div>
              
              {/* Barra de búsqueda */}
              {Object.keys(distribution).length > 5 && (
                <div className="relative mb-4">
                  <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar valores..."
                    className={`w-full p-2 pl-10 pr-10 text-sm ${darkMode ? 
                      'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 
                      'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} 
                      border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`} 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              
              {/* Lista de valores */}
              {sortedValues.length === 0 ? (
                <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No se encontraron valores que coincidan con la búsqueda
                </div>
              ) : (
                <div className={`max-h-80 overflow-y-auto pr-1 ${darkMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
                  {sortedValues.map((value) => {
                    const isExcluded = excludedValues.includes(value);
                    const responseCount = distribution[value] || 0;
                    const responsePercentage = totalResponses ? (responseCount / totalResponses) * 100 : 0;
                    
                    return (
                      <div 
                        key={value} 
                        className={`flex items-center py-2 px-1 border-b last:border-0 ${
                          darkMode ? 'border-gray-700' : 'border-gray-200'
                        } ${
                          isExcluded 
                            ? (darkMode ? 'bg-gray-700/50' : 'bg-gray-50') 
                            : ''
                        }`}
                      >
                        <div className="mr-3 flex-shrink-0">
                          <input
                            type="checkbox"
                            id={`exclude-${variable}-${value}`}
                            checked={isExcluded}
                            onChange={() => handleToggleValue(value)}
                            className={`h-5 w-5 rounded-sm ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-500 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-800' 
                                : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                        
                        <label 
                          htmlFor={`exclude-${variable}-${value}`} 
                          className="flex-1 flex items-center cursor-pointer"
                        >
                          <div className="flex-1">
                            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                              {valueLabels[value] || value}
                            </span>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <span className="mr-1">{value}</span>
                              <span>
                                ({responseCount.toLocaleString()} respuestas, {responsePercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          
                          {/* Barra visual de proporción */}
                          <div className="w-24 ml-3 hidden sm:block">
                            <div 
                              className={`h-2 rounded-full ${
                                isExcluded 
                                  ? (darkMode ? 'bg-gray-600' : 'bg-gray-300') 
                                  : (darkMode ? 'bg-blue-600' : 'bg-blue-500')
                              }`}
                              style={{ width: `${responsePercentage}%` }}
                            ></div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Información de exclusión */}
              {activeExclusions && (
                <div className={`mt-4 p-3 rounded-md ${
                  darkMode 
                    ? 'bg-yellow-900/20 border border-yellow-900/30 text-yellow-200' 
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                }`}>
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Datos excluidos</span>
                  </div>
                  
                  <p className="text-sm">
                    Se excluirán {excludedResponses.toLocaleString()} respuestas ({excludedPercentage.toFixed(1)}% del total) del análisis.
                  </p>
                  
                  {/* Barra de progreso de exclusión */}
                  <div className={`mt-3 w-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full ${darkMode ? 'bg-yellow-600' : 'bg-yellow-500'}`}
                      style={{ width: `${excludedPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 