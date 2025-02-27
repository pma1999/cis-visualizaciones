import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend, 
  Tooltip 
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import { getAxisTickStyles } from '../../utils/colorUtils';

/**
 * Componente para renderizar un gráfico de barras apiladas
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.data - Datos formateados para el gráfico de barras
 * @param {Object} props.colorScheme - Esquema de colores para el gráfico
 * @param {Array} props.columns - Columnas a mostrar en el gráfico
 * @param {string} props.viewMode - Modo de visualización (absolute o relative)
 * @param {boolean} props.isFullscreenPage - Si se está mostrando en pantalla completa
 * @param {boolean} props.darkMode - Si se está usando el modo oscuro
 */
const StackedBarChart = ({ 
  data, 
  colorScheme = {}, 
  columns = [], 
  viewMode, 
  isFullscreenPage = false, 
  darkMode = false 
}) => {
  return (
    <ResponsiveContainer 
      width="100%" 
      height={isFullscreenPage ? 600 : 450} 
      minHeight={isFullscreenPage ? 500 : 400}
    >
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={darkMode ? '#374151' : '#e5e7eb'} 
        />
        <XAxis 
          dataKey="name" 
          tick={getAxisTickStyles(darkMode)} 
          axisLine={{ stroke: darkMode ? '#4b5563' : '#d1d5db' }}
        />
        <YAxis 
          axisLine={{ stroke: darkMode ? '#4b5563' : '#d1d5db' }}
          tick={getAxisTickStyles(darkMode)}
          label={{ 
            value: viewMode === 'relative' ? 'Porcentaje (%)' : 'Frecuencia', 
            position: 'insideLeft',
            angle: -90,
            style: { 
              textAnchor: 'middle',
              fill: darkMode ? '#e5e7eb' : '#374151',
              fontSize: 12,
            },
            dy: 50,
            dx: -10,
          }}
        />
        <Tooltip 
          content={
            <CustomTooltip 
              chartType="stacked" 
              darkMode={darkMode} 
              localViewMode={viewMode} 
            />
          } 
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        
        {/* Dinámicamente generar las barras apiladas */}
        {columns.map((columnName, index) => {
          // Comprobación adicional para evitar errores cuando no hay colores
          const colorKeys = Object.keys(colorScheme);
          if (colorKeys.length === 0) {
            // Si no hay esquema de colores, usar colores por defecto
            return (
              <Bar 
                key={columnName}
                dataKey={columnName} 
                stackId="a" 
                fill={`hsl(${(index * 30) % 360}, 70%, ${darkMode ? 55 : 45}%)`}
              />
            );
          }
          
          const colorIndex = Math.min(index, colorKeys.length - 1);
          const colorKey = colorKeys[colorIndex];
          
          // Verificar si existe variations y tiene elementos
          const variations = colorScheme[colorKey]?.variations || [];
          const variationLength = variations.length || 1;
          
          return (
            <Bar 
              key={columnName}
              dataKey={columnName} 
              stackId="a" 
              fill={
                variationLength > 0 
                  ? variations[index % variationLength]
                  : `hsl(${(index * 30) % 360}, 70%, ${darkMode ? 55 : 45}%)`
              }
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StackedBarChart; 