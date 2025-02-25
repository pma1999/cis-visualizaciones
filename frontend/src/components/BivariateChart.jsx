import { useEffect, useState } from "react";
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
      <h3 className="text-lg font-semibold mb-4">
        {contingencyData.metadatos.variable1.etiqueta} vs {contingencyData.metadatos.variable2.etiqueta}
      </h3>
      
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

      <div className="h-[400px]">
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
  );
} 