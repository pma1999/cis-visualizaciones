import { useEffect, useState, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { getDistribucion } from "../api/cisApi";
import { API_URL } from "../api/cisApi";
import { exportAsImage, getFormattedDate } from "../utils/chartExport";

const COLORS = ["#007bff", "#ff7300", "#00c49f", "#ffbb28", "#ff8042", "#8884d8"]; // Colores para gráfico de pastel

export default function ChartComponent({ variable, chartType, sortOrder, excludedValues = [] }) {
  const [chartData, setChartData] = useState([]);
  const [valueLabels, setValueLabels] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [variableTitle, setVariableTitle] = useState('');
  const chartContainerRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const dist = await getDistribucion(variable);
      const response = await fetch(`${API_URL}/metadatos`);
      const metadata = await response.json();
      const etiquetas = metadata.etiquetas_valores[variable] || {};
      
      // Obtener el título completo de la variable desde los metadatos
      if (metadata.variables && metadata.variables[variable]) {
        setVariableTitle(metadata.variables[variable].etiqueta || variable);
      } else {
        setVariableTitle(variable);
      }

      // Filtrar los valores excluidos
      const filteredDist = { ...dist };
      excludedValues.forEach(code => {
        delete filteredDist[code];
      });

      let formattedData = Object.keys(filteredDist).map((code) => ({
        code,
        frequency: filteredDist[code],
        label: etiquetas[code] || `Código ${code}`,
        color: COLORS[Object.keys(filteredDist).indexOf(code) % COLORS.length]
      }));

      // Ordenar los datos según sortOrder
      formattedData.sort((a, b) => {
        if (sortOrder === 'code') {
          return Number(a.code) - Number(b.code);
        }
        return b.frequency - a.frequency;
      });

      setValueLabels(etiquetas);
      setChartData(formattedData);
      setLoading(false);
    }
    
    if (variable) {
      fetchData();
    }
  }, [variable, sortOrder, excludedValues]); // Añadir excludedValues como dependencia

  const handleExportChart = async () => {
    if (!chartContainerRef.current) return;
    
    setExporting(true);
    try {
      const filename = `grafico_${variable}_${chartType}_${getFormattedDate()}`;
      await exportAsImage(chartContainerRef.current, filename);
    } catch (error) {
      console.error("Error al exportar el gráfico:", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-2 md:p-4 border rounded-md bg-white shadow">
        <h3 className="text-lg font-semibold mb-4">Gráfico de {variable}</h3>
        <div className="animate-pulse h-[300px] bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Obtener nombre del tipo de gráfico para el título
  const getChartTypeName = () => {
    switch(chartType) {
      case 'bar': return 'barras';
      case 'line': return 'líneas';
      case 'pie': return 'sectores';
      default: return 'barras';
    }
  };

  return (
    <div className="p-2 md:p-4 border rounded-md bg-white shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Gráfico de {variable}</h3>
        <button
          onClick={handleExportChart}
          disabled={exporting || chartData.length === 0}
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
      
      {excludedValues.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Valores excluidos:</span> {excludedValues.length} respuestas
          </p>
        </div>
      )}
      
      <div ref={chartContainerRef} className="h-[300px] md:h-[400px] w-full bg-white">
        {/* Título del gráfico para la exportación */}
        <div className="text-center py-3 border-b mb-2">
          <h2 className="text-xl font-bold text-gray-800">{variableTitle}</h2>
          <p className="text-sm text-gray-600">Gráfico de {getChartTypeName()}</p>
          {excludedValues.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {excludedValues.length} valores excluidos
            </p>
          )}
        </div>
        
        <div className="h-[calc(100%-60px)]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" && (
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, width: 50 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="frequency" fill="#007bff" />
              </BarChart>
            )}
            {chartType === "line" && (
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, width: 50 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="frequency" stroke="#007bff" />
              </LineChart>
            )}
            {chartType === "pie" && (
              <PieChart>
                <Pie 
                  data={chartData} 
                  dataKey="frequency" 
                  nameKey="label" 
                  outerRadius="80%"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
