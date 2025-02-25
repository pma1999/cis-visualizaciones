import { createContext, useState, useContext, useEffect } from 'react';
import { getAvailableFiles, activateFile, clearApiCache } from '../api/cisApi';

// Crear el contexto
export const FileContext = createContext();

// Hook personalizado para acceder al contexto
export const useFiles = () => useContext(FileContext);

// Función auxiliar para obtener/guardar en localStorage
const getStoredActiveFile = () => {
  try {
    return localStorage.getItem('cis_active_file') || '';
  } catch (e) {
    console.error("Error accediendo a localStorage:", e);
    return '';
  }
};

const setStoredActiveFile = (filename) => {
  try {
    localStorage.setItem('cis_active_file', filename || '');
  } catch (e) {
    console.error("Error guardando en localStorage:", e);
  }
};

// Proveedor del contexto
export const FileProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  // Inicializar el archivo activo desde localStorage si existe
  const [activeFile, setActiveFile] = useState(getStoredActiveFile());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  
  // Actualizar localStorage cuando cambia el archivo activo
  useEffect(() => {
    if (activeFile) {
      console.log(`FileContext: Guardando archivo activo en localStorage: "${activeFile}"`);
      setStoredActiveFile(activeFile);
    }
  }, [activeFile]);
  
  // Función para cargar la lista de archivos
  const loadFiles = async (forceFetch = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Evitar llamadas a la API demasiado frecuentes a menos que sea forzado
      if (!forceFetch && Date.now() - lastSyncTime < 2000) {
        // Eliminar debug excesivo
        setIsLoading(false);
        return;
      }
      
      // Evitar problemas de caché forzando recarga completa
      clearApiCache(); // Limpiar caché antes de obtener archivos
      
      const data = await getAvailableFiles();
      setFiles(data.files || []);
      
      // Actualizar archivo activo solo si cambió
      if (data.active_file !== activeFile) {
        setActiveFile(data.active_file || '');
      }
      
      setLastSyncTime(Date.now());
      setIsLoading(false);
    } catch (err) {
      setError('Error al cargar la lista de archivos');
      setIsLoading(false);
      console.error('Error loading files:', err);
    }
  };
  
  // Función para activar un archivo
  const handleActivateFile = async (filename) => {
    if (filename === activeFile) {
      return { success: true, message: 'Este archivo ya está activo' };
    }
    
    try {
      setIsLoading(true);
      
      // Limpiar caché antes de activar
      clearApiCache();
      
      // Primera activación
      const activationResult = await activateFile(filename);
      
      // Actualizar inmediatamente el estado local para mejor UX
      setActiveFile(filename);
      
      // Sistema de reintentos para asegurar sincronización con el backend
      let retryCount = 0;
      let maxRetries = 3;
      let backendVerified = false;
      
      // Bucle de verificación con reintentos
      while (retryCount < maxRetries && !backendVerified) {
        // Esperamos un poco entre intentos (incrementalmente)
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        
        // Limpiar caché antes de verificar
        clearApiCache();
        
        const data = await getAvailableFiles();
        
        // Verificar si el backend reporta el archivo correcto
        if (data.active_file === filename) {
          backendVerified = true;
        } else {
          // Reintento de activación silencioso
          clearApiCache(); 
          await activateFile(filename);
          retryCount++;
        }
        
        // Actualizar lista de archivos
        setFiles(data.files || []);
      }
      
      // Verificación final
      clearApiCache();
      const finalCheck = await getAvailableFiles();
      
      // Actualizar el archivo activo final
      const finalActiveFile = finalCheck.active_file;
      
      // Actualizar estado con lo que reporta el backend para mantener sincronización
      setActiveFile(finalActiveFile);
      setLastSyncTime(Date.now());
      setIsLoading(false);
      
      // Limpiar caché API para forzar recarga de datos
      clearApiCache();
      
      return { 
        success: true, 
        message: finalActiveFile === filename 
          ? 'Archivo activado correctamente' 
          : 'El sistema seleccionó un archivo diferente al solicitado',
        activeFile: finalActiveFile
      };
    } catch (err) {
      setError(`Error al activar el archivo: ${err.message}`);
      setIsLoading(false);
      console.error('Error activating file:', err);
      return { success: false, message: err.message };
    }
  };
  
  // Cargar la lista de archivos al montar el componente
  useEffect(() => {
    // Si tenemos un archivo activo en localStorage, intentar reactivarlo
    const storedFile = getStoredActiveFile();
    if (storedFile) {
      handleActivateFile(storedFile)
        .then(result => {
          if (!result.success) {
            loadFiles(true);
          }
        })
        .catch(() => {
          loadFiles(true);
        });
    } else {
      // Si no hay archivo guardado, cargar la lista normalmente
      loadFiles(true);
    }
    
    // Configurar intervalo para sincronizar con el backend cada 5 segundos
    const syncInterval = setInterval(() => {
      loadFiles();
    }, 5000);
    
    return () => clearInterval(syncInterval);
  }, []);
  
  // Valores y funciones que estarán disponibles a través del contexto
  const value = {
    files,
    activeFile,
    isLoading,
    error,
    loadFiles: () => loadFiles(true), // Siempre forzar carga cuando se llama explícitamente
    activateFile: handleActivateFile
  };
  
  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
}; 