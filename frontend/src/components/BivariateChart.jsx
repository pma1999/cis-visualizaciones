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
const generateBaseColors = (count) => {
  return Array.from({ length: count }, (_, i) => {
    const hue = (i * 360) / count;
    return `hsl(${hue}, 70%, 45%)`; // Color base distintivo
  });
};

// Función para generar variaciones de un color base
const generateColorVariations = (baseColor, count) => {
  const hsl = baseColor.match(/\d+/g).map(Number);
  return Array.from({ length: count }, (_, i) => {
    // Ajustar la luminosidad para subcategorías, manteniendo el mismo tono
    const lightness = 45 + (i * 15);
    return `hsl(${hsl[0]}, ${hsl[1]}%, ${Math.min(lightness, 75)}%)`;
  });
};

export default function BivariateChart({ 
  variable1, 
  variable2, 
  chartType = "treemap", 
  excludedValues1 = [], 
  excludedValues2 = [] 
}) {
  const [originalData, setOriginalData] = useState(null);
  const [contingencyData, setContingencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colorScheme, setColorScheme] = useState({});
  const [exporting, setExporting] = useState(false);
  const [variable1Title, setVariable1Title] = useState('');
  const [variable2Title, setVariable2Title] = useState('');
  const chartContainerRef = useRef(null);

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
    
    const baseColors = generateBaseColors(mainCategories.length);
    const scheme = {};
    
    mainCategories.forEach((category, index) => {
      const secondaryCategories = Object.keys(dataCopy.datos.filas[category].valores)
        .filter(key => key !== "All");
      scheme[category] = {
        base: baseColors[index],
        variations: generateColorVariations(baseColors[index], secondaryCategories.length)
      };
    });
    
    setColorScheme(scheme);
  }, [originalData, excludedValues1, excludedValues2]);

  // Función para exportar el gráfico como imagen
  const handleExportChart = async () => {
    if (!chartContainerRef.current || !contingencyData) return;
    
    setExporting(true);
    try {
      const filename = `grafico_bivariado_${variable1}_${variable2}_${chartType}_${getFormattedDate()}`;
      await exportAsImage(chartContainerRef.current, filename);
    } catch (error) {
      console.error("Error al exportar el gráfico:", error);
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

  if (loading) {
    return (
      <div className="p-4 border rounded-md bg-white shadow">
        <h3 className="text-lg font-semibold mb-4">
          Cargando datos...
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-300 rounded"></div>
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
          .map(([colKey, valor], index) => ({
            name: contingencyData.datos.columnas[colKey].etiqueta,
            secondaryLabel: contingencyData.datos.columnas[colKey].etiqueta,
            secondaryVariable: contingencyData.metadatos.variable2.etiqueta,
            mainValue: row.etiqueta,
            mainKey: key,
            colorIndex: index,
            size: valor.frecuencia,
            value: valor.frecuencia,
            percentRow: valor.porcentaje_fila,
            percentCol: valor.porcentaje_columna
          }))
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
            barData[contingencyData.datos.columnas[colKey].etiqueta] = valor.frecuencia;
          });
        return barData;
      });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    if (chartType === "treemap") {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow">
          <div className="border-b pb-2 mb-2">
            <p className="font-medium text-gray-600">{data.mainVariable}</p>
            <p className="font-bold">{data.mainValue || data.mainLabel}</p>
          </div>
          <div className="border-b pb-2 mb-2">
            <p className="font-medium text-gray-600">{data.secondaryVariable}</p>
            <p className="font-bold">{data.secondaryLabel || data.name}</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-medium">Frecuencia:</span> {data.value}</p>
            <p><span className="font-medium">% Fila:</span> {data.percentRow?.toFixed(2)}%</p>
            <p><span className="font-medium">% Columna:</span> {data.percentCol?.toFixed(2)}%</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-2 border rounded shadow">
        <p className="font-medium">{payload[0].payload.name}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  const CustomizedContent = ({ x, y, width, height, name, mainValue, mainKey, colorIndex }) => {
    const minWidthForLabel = 70;
    const minHeightForLabel = 40;
    const shouldShowLabel = width > minWidthForLabel && height > minHeightForLabel;

    // Usar las variaciones de color para todos los rectángulos
    const color = colorScheme[mainKey]?.variations[colorIndex] || "#3182ce";

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          stroke="#fff"
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
            {name}
          </text>
        )}
      </g>
    );
  };

  const getChartColors = (length) => {
    return Array.from({ length }, (_, i) => 
      `hsl(${(i * 360) / length}, 70%, 50%)`
    );
  };

  return (
    <div className="p-4 border rounded-md bg-white shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {contingencyData.metadatos.variable1.etiqueta} vs {contingencyData.metadatos.variable2.etiqueta}
        </h3>
        <button
          onClick={handleExportChart}
          disabled={exporting}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium
            flex items-center gap-2
            ${exporting ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}
            transition-colors duration-200
          `}
          title="Exportar gráfico como imagen"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      
      {totalExcluded > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <p className="text-sm text-blue-800">
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
              <span className="text-sm">
                {contingencyData.datos.filas[key].etiqueta}
              </span>
            </div>
          ))}
        </div>
      )}

      <div ref={chartContainerRef} className="h-[400px] bg-white">
        {/* Título del gráfico para la exportación */}
        <div className="text-center py-3 border-b mb-2">
          <h2 className="text-xl font-bold text-gray-800">Análisis Bivariado</h2>
          <p className="text-base text-gray-700 mt-1">
            {variable1Title} vs {variable2Title}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Gráfico de {getChartTypeName()}
          </p>
          {totalExcluded > 0 && (
            <p className="text-xs text-gray-500 mt-1">
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
                stroke="#fff"
                content={<CustomizedContent />}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            ) : (
              <BarChart data={prepareStackedBarData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {Object.entries(contingencyData.datos.columnas)
                  .filter(([key]) => key !== "All")
                  .map(([key, col], index, array) => (
                    <Bar
                      key={key}
                      dataKey={col.etiqueta}
                      stackId="a"
                      fill={getChartColors(array.length)[index]}
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