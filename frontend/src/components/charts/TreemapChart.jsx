import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import CustomTooltip from './CustomTooltip';
import CustomizedContent from './CustomizedContent';

/**
 * Componente para renderizar un gráfico de tipo Treemap
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.data - Datos formateados para el Treemap
 * @param {Object} props.colorScheme - Esquema de colores para el gráfico
 * @param {string} props.viewMode - Modo de visualización (absolute o relative)
 * @param {boolean} props.isFullscreenPage - Si se está mostrando en pantalla completa
 * @param {boolean} props.darkMode - Si se está usando el modo oscuro
 */
const TreemapChart = ({ data, colorScheme, viewMode, isFullscreenPage = false, darkMode = false }) => {
  return (
    <ResponsiveContainer 
      width="100%" 
      height={isFullscreenPage ? 600 : 450} 
      minHeight={isFullscreenPage ? 500 : 400}
    >
      <Treemap
        data={data}
        dataKey="size"
        ratio={4/3}
        stroke={darkMode ? "#1f2937" : "#fff"}
        content={
          <CustomizedContent 
            colorScheme={colorScheme} 
          />
        }
      >
        <Tooltip 
          content={
            <CustomTooltip 
              chartType="treemap" 
              darkMode={darkMode} 
              localViewMode={viewMode} 
            />
          } 
        />
      </Treemap>
    </ResponsiveContainer>
  );
};

export default TreemapChart; 