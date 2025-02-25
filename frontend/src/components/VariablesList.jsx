import { useEffect, useState, memo, useRef } from "react";
import { getVariables, clearApiCache } from "../api/cisApi";
import { useFiles } from "../contexts/FileContext";

// Mantener el evento personalizado para compatibilidad con el código existente
export const fileChangeEvent = new EventTarget();

const VariablesList = memo(({ onSelect, excludeVariable, isCompact = false }) => {
  const [variables, setVariables] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const eventListenerAdded = useRef(false);
  
  // Usar el contexto de archivos para detectar cambios en el archivo activo
  const { activeFile } = useFiles();
  
  const fetchVariables = async () => {
    try {
      setLoading(true);
      setError(null);
      // Limpiamos la caché antes de obtener variables para asegurar datos actualizados
      clearApiCache(); 
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

  // Efecto para cargar variables iniciales
  useEffect(() => {
    fetchVariables();
  }, []);
  
  // Efecto para recargar variables cuando cambia el archivo activo
  useEffect(() => {
    console.log("Archivo activo cambiado en VariablesList:", activeFile);
    if (activeFile) {
      fetchVariables();
    }
  }, [activeFile]);

  // Mantener el efecto del evento para compatibilidad
  useEffect(() => {
    if (!eventListenerAdded.current) {
      const handleFileChange = () => {
        console.log("Evento de cambio de archivo detectado en VariablesList");
        fetchVariables();
      };
      
      fileChangeEvent.addEventListener('fileChange', handleFileChange);
      eventListenerAdded.current = true;
      
      return () => {
        fileChangeEvent.removeEventListener('fileChange', handleFileChange);
        eventListenerAdded.current = false;
      };
    }
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
