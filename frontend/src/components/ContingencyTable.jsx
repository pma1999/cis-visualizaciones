import { useEffect, useState, useRef } from "react";
import { getContingencia } from "../api/cisApi";
import { exportAsImage, getFormattedDate } from "../utils/chartExport";

export default function ContingencyTable({ 
  variable1, 
  variable2, 
  excludedValues1 = [], 
  excludedValues2 = [],
  darkMode = false
}) {
  const [originalData, setOriginalData] = useState(null);
  const [contingencyData, setContingencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('absolute'); // 'absolute', 'row', 'column'
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const tableContainerRef = useRef(null);

  // Efecto para cargar los datos iniciales
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getContingencia(variable1, variable2);
        setOriginalData(data); // Guardar los datos originales sin modificar
        setLoading(false);
      } catch (error) {
        console.error("Error fetching contingency data:", error);
        setLoading(false);
      }
    }

    if (variable1 && variable2) {
      fetchData();
    }
  }, [variable1, variable2]);

  // Efecto para aplicar exclusiones cuando cambian los datos originales o las exclusiones
  useEffect(() => {
    if (!originalData) return;
    
    // Crear una copia profunda de los datos originales
    const dataCopy = JSON.parse(JSON.stringify(originalData));
    
    // Aplicar exclusiones a la copia
    if (excludedValues1.length > 0 || excludedValues2.length > 0) {
      // Filtrar filas excluidas
      if (excludedValues1.length > 0) {
        excludedValues1.forEach(rowKey => {
          if (dataCopy.datos.filas[rowKey]) {
            delete dataCopy.datos.filas[rowKey];
          }
        });
      }
      
      // Filtrar columnas excluidas
      if (excludedValues2.length > 0) {
        excludedValues2.forEach(colKey => {
          if (dataCopy.datos.columnas[colKey]) {
            delete dataCopy.datos.columnas[colKey];
            
            // También eliminar esta columna de cada fila
            Object.keys(dataCopy.datos.filas).forEach(rowKey => {
              if (rowKey !== "All" && dataCopy.datos.filas[rowKey].valores[colKey]) {
                delete dataCopy.datos.filas[rowKey].valores[colKey];
              }
            });
          }
        });
      }
      
      // Recalcular totales si es necesario
      if (dataCopy.datos.filas["All"]) {
        // Recalcular totales de filas
        Object.keys(dataCopy.datos.filas).forEach(rowKey => {
          if (rowKey !== "All") {
            const rowTotal = Object.values(dataCopy.datos.filas[rowKey].valores)
              .filter(val => typeof val.frecuencia === 'number')
              .reduce((sum, val) => sum + val.frecuencia, 0);
            
            if (dataCopy.datos.filas[rowKey].valores["All"]) {
              dataCopy.datos.filas[rowKey].valores["All"].frecuencia = rowTotal;
            }
          }
        });
        
        // Recalcular totales de columnas
        if (dataCopy.datos.columnas["All"]) {
          Object.keys(dataCopy.datos.columnas)
            .filter(colKey => colKey !== "All")
            .forEach(colKey => {
              const colTotal = Object.keys(dataCopy.datos.filas)
                .filter(rowKey => rowKey !== "All")
                .reduce((sum, rowKey) => {
                  const val = dataCopy.datos.filas[rowKey].valores[colKey];
                  return sum + (val ? val.frecuencia : 0);
                }, 0);
              
              if (dataCopy.datos.filas["All"] && dataCopy.datos.filas["All"].valores[colKey]) {
                dataCopy.datos.filas["All"].valores[colKey].frecuencia = colTotal;
              }
            });
          
          // Recalcular el total general
          const grandTotal = Object.keys(dataCopy.datos.filas["All"].valores)
            .filter(colKey => colKey !== "All")
            .reduce((sum, colKey) => {
              const val = dataCopy.datos.filas["All"].valores[colKey];
              return sum + (val ? val.frecuencia : 0);
            }, 0);
          
          if (dataCopy.datos.filas["All"].valores["All"]) {
            dataCopy.datos.filas["All"].valores["All"].frecuencia = grandTotal;
          }
          
          // Actualizar el total de casos en los metadatos
          dataCopy.metadatos.variable1.total_casos = grandTotal;
        }
      }
    }
    
    setContingencyData(dataCopy);
  }, [originalData, excludedValues1, excludedValues2]);

  const exportToCSV = () => {
    if (!contingencyData) return;
    if (exportingCSV || exportingImage) return; // Evitar exportaciones múltiples

    setExportingCSV(true);
    try {
      const headers = [
        `${contingencyData.metadatos.variable1.etiqueta} / ${contingencyData.metadatos.variable2.etiqueta}`,
        ...Object.entries(contingencyData.datos.columnas)
          .filter(([key]) => key !== "All")
          .map(([_, col]) => col.etiqueta)
      ];

      const rows = Object.entries(contingencyData.datos.filas)
        .filter(([key]) => key !== "All")
        .map(([rowKey, row]) => {
          const rowData = [row.etiqueta];
          Object.entries(contingencyData.datos.columnas)
            .filter(([key]) => key !== "All")
            .forEach(([colKey]) => {
              const valor = row.valores[colKey];
              let cellValue = "";
              switch (viewMode) {
                case "absolute":
                  cellValue = valor.frecuencia;
                  break;
                case "row":
                  cellValue = valor.porcentaje_fila?.toFixed(2) + "%";
                  break;
                case "column":
                  cellValue = valor.porcentaje_columna?.toFixed(2) + "%";
                  break;
              }
              rowData.push(cellValue);
            });
          return rowData;
        });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contingencia_${variable1}_${variable2}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error al exportar a CSV:", error);
    } finally {
      setExportingCSV(false);
    }
  };

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

  const exportAsTableImage = async () => {
    if (!tableContainerRef.current || !contingencyData) return;
    if (exportingCSV || exportingImage) return; // Evitar exportaciones múltiples
    
    setExportingImage(true);
    
    // Preparar la tabla para la exportación y obtener función para restaurar
    const restoreStyles = prepareTableForExport();
    
    try {
      // Preparar opciones para la exportación
      const options = {
        title: `Tabla de contingencia: ${contingencyData.metadatos.variable1.etiqueta} × ${contingencyData.metadatos.variable2.etiqueta}`,
        subtitle: `Modo de visualización: ${
          viewMode === 'absolute' ? 'Valores absolutos' : 
          viewMode === 'row' ? 'Porcentajes por fila' : 'Porcentajes por columna'
        }`,
        description: excludedValues1.length || excludedValues2.length ? 
          `Se han excluido ${excludedValues1.length} valores de ${contingencyData.metadatos.variable1.etiqueta} y ${excludedValues2.length} valores de ${contingencyData.metadatos.variable2.etiqueta}` : 
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
      const filename = `tabla_contingencia_${variable1}_${variable2}_${getFormattedDate()}`;
      
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

  if (loading) {
    return (
      <div className={`p-4 border rounded-lg shadow transition-colors duration-200 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'}`}>
        <h3 className="text-lg font-semibold mb-4">Tabla de contingencia</h3>
        <div className="animate-pulse space-y-4">
          <div className={`h-6 rounded w-1/3 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          <div className={`h-4 rounded w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          <div className={`h-4 rounded w-3/4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  if (!contingencyData) return null;

  const getData = (row, col) => {
    const valor = contingencyData.datos.filas[row].valores[col];
    switch (viewMode) {
      case 'absolute':
        return valor.frecuencia;
      case 'row':
        return valor.porcentaje_fila?.toFixed(2) + '%';
      case 'column':
        return valor.porcentaje_columna?.toFixed(2) + '%';
      default:
        return 0;
    }
  };

  const columnas = Object.entries(contingencyData.datos.columnas)
    .filter(([key]) => key !== "All");
  const filas = Object.entries(contingencyData.datos.filas)
    .filter(([key]) => key !== "All");

  const totalExcluded = excludedValues1.length + excludedValues2.length;

  return (
    <div className={`p-4 border rounded-lg shadow transition-colors duration-200 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <h3 className="text-lg font-semibold">Tabla de contingencia</h3>
        
        <div className="flex flex-wrap gap-2">
          <div>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className={`border p-2 rounded text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            >
              <option value="absolute">Valores absolutos</option>
              <option value="row">% por fila</option>
              <option value="column">% por columna</option>
            </select>
          </div>
          
          <div className="flex gap-2">
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
      </div>

      {totalExcluded > 0 && (
        <div className={`mb-4 p-3 rounded ${darkMode ? 'bg-blue-900/20 border border-blue-900/30 text-blue-200' : 'bg-blue-50 border border-blue-100 text-blue-800'}`}>
          <p className="text-sm">
            <span className="font-medium">Valores excluidos:</span> {totalExcluded} respuestas
            {excludedValues1.length > 0 && ` (${excludedValues1.length} de ${variable1})`}
            {excludedValues2.length > 0 && ` (${excludedValues2.length} de ${variable2})`}
          </p>
        </div>
      )}

      <div ref={tableContainerRef} className="overflow-x-auto">
        <table className={`min-w-full border-collapse ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <thead>
            <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
              <th className={`border ${darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'} p-2 text-left`}>
                {contingencyData.metadatos.variable1.etiqueta} / {contingencyData.metadatos.variable2.etiqueta}
              </th>
              {columnas.map(([key, col]) => (
                <th key={key} className={`border ${darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'} p-2 text-left`}>
                  {col.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(([rowKey, row], rowIndex) => (
              <tr 
                key={rowKey} 
                className={`
                  ${rowIndex % 2 === 0 
                    ? (darkMode ? 'bg-gray-800' : 'bg-white') 
                    : (darkMode ? 'bg-gray-750' : 'bg-gray-50')
                  }
                  hover:${darkMode ? 'bg-gray-700' : 'bg-blue-50'}
                  transition-colors duration-150
                `}
              >
                <td className={`border ${darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'} p-2 font-medium`}>
                  {row.etiqueta}
                </td>
                {columnas.map(([colKey]) => (
                  <td 
                    key={colKey} 
                    className={`
                      border p-2 text-center
                      ${darkMode ? 'border-gray-600' : 'border-gray-300'}
                      ${viewMode === 'absolute' 
                        ? '' 
                        : (
                          getData(rowKey, colKey).replace('%', '') > 50 
                            ? (darkMode ? 'bg-blue-800/30 font-medium' : 'bg-blue-50 font-medium') 
                            : ''
                        )
                      }
                    `}
                  >
                    {getData(rowKey, colKey)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex justify-between items-center`}>
        <div>
          Total de casos: <span className="font-medium">{contingencyData.metadatos.variable1.total_casos}</span>
          {totalExcluded > 0 && <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>Excluidos: {totalExcluded}</span>}
        </div>
        <div className="text-xs">
          {viewMode === 'absolute' 
            ? 'Mostrando frecuencias absolutas' 
            : (viewMode === 'row' 
                ? 'Mostrando porcentajes por fila' 
                : 'Mostrando porcentajes por columna'
              )
          }
        </div>
      </div>
    </div>
  );
}