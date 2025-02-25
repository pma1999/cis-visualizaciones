import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { getDistribucion } from "../api/cisApi";
import { API_URL } from "../api/cisApi";


const COLORS = ["#007bff", "#ff7300", "#00c49f", "#ffbb28", "#ff8042", "#8884d8"]; // Colores para gráfico de pastel

export default function ChartComponent({ variable, chartType, sortOrder, excludedValues = [] }) {
  const [chartData, setChartData] = useState([]);
  const [valueLabels, setValueLabels] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const dist = await getDistribucion(variable);
      const response = await fetch(`${API_URL}/metadatos`);
      const metadata = await response.json();
      const etiquetas = metadata.etiquetas_valores[variable] || {};

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

  if (loading) {
    return (
      <div className="p-2 md:p-4 border rounded-md bg-white shadow">
        <h3 className="text-lg font-semibold mb-4">Gráfico de {variable}</h3>
        <div className="animate-pulse h-[300px] bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 border rounded-md bg-white shadow">
      <h3 className="text-lg font-semibold mb-4">Gráfico de {variable}</h3>
      
      {excludedValues.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Valores excluidos:</span> {excludedValues.length} respuestas
          </p>
        </div>
      )}
      
      <div className="h-[300px] md:h-[400px] w-full">
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
  );
}
