import React from 'react';

/**
 * Componente de tooltip personalizado para los gráficos de barras apiladas
 */
const CustomTooltip = ({ active, payload, darkMode, localViewMode }) => {
  if (!active || !payload || !payload.length) return null;

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