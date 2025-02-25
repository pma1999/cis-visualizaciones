import { useEffect, useState, memo } from "react";
import { getVariables } from "../api/cisApi";

const VariablesList = memo(({ onSelect, excludeVariable, isCompact = false }) => {
  const [variables, setVariables] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVariables = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVariables();
        console.log("Variables obtenidas:", data); // Log para depuración
        setVariables(data || {});
      } catch (err) {
        console.error("Error al obtener variables:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVariables();
  }, []);

  const filteredVariables = Object.entries(variables)
    .filter(([varName]) => !excludeVariable || varName !== excludeVariable)
    .filter(([varName, varLabel]) => 
      searchTerm === "" || 
      varName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      varLabel.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const containerClasses = isCompact
    ? "flex flex-col"
    : "flex flex-col h-full";

  const listContainerClasses = isCompact
    ? "max-h-60 overflow-y-auto mt-4"
    : "flex-1 overflow-y-auto";

  return (
    <div className={containerClasses}>
      {/* Barra de búsqueda */}
      <div className={isCompact ? "" : "sticky top-0 bg-white z-10 pb-4"}>
        <input
          type="text"
          placeholder="Buscar variables..."
          className="w-full p-2 border rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Lista de variables */}
      <div className={listContainerClasses}>
        {loading ? (
          <div className="text-center py-4 text-gray-600">
            Cargando variables...
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-600">
            Error: {error}
          </div>
        ) : filteredVariables.length === 0 ? (
          <div className="text-center py-4 text-gray-600">
            {searchTerm ? "No se encontraron variables" : "No hay variables disponibles"}
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredVariables.map(([varName, varLabel]) => (
              <li key={varName}>
                <button
                  onClick={() => onSelect({
                    code: varName,
                    label: varLabel
                  })}
                  className="w-full text-left bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
                >
                  {varLabel} <span className="text-gray-300">({varName})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

export default VariablesList;
