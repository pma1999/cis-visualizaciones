import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { getAvailableFiles, activateFile, clearApiCache } from '../api/cisApi';

// Crear el contexto
export const FileContext = createContext();

// Hook personalizado para acceder al contexto
export const useFiles = () => useContext(FileContext);

// Constantes de configuración
const API_POLLING_INTERVAL = import.meta.env.PROD ? 60000 : 10000; // 1 min en producción, 10 seg en desarrollo
const THROTTLE_INTERVAL = 2000; // Mínimo tiempo entre llamadas API (2 segundos)

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
  const [lastModifiedHash, setLastModifiedHash] = useState(null);
  const pollingTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Actualizar localStorage cuando cambia el archivo activo
  useEffect(() => {
    if (activeFile) {
      setStoredActiveFile(activeFile);
    }
  }, [activeFile]);
  
  // Función para verificar si los archivos han cambiado
  const calculateFilesHash = useCallback((filesList) => {
    return filesList
      .map(file => `${file.name}-${file.last_modified}`)
      .sort()
      .join('|');
  }, []);
  
  // Función para cargar la lista de archivos optimizada con throttling y detección de cambios
  const loadFiles = useCallback(async (forceFetch = false) => {
    try {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      // Evitar llamadas a la API demasiado frecuentes a menos que sea forzado
      if (!forceFetch && Date.now() - lastSyncTime < THROTTLE_INTERVAL) {
        setIsLoading(false);
        return;
      }
      
      // No limpiar caché en cada petición para mejorar rendimiento
      const data = await getAvailableFiles();
      
      // Calcular hash de los archivos para detectar cambios
      const newHash = calculateFilesHash(data.files || []);
      const filesChanged = newHash !== lastModifiedHash;
      
      // Solo actualizar state si hay cambios o es forzado
      if (filesChanged || forceFetch) {
        setFiles(data.files || []);
        setLastModifiedHash(newHash);
        
        // Actualizar archivo activo solo si cambió
        if (data.active_file !== activeFile) {
          setActiveFile(data.active_file || '');
        }
      }
      
      setLastSyncTime(Date.now());
      setIsLoading(false);
    } catch (err) {
      setError('Error al cargar la lista de archivos');
      setIsLoading(false);
      console.error('Error loading files:', err);
    }
  }, [activeFile, lastSyncTime, lastModifiedHash, calculateFilesHash]);
  
  // Función para activar un archivo
  const handleActivateFile = async (filename) => {
    if (filename === activeFile) {
      return { success: true, message: 'Este archivo ya está activo' };
    }
    
    try {
      setIsLoading(true);
      
      // Limpiar caché relacionada con archivos, no toda la caché
      clearApiCache('available_files');
      clearApiCache('variables');
      
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
        
        // Limpiar caché específica antes de verificar
        clearApiCache('available_files');
        
        const data = await getAvailableFiles();
        
        // Verificar si el backend reporta el archivo correcto
        if (data.active_file === filename) {
          backendVerified = true;
        } else {
          // Reintento de activación silencioso
          clearApiCache('available_files'); 
          await activateFile(filename);
          retryCount++;
        }
        
        // Actualizar lista de archivos
        setFiles(data.files || []);
        // Actualizar hash
        setLastModifiedHash(calculateFilesHash(data.files || []));
      }
      
      // Verificación final
      clearApiCache('available_files');
      const finalCheck = await getAvailableFiles();
      
      // Actualizar el archivo activo final
      const finalActiveFile = finalCheck.active_file;
      
      // Actualizar estado con lo que reporta el backend para mantener sincronización
      setActiveFile(finalActiveFile);
      setLastSyncTime(Date.now());
      setIsLoading(false);
      
      // Limpiar caché para forzar recarga de datos relacionados
      clearApiCache('variables');
      clearApiCache('datos');
      clearApiCache('distribucion');
      
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
  
  // Función para controlar el polling basado en la visibilidad del documento
  const setupPolling = useCallback(() => {
    // Cancelar cualquier polling anterior
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
    
    const poll = () => {
      if (!isMountedRef.current) return;
      
      // Solo realizar polling si el documento está visible
      if (document.visibilityState === 'visible') {
        loadFiles();
      }
      
      // Programar siguiente polling
      pollingTimeoutRef.current = setTimeout(poll, API_POLLING_INTERVAL);
    };
    
    // Iniciar polling
    poll();
    
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [loadFiles]);
  
  // Cargar la lista de archivos al montar el componente
  useEffect(() => {
    // Inicializar bandera de montado
    isMountedRef.current = true;
    
    // Manejar visibilidad del documento para pausar/reanudar polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Si se vuelve visible, forzar recarga
        loadFiles(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
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
    
    // Configurar polling inteligente
    const cleanup = setupPolling();
    
    // Limpieza al desmontar
    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanup();
    };
  }, [loadFiles, setupPolling]);
  
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