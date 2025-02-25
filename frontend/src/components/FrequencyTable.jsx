import { useEffect, useState } from "react";
import { getDistribucion } from "../api/cisApi";
import { API_URL } from "../api/cisApi";

export default function FrequencyTable({ variable, sortOrder, excludedValues = [] }) {
  const [distribution, setDistribution] = useState({});
  const [valueLabels, setValueLabels] = useState({});
  const [filteredData, setFilteredData] = useState({});
  const [selectedFilter, setSelectedFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const sortData = (data) => {
    return Object.keys(data).map((code) => ({
      code,
      frequency: data[code],
      label: valueLabels[code] || code,
    })).sort((a, b) => {
      if (sortOrder === 'code') {
        return Number(a.code) - Number(b.code);
      }
      return b.frequency - a.frequency;
    });
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const dist = await getDistribucion(variable);
      setDistribution(dist);
      applyFilters(dist, selectedFilter, excludedValues);

      const response = await fetch(`${API_URL}/metadatos`);
      const metadata = await response.json();
      setValueLabels(metadata.etiquetas_valores[variable] || {});
      setLoading(false);
    }
    if (variable) {
      fetchData();
    }
  }, [variable, excludedValues]);

  // Función para aplicar filtros y exclusiones
  const applyFilters = (data, filter, exclusions) => {
    // Primero excluimos los valores seleccionados
    const dataWithExclusions = { ...data };
    exclusions.forEach(code => {
      delete dataWithExclusions[code];
    });

    // Luego aplicamos el filtro de búsqueda si existe
    if (filter === "") {
      setFilteredData(dataWithExclusions);
    } else {
      setFilteredData({ [filter]: dataWithExclusions[filter] });
    }
  };

  // Función para filtrar datos
  const handleFilterChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedFilter(selectedValue);
    applyFilters(distribution, selectedValue, excludedValues);
  };

  // Función para exportar a CSV
  const exportToCSV = () => {
    const csvContent = [
      ["Código", "Etiqueta", "Frecuencia"],
      ...distributionArray.map((row) => [row.code, row.label, row.frequency]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${variable}_frecuencia.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Recalcular datos cuando cambian las exclusiones
  useEffect(() => {
    if (Object.keys(distribution).length) {
      applyFilters(distribution, selectedFilter, excludedValues);
    }
  }, [excludedValues, distribution, selectedFilter]);

  // Modificar la conversión de datos para usar sortData
  const distributionArray = sortData(filteredData);

  // Calcular el total de casos después de excluir valores
  const totalCases = Object.values(filteredData).reduce((sum, value) => sum + value, 0);

  return (
    <div className="p-2 md:p-4 border rounded-md bg-white shadow">
      <h3 className="text-lg font-semibold mb-2">Distribución de {variable}</h3>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="font-medium block md:inline">Filtrar por respuesta:</label>
            <select
              value={selectedFilter}
              onChange={handleFilterChange}
              className="border p-2 rounded-md mt-2 md:mt-0 md:ml-2 w-full md:w-auto"
            >
              <option value="">Todas</option>
              {Object.keys(distribution).filter(code => !excludedValues.includes(code)).map((code) => (
                <option key={code} value={code}>
                  {valueLabels[code] || `Código ${code}`}
                </option>
              ))}
            </select>
          </div>

          {excludedValues.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Valores excluidos:</span> {excludedValues.length} de {Object.keys(distribution).length} respuestas
              </p>
            </div>
          )}

          <div className="overflow-x-auto -mx-2 md:mx-0">
            <table className="w-full border-collapse border border-gray-300 min-w-[400px]">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-sm md:text-base">Código</th>
                  <th className="border p-2 text-sm md:text-base">Etiqueta</th>
                  <th className="border p-2 text-sm md:text-base">Frecuencia</th>
                </tr>
              </thead>
              <tbody>
                {distributionArray.map((row) => (
                  <tr key={row.code} className="hover:bg-gray-100">
                    <td className="border p-2 text-sm md:text-base">{row.code}</td>
                    <td className="border p-2 text-sm md:text-base">{row.label}</td>
                    <td className="border p-2 text-sm md:text-base">{row.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="text-sm text-gray-600 mb-3 md:mb-0">
              Total de casos: {totalCases}
              {excludedValues.length > 0 && ` (excluidos: ${excludedValues.length})`}
            </div>
            <button
              onClick={exportToCSV}
              className="w-full md:w-auto bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
            >
              Exportar a CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
