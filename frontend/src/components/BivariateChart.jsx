import { useEffect, useState, useRef } from "react";
import { getContingencia } from "../api/cisApi";
import {
  ResponsiveContainer,
  Treemap,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import { exportAsImage, getFormattedDate } from "../utils/chartExport";

// Función para generar colores base distintivos
const generateBaseColors = (count, darkMode = false) => {
  const saturation = darkMode ? 80 : 70;
  const lightness = darkMode ? 55 : 45;
  
  return Array.from({ length: count }, (_, i) => {
    const hue = (i * 360) / count;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`; // Color base distintivo
  });
};

// Función para generar variaciones de un color base
const generateColorVariations = (baseColor, count, darkMode = false) => {
  const hsl = baseColor.match(/\d+/g).map(Number);
  return Array.from({ length: count }, (_, i) => {
    // Ajustar la luminosidad para subcategorías, manteniendo el mismo tono
    const lightnessDelta = darkMode ? 5 : 15;
    const lightness = (darkMode ? 55 : 45) + (i * lightnessDelta);
    return `hsl(${hsl[0]}, ${hsl[1]}%, ${Math.min(lightness, darkMode ? 80 : 75)}%)`;
  });
};

export default function BivariateChart({ 
  variable1, 
  variable2, 
  chartType = "treemap", 
  excludedValues1 = [], 
  excludedValues2 = [],
  darkMode = false
}) {
  const [originalData, setOriginalData] = useState(null);
  const [contingencyData, setContingencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colorScheme, setColorScheme] = useState({});
  const [exporting, setExporting] = useState(false);
  const [variable1Title, setVariable1Title] = useState('');
  const [variable2Title, setVariable2Title] = useState('');
  const [viewMode, setViewMode] = useState('absolute'); // 'absolute' o 'relative'
  const chartContainerRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Efecto para cargar los datos iniciales
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getContingencia(variable1, variable2);
        
        // Guardar los títulos de las variables
        if (data.metadatos) {
          setVariable1Title(data.metadatos.variable1.etiqueta || variable1);
          setVariable2Title(data.metadatos.variable2.etiqueta || variable2);
        } else {
          setVariable1Title(variable1);
          setVariable2Title(variable2);
        }
        
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
    }
    
    setContingencyData(dataCopy);
    
    // Generar esquema de colores al recibir los datos
    const mainCategories = Object.entries(dataCopy.datos.filas)
      .filter(([key]) => key !== "All")
      .map(([key]) => key);
    
    const baseColors = generateBaseColors(mainCategories.length, darkMode);
    const scheme = {};
    
    mainCategories.forEach((category, index) => {
      const secondaryCategories = Object.keys(dataCopy.datos.filas[category].valores)
        .filter(key => key !== "All");
      scheme[category] = {
        base: baseColors[index],
        variations: generateColorVariations(baseColors[index], secondaryCategories.length, darkMode)
      };
    });
    
    setColorScheme(scheme);
  }, [originalData, excludedValues1, excludedValues2, darkMode]);

  // Función para exportar el gráfico como imagen
  const handleExportChart = async () => {
    if (!chartContainerRef.current) return;
    
    setExporting(true);
    try {
      // Preparar opciones para la exportación
      const options = {
        title: `Análisis bivariado de ${variable1Title} y ${variable2Title}`,
        subtitle: `Tipo de gráfico: ${chartType === 'treemap' ? 'Mapa de árbol' : 'Barras apiladas'}`,
        description: `Modo de visualización: ${viewMode === 'absolute' ? 'Valores absolutos' : 'Porcentajes'}`,
        darkMode: darkMode,
        chartType: chartType,
        width: chartContainerRef.current.offsetWidth * 1.5,
        height: chartContainerRef.current.offsetHeight * 1.5,
        footnote: excludedValues1.length || excludedValues2.length ? 
          `Valores excluidos: ${excludedValues1.length} en variable 1, ${excludedValues2.length} en variable 2` : 
          undefined,
        // Mejoras para garantizar una exportación perfecta
        scale: 2, // Aumentar escala para mejor calidad
        canvasOptions: {
          logging: false, // Reducir ruido en consola
          allowTaint: true, // Permitir contenido externo
          useCORS: true, // Importante para imágenes externas
          backgroundColor: darkMode ? '#0f172a' : '#ffffff',
          windowWidth: window.innerWidth, // Asegurar que se capture todo el ancho
          windowHeight: window.innerHeight // Asegurar altura correcta
        },
        skipCssColors: true // Manejar colores modernos como OKLCH que causan problemas
      };
      
      // Nombre del archivo
      const filename = `grafico_bivariado_${variable1}_${variable2}_${chartType}_${getFormattedDate()}`;
      
      // Esperar a que el componente esté completamente renderizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Usar la función avanzada de exportación
      const success = await exportAsImage(chartContainerRef.current, filename, options);
      
      if (!success) {
        throw new Error("No se pudo exportar el gráfico");
      }
    } catch (error) {
      console.error("Error al exportar el gráfico:", error);
      alert('Error al exportar el gráfico. Por favor, inténtelo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  // Obtener nombre del tipo de gráfico para el título
  const getChartTypeName = () => {
    switch(chartType) {
      case 'treemap': return 'mapa de árbol';
      case 'stacked': return 'barras apiladas';
      default: return 'mapa de árbol';
    }
  };

  // Obtener explicación del modo relativo según el tipo de gráfico
  const getRelativeModeExplanation = () => {
    if (chartType === 'treemap') {
      return 'Porcentajes del total';
    } else { // stacked
      return 'Porcentajes por fila';
    }
  };

  if (loading) {
    return (
      <div className={`p-4 border rounded-lg shadow ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} transition-colors duration-200`}>
        <h3 className="text-lg font-semibold mb-4">
          Cargando datos...
        </h3>
        <div className="animate-pulse space-y-4">
          <div className={`h-64 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  if (!contingencyData) return null;

  const totalExcluded = excludedValues1.length + excludedValues2.length;

  const prepareTreemapData = () => {
    // Ahora solo devolvemos los elementos individuales, sin jerarquía
    return Object.entries(contingencyData.datos.filas)
      .filter(([key]) => key !== "All")
      .flatMap(([key, row]) => 
        Object.entries(row.valores)
          .filter(([colKey]) => colKey !== "All")
          .map(([colKey, valor], index) => {
            // Para treemap, usamos porcentaje del total en modo relativo
            // porque representa mejor la proporción visual de los cuadros
            const totalValue = contingencyData.datos.filas["All"]?.valores["All"]?.frecuencia || 0;
            const percentTotal = totalValue > 0 ? (valor.frecuencia / totalValue) * 100 : 0;
            
            // Determine the value to display based on viewMode
            let displayValue;
            let sizeValue;
            
            if (viewMode === 'relative') {
              displayValue = percentTotal;
              sizeValue = percentTotal;
            } else { // 'absolute'
              displayValue = valor.frecuencia;
              sizeValue = valor.frecuencia;
            }
            
            return {
              name: contingencyData.datos.columnas[colKey].etiqueta,
              secondaryLabel: contingencyData.datos.columnas[colKey].etiqueta,
              secondaryVariable: contingencyData.metadatos.variable2.etiqueta,
              mainVariable: contingencyData.metadatos.variable1.etiqueta,
              mainValue: row.etiqueta,
              mainKey: key,
              colorIndex: index,
              size: sizeValue,
              value: displayValue,
              displayValue: displayValue,
              viewMode: viewMode,
              frecuencia: valor.frecuencia,
              percentRow: valor.porcentaje_fila,
              percentCol: valor.porcentaje_columna,
              percentTotal: percentTotal
            };
          })
      );
  };

  const prepareStackedBarData = () => {
    return Object.entries(contingencyData.datos.filas)
      .filter(([key]) => key !== "All")
      .map(([key, row]) => {
        const barData = {
          name: row.etiqueta
        };
        Object.entries(row.valores)
          .filter(([colKey]) => colKey !== "All")
          .forEach(([colKey, valor]) => {
            // Para gráfico de barras, usamos porcentaje por fila en modo relativo
            // ya que cada barra representa una categoría de la primera variable
            let value;
            if (viewMode === 'relative') {
              value = valor.porcentaje_fila;
            } else { // 'absolute'
              value = valor.frecuencia;
            }
            
            barData[contingencyData.datos.columnas[colKey].etiqueta] = value;
            // Store original values for tooltip
            barData[`${contingencyData.datos.columnas[colKey].etiqueta}_freq`] = valor.frecuencia;
            barData[`${contingencyData.datos.columnas[colKey].etiqueta}_row`] = valor.porcentaje_fila;
            barData[`${contingencyData.datos.columnas[colKey].etiqueta}_col`] = valor.porcentaje_columna;
          });
        return barData;
      });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    if (chartType === "treemap") {
      const data = payload[0].payload;
      return (
        <div className={`p-3 border rounded shadow ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
          <div className="border-b pb-2 mb-2">
            <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{data.mainVariable}</p>
            <p className="font-bold">{data.mainValue || data.mainLabel}</p>
          </div>
          <div className="border-b pb-2 mb-2">
            <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{data.secondaryVariable}</p>
            <p className="font-bold">{data.secondaryLabel || data.name}</p>
          </div>
          <div className="space-y-1">
            <p>
              <span className="font-medium">
                {viewMode === 'absolute' 
                  ? 'Frecuencia:' 
                  : 'Porcentaje del total:'}
              </span> 
              {viewMode === 'absolute' 
                ? data.frecuencia 
                : `${data.percentTotal?.toFixed(2)}%`}
            </p>
            {viewMode === 'relative' && 
              <p><span className="font-medium">Frecuencia:</span> {data.frecuencia}</p>
            }
            <p><span className="font-medium">% Fila:</span> {data.percentRow?.toFixed(2)}%</p>
            <p><span className="font-medium">% Columna:</span> {data.percentCol?.toFixed(2)}%</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`p-3 border rounded shadow ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
        <p className="font-medium border-b pb-1 mb-2">{payload[0].payload.name}</p>
        {payload.map((entry, index) => {
          if (entry.dataKey.includes('_')) return null; // Skip the metadata fields
          const baseKey = entry.dataKey;
          const freqKey = `${baseKey}_freq`;
          const rowKey = `${baseKey}_row`;
          const colKey = `${baseKey}_col`;
          
          const freqValue = payload[0].payload[freqKey];
          const rowValue = payload[0].payload[rowKey];
          const colValue = payload[0].payload[colKey];
          
          return (
            <div key={index} className="mb-2 pb-1 border-b last:border-0">
              <p style={{ color: entry.color, fontWeight: 'bold' }}>{entry.name}</p>
              <div className="pl-2">
                <p>
                  <span className="font-medium">
                    {viewMode === 'absolute' 
                      ? 'Frecuencia:' 
                      : 'Porcentaje por fila:'}
                  </span> 
                  {viewMode === 'absolute' 
                    ? freqValue 
                    : `${rowValue?.toFixed(2)}%`}
                </p>
                {viewMode === 'relative' && 
                  <p><span className="font-medium">Frecuencia:</span> {freqValue}</p>
                }
                {viewMode === 'absolute' &&
                  <p><span className="font-medium">% Fila:</span> {rowValue?.toFixed(2)}%</p>
                }
                <p><span className="font-medium">% Columna:</span> {colValue?.toFixed(2)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const CustomizedContent = ({ x, y, width, height, name, mainValue, mainKey, colorIndex, displayValue, viewMode }) => {
    const minWidthForLabel = 70;
    const minHeightForLabel = 40;
    const shouldShowLabel = width > minWidthForLabel && height > minHeightForLabel;

    // Usar las variaciones de color para todos los rectángulos
    const color = colorScheme[mainKey]?.variations[colorIndex] || (darkMode ? "#3b82f6" : "#3182ce");

    // Format the label based on viewMode
    const getFormattedLabel = () => {
      if (viewMode === 'absolute') {
        return name;
      } else {
        return `${name} (${displayValue?.toFixed(1)}%)`;
      }
    };

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          stroke={darkMode ? "#1f2937" : "#fff"}
        />
        {shouldShowLabel && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={12}
            style={{
              filter: 'drop-shadow(0px 0px 1px rgba(0,0,0,0.5))'
            }}
          >
            {getFormattedLabel()}
          </text>
        )}
      </g>
    );
  };

  const getChartColors = (length) => {
    const saturation = darkMode ? 80 : 70;
    const lightness = darkMode ? 55 : 50;
    
    return Array.from({ length }, (_, i) => 
      `hsl(${(i * 360) / length}, ${saturation}%, ${lightness}%)`
    );
  };

  const getAxisTickStyles = () => {
    return { 
      fontSize: 12,
      fontWeight: "500",
      fill: darkMode ? '#e5e7eb' : '#374151'
    };
  };

  return (
    <div className={`p-4 border rounded-lg shadow transition-colors duration-200 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'}`}>
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
        <h3 className="text-lg font-semibold">
          {contingencyData.metadatos.variable1.etiqueta} vs {contingencyData.metadatos.variable2.etiqueta}
        </h3>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className={`font-medium mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mostrar valores:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className={`border p-2 rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            >
              <option value="absolute">Absolutos</option>
              <option value="relative">Relativos ({getRelativeModeExplanation()})</option>
            </select>
          </div>
          <button
            onClick={handleExportChart}
            disabled={exporting}
            className={`
              px-3 py-1.5 rounded text-sm font-medium
              flex items-center gap-2
              ${exporting 
                ? (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500') 
                : (darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700')
              }
              transition-colors duration-200
            `}
            title="Exportar gráfico como imagen"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Exportar</span>
              </>
            )}
          </button>
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
      
      {/* Leyenda de categorías principales solo para el treemap */}
      {chartType === "treemap" && (
        <div className="flex flex-wrap gap-4 mb-4">
          {Object.entries(colorScheme).map(([key, scheme]) => (
            <div key={key} className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: scheme.base }}
              />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {contingencyData.datos.filas[key].etiqueta}
              </span>
            </div>
          ))}
        </div>
      )}

      <div ref={chartContainerRef} className={`h-[550px] ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Título del gráfico para la exportación */}
        <div className={`text-center py-3 border-b mb-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Análisis Bivariado</h2>
          <p className={`text-base mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {variable1Title} vs {variable2Title}
          </p>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Gráfico de {getChartTypeName()}
            {viewMode === 'relative' && ` - Valores relativos (${getRelativeModeExplanation()})`}
          </p>
          {totalExcluded > 0 && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {totalExcluded} valores excluidos
              {excludedValues1.length > 0 && ` (${excludedValues1.length} de ${variable1})`}
              {excludedValues2.length > 0 && ` (${excludedValues2.length} de ${variable2})`}
            </p>
          )}
        </div>
        
        <div className="h-[calc(100%-80px)]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "treemap" ? (
              <Treemap
                data={prepareTreemapData()}
                dataKey="size"
                ratio={4/3}
                stroke={darkMode ? "#1f2937" : "#fff"}
                content={<CustomizedContent />}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            ) : (
              <BarChart 
                data={prepareStackedBarData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
                <XAxis 
                  dataKey="name"
                  tick={getAxisTickStyles()}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  axisLine={{ stroke: darkMode ? '#525252' : '#e5e7eb' }}
                  tickLine={{ stroke: darkMode ? '#525252' : '#e5e7eb' }}
                />
                <YAxis 
                  label={{
                    value: viewMode !== 'absolute' ? 'Porcentaje (%)' : 'Frecuencia',
                    angle: -90,
                    position: 'insideLeft',
                    dy: -10,
                    style: {
                      fill: darkMode ? '#e5e7eb' : '#374151'
                    }
                  }}
                  tick={getAxisTickStyles()}
                  axisLine={{ stroke: darkMode ? '#525252' : '#e5e7eb' }}
                  tickLine={{ stroke: darkMode ? '#525252' : '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: 10, 
                    fontSize: 12,
                    fontWeight: "500",
                    width: '100%',
                    color: darkMode ? '#e5e7eb' : '#374151'
                  }} 
                  iconSize={10}
                  iconType="square"
                />
                {Object.entries(contingencyData.datos.columnas)
                  .filter(([key]) => key !== "All")
                  .map(([key, col], index, array) => (
                    <Bar
                      key={key}
                      dataKey={col.etiqueta}
                      stackId="a"
                      fill={getChartColors(array.length)[index]}
                      isAnimationActive={false} // Disable animations for better export
                    />
                  ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 