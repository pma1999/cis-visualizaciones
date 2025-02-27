import React from 'react';

/**
 * Componente para renderizar el contenido personalizado de las celdas del Treemap
 */
const CustomizedContent = ({ 
  x, 
  y, 
  width, 
  height, 
  name, 
  mainValue, 
  mainKey, 
  colorIndex, 
  displayValue, 
  viewMode,
  colorScheme
}) => {
  const minWidthForLabel = 70;
  const minHeightForLabel = 40;
  const shouldShowLabel = width > minWidthForLabel && height > minHeightForLabel;

  // Usar las variaciones de color para todos los rectángulos
  const darkMode = colorScheme.isDarkMode;
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

export default CustomizedContent; 