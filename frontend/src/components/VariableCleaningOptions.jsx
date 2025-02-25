import { useState, useEffect } from "react";
import { getDistribucion } from "../api/cisApi";
import { API_URL } from "../api/cisApi";

export default function VariableCleaningOptions({
  variable,
  excludedValues,
  onExcludedValuesChange,
  label = "Limpiar variable"
}) {
  const [distribution, setDistribution] = useState({});
  const [valueLabels, setValueLabels] = useState({});
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!variable) return;
      
      setLoading(true);
      try {
        const dist = await getDistribucion(variable);
        setDistribution(dist);

        const response = await fetch(`${API_URL}/metadatos`);
        const metadata = await response.json();
        setValueLabels(metadata.etiquetas_valores[variable] || {});
      } catch (error) {
        console.error("Error fetching distribution:", error);
      }
      setLoading(false);
    }
    
    fetchData();
    setIsOpen(false); // Reset dropdown state when variable changes
  }, [variable]);

  const handleToggleValue = (value) => {
    if (excludedValues.includes(value)) {
      onExcludedValuesChange(excludedValues.filter(v => v !== value));
    } else {
      onExcludedValuesChange([...excludedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (Object.keys(distribution).length === excludedValues.length) {
      // If all are selected, deselect all
      onExcludedValuesChange([]);
    } else {
      // Otherwise, select all
      onExcludedValuesChange(Object.keys(distribution));
    }
  };

  const handleClearSelection = () => {
    onExcludedValuesChange([]);
  };

  if (!variable) return null;

  const activeExclusions = excludedValues.length > 0;

  return (
    <div className="relative mb-4 border rounded-md bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 text-left flex justify-between items-center ${activeExclusions ? 'bg-blue-50' : ''}`}
      >
        <div>
          <span className="font-medium">{label}</span>
          {activeExclusions && (
            <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {excludedValues.length} excluidos
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 border-t">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="flex justify-between mb-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {Object.keys(distribution).length === excludedValues.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                {activeExclusions && (
                  <button
                    onClick={handleClearSelection}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto">
                {Object.keys(distribution).map((value) => (
                  <div key={value} className="flex items-center py-2 border-b last:border-0">
                    <input
                      type="checkbox"
                      id={`exclude-${variable}-${value}`}
                      checked={excludedValues.includes(value)}
                      onChange={() => handleToggleValue(value)}
                      className="mr-3 h-5 w-5 text-blue-600"
                    />
                    <label htmlFor={`exclude-${variable}-${value}`} className="flex-1">
                      <span className="font-medium">{valueLabels[value] || value}</span>
                      <span className="text-sm text-gray-500 ml-2">({distribution[value]} respuestas)</span>
                    </label>
                  </div>
                ))}
              </div>

              {activeExclusions && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                  Se excluirán {excludedValues.length} respuestas del análisis. Los cálculos y gráficos se actualizarán automáticamente.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 