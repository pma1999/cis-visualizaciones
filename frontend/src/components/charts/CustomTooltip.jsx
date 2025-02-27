import React from 'react';

/**
 * Componente de tooltip personalizado para los gráficos bivariados
 */
const CustomTooltip = ({ active, payload, chartType, darkMode, localViewMode }) => {
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
              {localViewMode === 'absolute' 
                ? 'Frecuencia:' 
                : 'Porcentaje del total:'}
            </span> 
            {localViewMode === 'absolute' 
              ? data.frecuencia 
              : `${data.percentTotal?.toFixed(2)}%`}
          </p>
          {localViewMode === 'relative' && 
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
                  {localViewMode === 'absolute' 
                    ? 'Frecuencia:' 
                    : 'Porcentaje por fila:'}
                </span> 
                {localViewMode === 'absolute' 
                  ? freqValue 
                  : `${rowValue?.toFixed(2)}%`}
              </p>
              {localViewMode === 'relative' && 
                <p><span className="font-medium">Frecuencia:</span> {freqValue}</p>
              }
              {localViewMode === 'absolute' &&
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

export default CustomTooltip; 