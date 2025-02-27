import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { 
  getAvailableFiles, 
  activateFile as apiActivateFile, 
  clearApiCache, 
  getFilesMetadata, 
  updateFileFriendlyName, 
  updateFileDescription 
} from '../api/cisApi';

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

// Nuevas funciones para manejar nombres amigables por usuario
const getStoredFriendlyNames = () => {
  try {
    const stored = localStorage.getItem('cis_user_friendly_names');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Error accediendo a los nombres amigables en localStorage:", e);
    return {};
  }
};

const setStoredFriendlyName = (filename, friendlyName) => {
  try {
    const names = getStoredFriendlyNames();
    names[filename] = friendlyName;
    localStorage.setItem('cis_user_friendly_names', JSON.stringify(names));
    return true;
  } catch (e) {
    console.error("Error guardando nombre amigable en localStorage:", e);
    return false;
  }
};

// Funciones para manejar descripciones por usuario
const getStoredDescriptions = () => {
  try {
    const stored = localStorage.getItem('cis_user_descriptions');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Error accediendo a las descripciones en localStorage:", e);
    return {};
  }
};

const setStoredDescription = (filename, description) => {
  try {
    const descriptions = getStoredDescriptions();
    descriptions[filename] = description;
    localStorage.setItem('cis_user_descriptions', JSON.stringify(descriptions));
    return true;
  } catch (e) {
    console.error("Error guardando descripción en localStorage:", e);
    return false;
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
  
  // Nuevos estados para nombres amigables y descripciones personalizadas
  const [userFriendlyNames, setUserFriendlyNames] = useState(getStoredFriendlyNames());
  const [userDescriptions, setUserDescriptions] = useState(getStoredDescriptions());
  const [defaultFriendlyNames, setDefaultFriendlyNames] = useState({});
  const [defaultDescriptions, setDefaultDescriptions] = useState({});
  
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
  
  // Función para obtener el nombre amigable de un archivo
  const getFileFriendlyName = useCallback((filename) => {
    if (!filename) return '';
    
    // 1. Primero buscar en los nombres personalizados del usuario
    if (userFriendlyNames[filename]) {
      return userFriendlyNames[filename];
    }
    
    // 2. Si no hay personalización, buscar en los nombres por defecto del servidor
    const file = files.find(f => f.name === filename);
    if (file && file.friendly_name && file.friendly_name !== filename) {
      return file.friendly_name;
    }
    
    // 3. Si no hay ningún nombre amigable, devolver el nombre original
    return filename;
  }, [files, userFriendlyNames]);
  
  // Función para obtener la descripción de un archivo
  const getFileDescription = useCallback((filename) => {
    if (!filename) return '';
    
    // 1. Primero buscar en las descripciones personalizadas del usuario
    if (userDescriptions[filename]) {
      return userDescriptions[filename];
    }
    
    // 2. Si no hay personalización, buscar en las descripciones por defecto del servidor
    const file = files.find(f => f.name === filename);
    if (file && file.description) {
      return file.description;
    }
    
    // 3. Si no hay ninguna descripción, devolver cadena vacía
    return '';
  }, [files, userDescriptions]);
  
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
  const handleActivateFile = async (filename, isLocal = false) => {
    if (filename === activeFile) {
      return { success: true, message: 'Este archivo ya está activo' };
    }
    
    try {
      setIsLoading(true);
      
      // Limpiar caché relacionada con archivos, no toda la caché
      clearApiCache('available_files');
      clearApiCache('variables');
      
      // Activar el archivo (local o remoto)
      const activationResult = await apiActivateFile(filename, isLocal);
      
      // Actualizar inmediatamente el estado local para mejor UX
      setActiveFile(filename);
      
      // Si es un archivo local, no necesitamos verificar con el backend
      if (isLocal) {
        setLastSyncTime(Date.now());
        setIsLoading(false);
        return { 
          success: true, 
          activeFile: filename,
          message: 'Archivo local activado correctamente'
        };
      }
      
      // Para archivos remotos, sistema de reintentos para asegurar sincronización con el backend
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
          await apiActivateFile(filename);
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
      
      return {
        success: true,
        activeFile: finalActiveFile,
        message: backendVerified ? 'Archivo activado correctamente' : 'Archivo activado con advertencias'
      };
    } catch (error) {
      setIsLoading(false);
      console.error('Error activating file:', error);
      
      // Si hay un error, mantener el archivo activo anterior
      return {
        success: false,
        error: error.message,
        message: 'Error al activar el archivo'
      };
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
  
  // Función para actualizar nombre amigable personalizado
  const updateUserFriendlyName = async (filename, friendlyName, isLocal = false) => {
    try {
      // Actualizarlo localmente para respuesta inmediata
      setUserFriendlyNames(prev => ({
        ...prev,
        [filename]: friendlyName
      }));
      
      // Guardar en localStorage
      setStoredFriendlyName(filename, friendlyName);
      
      // Solo actualizar metadatos para archivos locales en IndexedDB
      // ya no se envía al servidor para evitar afectar a otros usuarios
      if (isLocal) {
        // Para archivos locales, actualizar solo los metadatos en IndexedDB
        await updateFileFriendlyName(filename, friendlyName, true);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating friendly name:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Función para actualizar descripción personalizada
  const updateUserDescription = async (filename, description, isLocal = false) => {
    try {
      // Actualizarlo localmente para respuesta inmediata
      setUserDescriptions(prev => ({
        ...prev,
        [filename]: description
      }));
      
      // Guardar en localStorage
      setStoredDescription(filename, description);
      
      // Solo actualizar metadatos para archivos locales en IndexedDB
      // ya no se envía al servidor para evitar afectar a otros usuarios
      if (isLocal) {
        // Para archivos locales, actualizar solo los metadatos en IndexedDB
        await updateFileDescription(filename, description, true);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating description:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Cargar metadatos del servidor (nombres amigables y descripciones por defecto)
  const loadMetadata = useCallback(async () => {
    try {
      const metadata = await getFilesMetadata();
      if (metadata && metadata.friendly_names) {
        setDefaultFriendlyNames(metadata.friendly_names);
      }
      if (metadata && metadata.descriptions) {
        setDefaultDescriptions(metadata.descriptions);
      }
    } catch (err) {
      console.error('Error loading file metadata:', err);
    }
  }, []);
  
  // Cargar metadatos al iniciar
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);
  
  // Valores y funciones que estarán disponibles a través del contexto
  const value = {
    files,
    activeFile,
    isLoading,
    error,
    loadFiles: () => loadFiles(true), // Siempre forzar carga cuando se llama explícitamente
    activateFile: handleActivateFile,
    getFileFriendlyName,
    getFileDescription,
    updateUserFriendlyName,
    updateUserDescription
  };
  
  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
}; 