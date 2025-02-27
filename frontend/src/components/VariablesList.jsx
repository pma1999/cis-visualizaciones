import { useEffect, useState, memo, useRef } from "react";
import { getVariables, clearApiCache } from "../api/cisApi";
import { useFiles } from "../contexts/FileContext";

// Mantener el evento personalizado para compatibilidad con el código existente
export const fileChangeEvent = new EventTarget();

const VariablesList = memo(({ onSelect, excludeVariable, isCompact = false, darkMode = false }) => {
  const [variables, setVariables] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [viewMode, setViewMode] = useState("grid"); // grid o list
  const [sortMethod, setSortMethod] = useState("alphabetical"); // alphabetical, frequency, relevance
  const [favoriteVariables, setFavoriteVariables] = useState([]);
  const [recentVariables, setRecentVariables] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const eventListenerAdded = useRef(false);
  const searchInputRef = useRef(null);
  
  // Usar el contexto de archivos para detectar cambios en el archivo activo
  const { activeFile } = useFiles();
  
  // Efecto para cargar favoritos del localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('favoriteVariables');
      if (savedFavorites) {
        setFavoriteVariables(JSON.parse(savedFavorites));
      }
      
      const savedRecent = localStorage.getItem('recentVariables');
      if (savedRecent) {
        setRecentVariables(JSON.parse(savedRecent));
      }
    } catch (err) {
      console.error("Error cargando favoritos:", err);
    }
  }, []);

  // Función para guardar favoritos en localStorage
  const saveFavorites = (favorites) => {
    try {
      localStorage.setItem('favoriteVariables', JSON.stringify(favorites));
    } catch (err) {
      console.error("Error guardando favoritos:", err);
    }
  };
  
  // Función para guardar recientes en localStorage
  const saveRecent = (recent) => {
    try {
      localStorage.setItem('recentVariables', JSON.stringify(recent));
    } catch (err) {
      console.error("Error guardando recientes:", err);
    }
  };
  
  // Función para añadir o quitar de favoritos
  const toggleFavorite = (varCode) => {
    const newFavorites = favoriteVariables.includes(varCode) 
      ? favoriteVariables.filter(code => code !== varCode)
      : [...favoriteVariables, varCode];
    
    setFavoriteVariables(newFavorites);
    saveFavorites(newFavorites);
  };
  
  // Función para añadir a recientes
  const addToRecent = (varCode) => {
    // Evitar duplicados y mantener solo las 10 más recientes
    const newRecent = [varCode, ...recentVariables.filter(code => code !== varCode)].slice(0, 10);
    setRecentVariables(newRecent);
    saveRecent(newRecent);
  };
  
  const fetchVariables = async () => {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setError(null);
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + (10 * Math.random());
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      // Limpiamos la caché antes de obtener variables para asegurar datos actualizados
      clearApiCache(); 
      const data = await getVariables();
      
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      console.log("Variables obtenidas:", data);
      setVariables(data || {});
      
      // Detectar categorías de variables
      if (data) {
        const detectedCategories = detectCategories(data);
        setCategories(detectedCategories);
      }
    } catch (err) {
      console.error("Error al obtener variables:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para detectar categorías basadas en prefijos comunes
  const detectCategories = (variables) => {
    const prefixes = {};
    
    // Detectar prefijos comunes (2-3 caracteres)
    Object.keys(variables).forEach(varCode => {
      if (varCode.length >= 2) {
        const prefix = varCode.substring(0, 2);
        prefixes[prefix] = (prefixes[prefix] || 0) + 1;
      }
    });
    
    // Filtrar solo categorías con al menos 3 variables
    return Object.entries(prefixes)
      .filter(([, count]) => count >= 3)
      .map(([prefix]) => prefix);
  };

  // Efecto para cargar variables iniciales
  useEffect(() => {
    fetchVariables();
  }, []);
  
  // Efecto para recargar variables cuando cambia el archivo activo
  useEffect(() => {
    console.log("Archivo activo cambiado en VariablesList:", activeFile);
    if (activeFile) {
      fetchVariables();
    }
  }, [activeFile]);

  // Mantener el efecto del evento para compatibilidad
  useEffect(() => {
    if (!eventListenerAdded.current) {
      const handleFileChange = () => {
        console.log("Evento de cambio de archivo detectado en VariablesList");
        fetchVariables();
      };
      
      fileChangeEvent.addEventListener('fileChange', handleFileChange);
      eventListenerAdded.current = true;
      
      return () => {
        fileChangeEvent.removeEventListener('fileChange', handleFileChange);
        eventListenerAdded.current = false;
      };
    }
  }, []);

  // Función para manejar la selección de una variable
  const handleVariableSelect = (varCode, varLabel) => {
    onSelect({
      code: varCode,
      label: varLabel
    });
    
    // Añadir a recientes
    addToRecent(varCode);
  };
  
  // Función para filtrar variables por categoría y término de búsqueda
  const getFilteredVariables = () => {
    let result = Object.entries(variables)
      .filter(([varCode]) => !excludeVariable || varCode !== excludeVariable);
    
    // Filtrar por categoría
    if (selectedCategory !== "todas") {
      if (selectedCategory === "favoritos") {
        result = result.filter(([varCode]) => favoriteVariables.includes(varCode));
      } else if (selectedCategory === "recientes") {
        // Ordenar según el orden de recientes
        result = result.filter(([varCode]) => recentVariables.includes(varCode))
          .sort((a, b) => {
            return recentVariables.indexOf(a[0]) - recentVariables.indexOf(b[0]);
          });
      } else {
        result = result.filter(([varCode]) => varCode.startsWith(selectedCategory));
      }
    }
    
    // Aplicar búsqueda
    if (searchTerm !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(([varCode, varLabel]) => 
        varCode.toLowerCase().includes(term) || 
        varLabel.toLowerCase().includes(term)
      );
    }
    
    // Aplicar ordenación
    if (sortMethod === "alphabetical") {
      result.sort((a, b) => a[1].localeCompare(b[1]));
    } else if (sortMethod === "code") {
      result.sort((a, b) => a[0].localeCompare(b[0]));
    }
    
    return result;
  };

  const filteredVariables = getFilteredVariables();
  
  const clearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const containerClasses = isCompact
    ? "flex flex-col"
    : `flex flex-col h-full transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-800'}`;

  return (
    <div className={containerClasses}>
      {/* Barra de búsqueda mejorada */}
      <div className={`${isCompact ? "" : "sticky top-0 z-10 pb-4"} ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="relative">
          <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar variables..."
            className={`w-full p-3 pl-10 pr-10 ${darkMode ? 
              'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 
              'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} 
              border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`} 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Opciones de filtrado y visualización (solo si no es compacto) */}
        {!isCompact && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Selector de categorías */}
            <div className="flex-1 min-w-[150px]">
              <select
                className={`w-full p-2 ${darkMode ? 
                  'bg-gray-700 border-gray-600 text-white' : 
                  'bg-white border-gray-300 text-gray-900'} 
                  border rounded-lg`}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="todas">Todas las variables</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    Categoría: {cat}
                  </option>
                ))}
                <option value="favoritos">⭐ Favoritas</option>
                <option value="recientes">🕒 Recientes</option>
              </select>
            </div>
            
            {/* Selector de orden */}
            <div className="flex items-center shrink-0">
              <select
                className={`p-2 ${darkMode ? 
                  'bg-gray-700 border-gray-600 text-white' : 
                  'bg-white border-gray-300 text-gray-900'} 
                  border rounded-lg text-sm`}
                value={sortMethod}
                onChange={(e) => setSortMethod(e.target.value)}
              >
                <option value="alphabetical">Alfabético</option>
                <option value="code">Por código</option>
              </select>
            </div>
            
            {/* Botones de vista */}
            <div className={`flex rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} overflow-hidden`}>
              <button
                className={`p-2 ${
                  viewMode === 'grid' 
                    ? (darkMode ? 'bg-gray-700 text-white' : 'bg-blue-500 text-white') 
                    : (darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500')
                }`}
                onClick={() => setViewMode('grid')}
                title="Vista de cuadrícula"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                className={`p-2 ${
                  viewMode === 'list' 
                    ? (darkMode ? 'bg-gray-700 text-white' : 'bg-blue-500 text-white') 
                    : (darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500')
                }`}
                onClick={() => setViewMode('list')}
                title="Vista de lista"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mostrar mensaje si no hay variables */}
      {Object.keys(variables).length === 0 && !loading && !error && (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg 
            className="w-12 h-12 mx-auto mb-4 opacity-50" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No hay variables disponibles en este archivo</p>
          <p className="mt-2 text-sm">Selecciona un archivo diferente o carga uno nuevo</p>
        </div>
      )}
      
      {/* Lista de variables - contenedor scrolleable */}
      <div className={`${isCompact ? "max-h-60" : "flex-1"} overflow-y-auto mt-4`}>
        {loading ? (
          <div className={`py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className="flex justify-center items-center mb-2">
              <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
            </div>
            <div className="text-center text-sm">Cargando variables... {loadingProgress.toFixed(0)}%</div>
            <div className={`mt-2 mx-auto w-3/4 h-2 bg-gray-200 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-600">
            <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Error: {error}</p>
            <button 
              onClick={fetchVariables}
              className={`mt-3 px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg text-sm`}
            >
              Reintentar
            </button>
          </div>
        ) : filteredVariables.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <svg className="w-12 h-12 mx-auto mb-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p>No se encontraron variables {searchTerm && `para "${searchTerm}"`}</p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className={`mt-3 px-4 py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg text-sm`}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          viewMode === 'grid' && !isCompact ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredVariables.map(([varCode, varLabel]) => (
                <div 
                  key={varCode} 
                  className={`relative group ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'} 
                    border ${darkMode ? 'border-gray-600' : 'border-gray-200'} 
                    rounded-lg shadow-sm hover:shadow transition-all duration-200`}
                >
                  <button
                    onClick={() => handleVariableSelect(varCode, varLabel)}
                    className="w-full text-left p-3 pr-12"
                  >
                    <p className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {varLabel}
                    </p>
                    <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {varCode}
                    </p>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(varCode);
                    }}
                    className={`absolute top-3 right-3 ${
                      favoriteVariables.includes(varCode) 
                        ? 'text-yellow-400 hover:text-yellow-500' 
                        : `${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'} opacity-60 group-hover:opacity-100`
                    } transition-opacity focus:outline-none`}
                    title={favoriteVariables.includes(varCode) ? "Quitar de favoritos" : "Añadir a favoritos"}
                  >
                    <svg className="w-5 h-5" fill={favoriteVariables.includes(varCode) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredVariables.map(([varCode, varLabel]) => (
                <li key={varCode} className="relative group">
                  <div className="relative">
                    <button
                      onClick={() => handleVariableSelect(varCode, varLabel)}
                      className={`w-full text-left ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'} 
                        text-white py-2 px-4 rounded-md transition flex items-center ${!isCompact ? 'pr-10' : ''}`}
                    >
                      <div className="flex-1 overflow-hidden">
                        <span className="font-medium block truncate">{varLabel}</span>
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-blue-100'} block truncate`}>
                          ({varCode})
                        </span>
                      </div>
                    </button>
                    
                    {!isCompact && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(varCode);
                        }}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                          favoriteVariables.includes(varCode) 
                            ? 'text-yellow-300' 
                            : 'text-white/50 hover:text-white/90'
                        }`}
                        title={favoriteVariables.includes(varCode) ? "Quitar de favoritos" : "Añadir a favoritos"}
                      >
                        <svg className="w-5 h-5" fill={favoriteVariables.includes(varCode) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
      
      {/* Indicador de total de variables */}
      {!isCompact && filteredVariables.length > 0 && (
        <div className={`text-sm pt-3 pb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} mt-4`}>
          Mostrando {filteredVariables.length} de {Object.keys(variables).length} variables
        </div>
      )}
    </div>
  );
});

export default VariablesList;
