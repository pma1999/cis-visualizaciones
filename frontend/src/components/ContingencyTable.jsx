import { useEffect, useState } from "react";
import { getContingencia } from "../api/cisApi";

export default function ContingencyTable({ variable1, variable2, excludedValues1 = [], excludedValues2 = [] }) {
  const [originalData, setOriginalData] = useState(null);
  const [contingencyData, setContingencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('absolute'); // 'absolute', 'row', 'column'

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
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-300 rounded w-1/3"></div>
        <div className="h-4 bg-gray-300 rounded w-full"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
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
    <div className="p-4 border rounded-md bg-white shadow">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <label className="font-medium mr-2">Mostrar valores:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="border p-2 rounded-md"
          >
            <option value="absolute">Absolutos</option>
            <option value="row">Porcentaje por fila</option>
            <option value="column">Porcentaje por columna</option>
          </select>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
        >
          Exportar a CSV
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

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">
                {contingencyData.metadatos.variable1.etiqueta} / {contingencyData.metadatos.variable2.etiqueta}
              </th>
              {columnas.map(([key, col]) => (
                <th key={key} className="border p-2">
                  {col.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(([rowKey, row]) => (
              <tr key={rowKey} className="hover:bg-gray-50">
                <td className="border p-2 font-medium">
                  {row.etiqueta}
                </td>
                {columnas.map(([colKey]) => (
                  <td key={colKey} className="border p-2 text-center">
                    {getData(rowKey, colKey)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Total de casos: {contingencyData.metadatos.variable1.total_casos}
        {totalExcluded > 0 && ` (excluidos: ${totalExcluded})`}
      </div>
    </div>
  );
} 