import { useState, useEffect, useRef } from 'react';
import { getDistribucion } from '../api/cisApi';
import { API_URL } from '../api/cisApi';
import { exportAsImage, getFormattedDate } from '../utils/chartExport';

export default function FrequencyTable({ variable, sortOrder = 'code', excludedValues = [], darkMode = false }) {
  const [data, setData] = useState({});
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const tableContainerRef = useRef(null);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    missing: 0,
    min: null,
    max: null,
    mean: null,
    median: null
  });

  useEffect(() => {
    async function fetchData() {
      if (!variable) return;
      
      setLoading(true);
      try {
        // Obtener la distribución
        const distribution = await getDistribucion(variable);
        setData(distribution);
        
        // Obtener metadatos
        const response = await fetch(`${API_URL}/metadatos`);
        const metadata = await response.json();
        
        setMetadata(metadata);
        
        // Calcular estadísticas
        const filteredDistribution = { ...distribution };
        excludedValues.forEach(val => {
          delete filteredDistribution[val];
        });
        
        // Calcular estadísticas básicas a partir de la distribución
        calculateStats(filteredDistribution, metadata.etiquetas_valores[variable] || {});
        
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [variable, excludedValues]);
  
  // Calcular estadísticas
  const calculateStats = (distribution, labels) => {
    // Total de respuestas (incluyendo excluidas)
    const originalTotal = Object.values(data).reduce((sum, count) => sum + count, 0);
    
    // Total de respuestas válidas (excluyendo las filtradas)
    const validResponses = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    // Valores missing
    const missingResponses = originalTotal - validResponses;
    
    // Intentar calcular estadísticas numéricas si es posible
    try {
      // Primero verificar si la variable es numérica
      const numericKeys = Object.keys(distribution)
        .filter(key => !isNaN(parseFloat(key)) && key.trim() !== '')
        .map(key => parseFloat(key));
      
      if (numericKeys.length > 0) {
        // Min y Max
        const min = Math.min(...numericKeys);
        const max = Math.max(...numericKeys);
        
        // Media ponderada
        let sum = 0;
        let count = 0;
        
        for (const [key, freq] of Object.entries(distribution)) {
          if (!isNaN(parseFloat(key)) && key.trim() !== '') {
            sum += parseFloat(key) * freq;
            count += freq;
          }
        }
        
        const mean = count > 0 ? sum / count : null;
        
        // Mediana (aproximada desde los datos agrupados)
        const median = calculateMedian(distribution);
        
        setStats({
          total: originalTotal,
          valid: validResponses,
          missing: missingResponses,
          min,
          max,
          mean,
          median
        });
      } else {
        setStats({
          total: originalTotal,
          valid: validResponses,
          missing: missingResponses,
          min: null,
          max: null,
          mean: null,
          median: null
        });
      }
    } catch (err) {
      console.error("Error calculando estadísticas:", err);
      setStats({
        total: originalTotal,
        valid: validResponses,
        missing: missingResponses,
        min: null,
        max: null,
        mean: null,
        median: null
      });
    }
  };
  
  // Función para calcular mediana aproximada de datos agrupados
  const calculateMedian = (distribution) => {
    const keys = Object.keys(distribution)
      .filter(key => !isNaN(parseFloat(key)) && key.trim() !== '')
      .map(key => parseFloat(key))
      .sort((a, b) => a - b);
    
    if (keys.length === 0) return null;
    
    const frequencies = keys.map(key => distribution[key.toString()]);
    const totalCount = frequencies.reduce((sum, count) => sum + count, 0);
    
    // Posición de la mediana
    const middlePosition = totalCount / 2;
    
    let cumulativeCount = 0;
    for (let i = 0; i < keys.length; i++) {
      cumulativeCount += frequencies[i];
      if (cumulativeCount >= middlePosition) {
        return keys[i];
      }
    }
    
    return null;
  };
  
  // Filtrar y ordenar los datos
  const getProcessedData = () => {
    // Filtrar valores excluidos
    const filteredData = Object.entries(data).filter(([key]) => !excludedValues.includes(key));
    
    // Ordenar según el criterio
    if (sortOrder === 'code') {
      // Ordenar por código/valor
      return filteredData.sort((a, b) => {
        // Si son números, ordenar numéricamente
        if (!isNaN(a[0]) && !isNaN(b[0])) {
          return parseFloat(a[0]) - parseFloat(b[0]);
        }
        // De lo contrario, ordenar alfabéticamente
        return a[0].localeCompare(b[0]);
      });
    } else if (sortOrder === 'frequency') {
      // Ordenar por frecuencia (descendente)
      return filteredData.sort((a, b) => b[1] - a[1]);
    }
    
    return filteredData;
  };
  
  // Calcular el total de respuestas válidas (excluyendo las filtradas)
  const totalResponses = Object.entries(data)
    .filter(([key]) => !excludedValues.includes(key))
    .reduce((sum, [, count]) => sum + count, 0);
  
  // Formatear número
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return typeof num === 'number' ? 
      num.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 
      num.toString();
  };
  
  // Formatear porcentaje
  const formatPercent = (num) => {
    if (num === null || num === undefined) return '-';
    return `${(num * 100).toFixed(1)}%`;
  };
  
  // Obtener etiquetas de valores
  const getValueLabels = () => {
    try {
      return metadata?.etiquetas_valores?.[variable] || {};
    } catch {
      return {};
    }
  };
  
  const valueLabels = getValueLabels();
  const processedData = getProcessedData();
  
  // Verificar si tenemos alguna etiqueta para los valores
  const hasLabels = Object.keys(valueLabels).length > 0;

  const prepareTableForExport = () => {
    // Función para preparar la tabla antes de la exportación
    // Asegurarse de que no haya colores OKLCH que puedan causar problemas
    if (!tableContainerRef.current) return;
    
    // Temporalmente reemplazar colores OKLCH con colores RGB
    const elementsWithProblematicColors = tableContainerRef.current.querySelectorAll('*');
    elementsWithProblematicColors.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      
      // Guardar los estilos originales para restaurarlos después
      el.dataset.originalBgColor = el.style.backgroundColor || '';
      el.dataset.originalColor = el.style.color || '';
      el.dataset.originalFill = el.style.fill || '';
      el.dataset.originalStroke = el.style.stroke || '';
      
      // Aplicar colores compatibles con html2canvas
      if (darkMode) {
        // Versión oscura (con colores compatibles)
        // Comprobamos varios formatos de color problemáticos: oklch, oklab, hsl con espacio, etc.
        const problematicColorFormats = ['oklch', 'oklab', 'lch', 'lab', 'hsl('];
        
        const needsBackgroundReplacement = problematicColorFormats.some(format => 
          computedStyle.backgroundColor && computedStyle.backgroundColor.includes(format)
        );
        
        const needsTextColorReplacement = problematicColorFormats.some(format => 
          computedStyle.color && computedStyle.color.includes(format)
        );
        
        const needsFillReplacement = problematicColorFormats.some(format => 
          computedStyle.fill && computedStyle.fill !== 'none' && computedStyle.fill.includes(format)
        );
        
        const needsStrokeReplacement = problematicColorFormats.some(format => 
          computedStyle.stroke && computedStyle.stroke !== 'none' && computedStyle.stroke.includes(format)
        );
        
        if (needsBackgroundReplacement) {
          el.style.backgroundColor = '#1e293b'; // Un azul oscuro compatible
        }
        
        if (needsTextColorReplacement) {
          el.style.color = '#e2e8f0'; // Un gris claro compatible
        }
        
        if (needsFillReplacement) {
          el.style.fill = '#4b5563'; // Un gris medio compatible
        }
        
        if (needsStrokeReplacement) {
          el.style.stroke = '#6b7280'; // Un gris para bordes compatible
        }
      } else {
        // Versión clara (con colores compatibles)
        const problematicColorFormats = ['oklch', 'oklab', 'lch', 'lab', 'hsl('];
        
        const needsBackgroundReplacement = problematicColorFormats.some(format => 
          computedStyle.backgroundColor && computedStyle.backgroundColor.includes(format)
        );
        
        const needsTextColorReplacement = problematicColorFormats.some(format => 
          computedStyle.color && computedStyle.color.includes(format)
        );
        
        const needsFillReplacement = problematicColorFormats.some(format => 
          computedStyle.fill && computedStyle.fill !== 'none' && computedStyle.fill.includes(format)
        );
        
        const needsStrokeReplacement = problematicColorFormats.some(format => 
          computedStyle.stroke && computedStyle.stroke !== 'none' && computedStyle.stroke.includes(format)
        );
        
        if (needsBackgroundReplacement) {
          el.style.backgroundColor = '#f8fafc'; // Un gris muy claro compatible
        }
        
        if (needsTextColorReplacement) {
          el.style.color = '#0f172a'; // Un gris oscuro compatible
        }
        
        if (needsFillReplacement) {
          el.style.fill = '#334155'; // Un gris para rellenos compatible
        }
        
        if (needsStrokeReplacement) {
          el.style.stroke = '#64748b'; // Un gris para bordes compatible
        }
      }
    });
    
    return () => {
      // Restaurar los estilos originales
      elementsWithProblematicColors.forEach(el => {
        if (el.dataset.originalBgColor) {
          el.style.backgroundColor = el.dataset.originalBgColor;
          delete el.dataset.originalBgColor;
        }
        if (el.dataset.originalColor) {
          el.style.color = el.dataset.originalColor;
          delete el.dataset.originalColor;
        }
        if (el.dataset.originalFill) {
          el.style.fill = el.dataset.originalFill;
          delete el.dataset.originalFill;
        }
        if (el.dataset.originalStroke) {
          el.style.stroke = el.dataset.originalStroke;
          delete el.dataset.originalStroke;
        }
      });
    };
  };

  const exportToCSV = () => {
    if (!data || Object.keys(data).length === 0) return;
    if (exportingCSV || exportingImage) return; // Evitar exportaciones múltiples

    setExportingCSV(true);
    try {
      // Obtener los datos filtrados
      const processedData = getProcessedData();
      
      // Preparar cabeceras
      const headers = ['Valor', 'Etiqueta', 'Frecuencia', 'Porcentaje'];
      
      // Preparar filas
      const rows = processedData.map(([value, count]) => {
        const percentage = totalResponses > 0 ? count / totalResponses : 0;
        const label = valueLabels[value] || '';
        
        return [
          value,
          label,
          count,
          (percentage * 100).toFixed(1) + '%'
        ];
      });
      
      // Agregar fila de totales
      rows.push(['Total', '', totalResponses, '100%']);
      
      // Crear contenido CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Descargar el archivo
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frecuencia_${variable}_${getFormattedDate()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error al exportar a CSV:", error);
      alert('Error al exportar a CSV. Por favor, inténtelo de nuevo.');
    } finally {
      setExportingCSV(false);
    }
  };

  const exportAsTableImage = async () => {
    if (!tableContainerRef.current || !data || Object.keys(data).length === 0) return;
    if (exportingCSV || exportingImage) return; // Evitar exportaciones múltiples
    
    setExportingImage(true);
    
    // Preparar la tabla para la exportación y obtener función para restaurar
    const restoreStyles = prepareTableForExport();
    
    try {
      // Preparar opciones para la exportación
      const options = {
        title: `Distribución de frecuencias: ${variable}`,
        subtitle: `Ordenado por: ${sortOrder === 'code' ? 'código' : 'frecuencia'}`,
        description: excludedValues.length > 0 ? 
          `Se han excluido ${excludedValues.length} valores.` : 
          "",
        darkMode: darkMode,
        chartType: 'table',
        width: tableContainerRef.current.offsetWidth * 1.5,
        height: tableContainerRef.current.offsetHeight * 1.5,
        skipCssColors: true, // Indicar que ignoramos los colores problemáticos
        // Mejoras para garantizar una exportación perfecta
        scale: 2, // Aumentar escala para mejor calidad
        canvasOptions: {
          logging: false, // Reducir ruido en consola
          allowTaint: true, // Permitir contenido externo
          useCORS: true, // Importante para imágenes externas
          backgroundColor: darkMode ? '#0f172a' : '#ffffff',
          windowWidth: window.innerWidth, // Asegurar que se capture todo el ancho
          windowHeight: window.innerHeight // Asegurar altura correcta
        }
      };
      
      // Nombre del archivo
      const filename = `distribucion_${variable}_${getFormattedDate()}`;
      
      // Esperar a que cualquier renderizado en proceso se complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Usar la función avanzada de exportación
      const success = await exportAsImage(tableContainerRef.current, filename, options);
      
      if (!success) {
        throw new Error("No se pudo exportar la tabla como imagen");
      }
    } catch (error) {
      console.error("Error al exportar como imagen:", error);
      alert('Error al exportar la tabla como imagen. Por favor, inténtelo de nuevo.');
    } finally {
      // Restaurar los estilos originales
      if (restoreStyles) restoreStyles();
      setExportingImage(false);
    }
  };

  return (
    <div className={`${darkMode ? 'text-white' : 'text-gray-800'}`}>
      {/* Estado de carga */}
      {loading ? (
        <div className={`flex flex-col items-center justify-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mb-3 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
          <p>Cargando datos...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p className="text-lg font-medium">Error</p>
          <p>{error}</p>
        </div>
      ) : processedData.length === 0 ? (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No hay datos disponibles para esta variable.</p>
        </div>
      ) : (
        <>
          {/* Panel de control y estadísticas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                <div className="text-xs uppercase tracking-wider mb-1 opacity-70">Total</div>
                <div className="text-lg font-semibold">{formatNumber(stats.total)}</div>
              </div>
              
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                <div className="text-xs uppercase tracking-wider mb-1 opacity-70">Válidos</div>
                <div className="text-lg font-semibold">{formatNumber(stats.valid)}</div>
              </div>
              
              {stats.mean !== null && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <div className="text-xs uppercase tracking-wider mb-1 opacity-70">Media</div>
                  <div className="text-lg font-semibold">{formatNumber(stats.mean)}</div>
                </div>
              )}
              
              {stats.median !== null && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <div className="text-xs uppercase tracking-wider mb-1 opacity-70">Mediana</div>
                  <div className="text-lg font-semibold">{formatNumber(stats.median)}</div>
                </div>
              )}
            </div>
            
            {/* Botones de exportación */}
            <div className="flex gap-2 mt-3 sm:mt-0">
              <button
                onClick={exportToCSV}
                disabled={exportingCSV || exportingImage}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium
                  flex items-center gap-2
                  ${(exportingCSV || exportingImage) 
                    ? (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500') 
                    : (darkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700')
                  }
                  transition-colors duration-200
                `}
                title="Exportar tabla como CSV"
              >
                {exportingCSV ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>CSV</span>
                  </>
                )}
              </button>
              
              <button
                onClick={exportAsTableImage}
                disabled={exportingCSV || exportingImage}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium
                  flex items-center gap-2
                  ${(exportingCSV || exportingImage) 
                    ? (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500') 
                    : (darkMode 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-green-600 text-white hover:bg-green-700')
                  }
                  transition-colors duration-200
                `}
                title="Exportar tabla como imagen"
              >
                {exportingImage ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Imagen</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Tabla de frecuencias */}
          <div ref={tableContainerRef} className={`overflow-x-auto rounded-lg ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Valor
                  </th>
                  {hasLabels && (
                    <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Etiqueta
                    </th>
                  )}
                  <th scope="col" className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Frecuencia
                  </th>
                  <th scope="col" className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Porcentaje
                  </th>
                  <th scope="col" className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} hidden sm:table-cell`}>
                    <span className="sr-only">Gráfico</span>
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800/50' : 'divide-gray-200 bg-white'}`}>
                {processedData.map(([value, count], index) => {
                  const percentage = totalResponses > 0 ? count / totalResponses : 0;
                  const isNumeric = !isNaN(parseFloat(value));
                  
                  return (
                    <tr key={value} className={`${index % 2 === 1 ? (darkMode ? 'bg-gray-800/30' : 'bg-gray-50/50') : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`${isNumeric ? 'font-mono' : ''} ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {value}
                        </span>
                      </td>
                      {hasLabels && (
                        <td className="px-4 py-3">
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {valueLabels[value] || '-'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        {formatNumber(count)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {formatPercent(percentage)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                          <div 
                            className={`h-full rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`} 
                            style={{ width: `${percentage * 100}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr className="font-medium">
                  <td className="px-4 py-3">Total</td>
                  {hasLabels && <td></td>}
                  <td className="px-4 py-3 text-right">{formatNumber(totalResponses)}</td>
                  <td className="px-4 py-3 text-right">100%</td>
                  <td className="hidden sm:table-cell"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Nota sobre valores excluidos */}
          {excludedValues.length > 0 && (
            <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>* Se han excluido {excludedValues.length} valores del análisis.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
