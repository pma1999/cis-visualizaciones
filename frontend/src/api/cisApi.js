/**
 * CIS API Client
 * This module handles all API communication with the backend server
 */

// Importar funciones de almacenamiento local
import { 
  saveLocalFile, 
  getLocalFile, 
  listLocalFiles, 
  deleteLocalFile,
  updateLocalFileMetadata
} from '../utils/localFileStorage';

// Determinar si estamos en producción
const isProduction = import.meta.env.PROD;

// API Configuration
const API_URL = isProduction 
  ? import.meta.env.VITE_API_URL || "https://cis-visualizaciones-production.up.railway.app"
  : "http://127.0.0.1:8000";

// Configuración para preferir archivos locales
const PREFER_LOCAL_FILES = true; // Por defecto, preferir archivos locales

// Cache Implementation
class ApiCache {
  constructor() {
    // En producción, cachear más tiempo por defecto (15 minutos vs 5 en desarrollo)
    const enableCache = import.meta.env.VITE_ENABLE_CACHE !== "false";
    const defaultTTL = isProduction ? 15 : 5;
    const cacheTTLMinutes = parseInt(import.meta.env.VITE_CACHE_TTL_MINUTES || defaultTTL, 10);
    
    this.cache = {};
    this.cacheTTL = cacheTTLMinutes * 60 * 1000; // Convert minutes to milliseconds
    this.cacheTimestamps = {};
    this.enabled = enableCache;
    
    // TTL especial por tipo de recurso (en milisegundos)
    this.resourceTTL = {
      // La lista de archivos se actualiza con menos frecuencia en producción
      "available_files": isProduction ? 30000 : 5000, // 30 seg en prod, 5 seg en dev
      // Datos de variables se cachean más tiempo
      "variables": isProduction ? 3600000 : 300000, // 1 hora en prod, 5 min en dev
    };
    
    // Contador de solicitudes para prevenir sobrecarga
    this.requestCounts = {};
    this.requestCountResetInterval = setInterval(() => {
      this.requestCounts = {};
    }, 60000); // Reset cada minuto
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    if (!this.enabled || !this.cache[key]) return null;
    
    const timestamp = this.cacheTimestamps[key] || 0;
    const now = Date.now();
    
    // Determinar TTL específico para este recurso
    let ttl = this.cacheTTL;
    for (const resourceKey in this.resourceTTL) {
      if (key.includes(resourceKey)) {
        ttl = this.resourceTTL[resourceKey];
        break;
      }
    }
    
    // Check if cache is expired
    if (now - timestamp > ttl) {
      this.remove(key);
      return null;
    }
    
    return this.cache[key];
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    if (!this.enabled) return;
    
    this.cache[key] = value;
    this.cacheTimestamps[key] = Date.now();
  }

  /**
   * Remove a value from cache
   * @param {string} key - Cache key
   */
  remove(key) {
    delete this.cache[key];
    delete this.cacheTimestamps[key];
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache = {};
    this.cacheTimestamps = {};
  }
  
  /**
   * Clear cache for specific resource pattern
   * @param {string} pattern - Pattern to match in cache keys
   */
  clearPattern(pattern) {
    if (!pattern) return;
    
    Object.keys(this.cache).forEach(key => {
      if (key.includes(pattern)) {
        this.remove(key);
      }
    });
  }
  
  /**
   * Check if a request should be throttled to prevent API abuse
   * @param {string} url - Request URL
   * @returns {boolean} - True if should throttle, false otherwise
   */
  shouldThrottle(url) {
    // Extraer patrón base de la URL
    const urlPattern = url.split('?')[0].replace(API_URL, '');
    
    // Inicializar contador si no existe
    if (!this.requestCounts[urlPattern]) {
      this.requestCounts[urlPattern] = 0;
    }
    
    // Incrementar contador
    this.requestCounts[urlPattern]++;
    
    // Límites por tipo de endpoint
    const limits = {
      "/files": 10,
      "/variables": 5,
      default: 20
    };
    
    // Determinar límite aplicable
    let limit = limits.default;
    Object.keys(limits).forEach(pattern => {
      if (urlPattern.includes(pattern)) {
        limit = limits[pattern];
      }
    });
    
    // Determinar si debería limitarse
    return this.requestCounts[urlPattern] > limit;
  }
  
  // Limpiar al destruir
  destroy() {
    clearInterval(this.requestCountResetInterval);
  }
}

const apiCache = new ApiCache();

// Asegurar limpieza de recursos al cerrar
window.addEventListener('beforeunload', () => {
  apiCache.destroy();
});

/**
 * Fetch data from API with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 * @throws {Error} Network or API error
 */
async function fetchWithErrorHandling(url, options = {}) {
  try {
    // Comprobar límites de API para evitar sobrecargas
    if (apiCache.shouldThrottle(url) && options.method !== 'POST') {
      console.warn(`Throttling request to: ${url}`);
      
      // Usar caché existente si disponible o esperar un poco y reintentar
      const cacheKey = getCacheKeyFromUrl(url);
      const cachedData = apiCache.get(cacheKey);
      
      if (cachedData) {
        console.log(`Serving throttled request from cache: ${url}`);
        return cachedData;
      }
      
      // Esperar un momento antes de intentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Solo mostrar logs de fetch en desarrollo
    if (!isProduction) {
      console.log(`Fetching from: ${url}`);
    }
    
    // Establecer un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
    
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      mode: 'cors',
      signal: controller.signal
    };
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Mejorar detección de errores CORS
    const isCorsError = error.message.includes('CORS') || 
                        (error.name === 'TypeError' && error.message.includes('Failed to fetch')) ||
                        error.name === 'AbortError';
    
    if (isCorsError) {
      console.warn('Error CORS detectado, se recomienda usar almacenamiento local:', error.message);
      
      // Si estamos en producción, podríamos querer registrar estos errores para análisis
      if (isProduction) {
        console.error('Error CORS en producción:', {
          url,
          method: options.method || 'GET',
          error: error.message
        });
      }
      
      throw new Error('Error de conexión con el servidor. Se usará almacenamiento local.');
    }
    
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
}

// Helper para obtener clave de caché a partir de URL
function getCacheKeyFromUrl(url) {
  const urlObj = new URL(url);
  const path = urlObj.pathname.replace(/\//g, '_');
  return path;
}

/**
 * Get all variables
 * @returns {Promise<Object>} Dictionary of variables with their labels
 */
export async function getVariables() {
  const cacheKey = "variables";
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) return cachedData;
  
  const data = await fetchWithErrorHandling(`${API_URL}/variables`);
  apiCache.set(cacheKey, data.variables);
  return data.variables;
}

/**
 * Get data for a specific variable
 * @param {string} variable - Variable code
 * @returns {Promise<Array>} Variable data
 */
export async function getDatos(variable) {
  const cacheKey = `datos_${variable}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) return cachedData;
  
  const data = await fetchWithErrorHandling(`${API_URL}/datos/${encodeURIComponent(variable)}`);
  apiCache.set(cacheKey, data.datos);
  return data.datos;
}

/**
 * Get distribution for a specific variable
 * @param {string} variable - Variable code
 * @returns {Promise<Object>} Distribution data
 */
export async function getDistribucion(variable) {
  const cacheKey = `distribucion_${variable}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) return cachedData;
  
  const data = await fetchWithErrorHandling(`${API_URL}/distribucion/${encodeURIComponent(variable)}`);
  apiCache.set(cacheKey, data.distribucion);
  return data.distribucion;
}

/**
 * Get contingency table for two variables
 * @param {string} variable1 - First variable code
 * @param {string} variable2 - Second variable code
 * @returns {Promise<Object>} Contingency table data
 */
export async function getContingencia(variable1, variable2) {
  const cacheKey = `contingencia_${variable1}_${variable2}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) return cachedData;
  
  try {
    const url = `${API_URL}/contingencia/${encodeURIComponent(variable1)}/${encodeURIComponent(variable2)}`;
    const data = await fetchWithErrorHandling(url);
    
    if (data.error) {
      console.error("Backend returned error:", data.error);
      throw new Error(data.error);
    }
    
    apiCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error in getContingencia:", error);
    throw error;
  }
}

/**
 * Get all available data files
 * @returns {Promise<Object>} List of available files and active file
 */
export async function getAvailableFiles() {
  const cacheKey = "available_files";
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) return cachedData;
  
  try {
    // Obtener archivos locales
    const localFiles = await listLocalFiles();
    
    // Obtener archivos remotos
    const remoteData = await fetchWithErrorHandling(`${API_URL}/files`);
    const remoteFiles = remoteData.files || [];
    
    // Marcar los archivos remotos
    const markedRemoteFiles = remoteFiles.map(file => ({
      ...file,
      isLocal: false,
      isRemote: true
    }));
    
    // Combinar archivos locales y remotos, evitando duplicados si tienen el mismo nombre
    let combinedFiles = [...localFiles];
    
    // Añadir archivos remotos que no estén ya en la lista local
    markedRemoteFiles.forEach(remoteFile => {
      if (!localFiles.some(localFile => localFile.name === remoteFile.name)) {
        combinedFiles.push(remoteFile);
      }
    });
    
    // Ordenar por fecha de modificación (más recientes primero)
    combinedFiles.sort((a, b) => b.last_modified - a.last_modified);
    
    // Determinar archivo activo
    // Si hay uno guardado en localStorage, usarlo
    const storedActiveFile = localStorage.getItem('cis_active_file');
    let activeFile = remoteData.active_file;
    
    // Si hay un archivo local activo, priorizarlo sobre el remoto
    if (storedActiveFile && 
        (localFiles.some(file => file.name === storedActiveFile) || 
         remoteFiles.some(file => file.name === storedActiveFile))) {
      activeFile = storedActiveFile;
    }
    
    const result = {
      files: combinedFiles,
      active_file: activeFile,
      local_files_available: localFiles.length > 0
    };
    
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error getting available files:", error);
    
    // Si falla la obtención de archivos remotos, al menos devolver los locales
    try {
      const localFiles = await listLocalFiles();
      const storedActiveFile = localStorage.getItem('cis_active_file');
      
      const result = {
        files: localFiles,
        active_file: storedActiveFile,
        local_files_available: localFiles.length > 0,
        remote_error: true
      };
      
      apiCache.set(cacheKey, result);
      return result;
    } catch (localError) {
      console.error("Error getting local files:", localError);
      throw error; // Lanzar el error original
    }
  }
}

/**
 * Activate a data file
 * @param {string} filename - Name of the file to activate
 * @param {boolean} isLocal - Whether the file is stored locally
 * @returns {Promise<Object>} Result of activation
 */
export async function activateFile(filename, isLocal = false) {
  try {
    // Guardar el nombre del archivo activo en localStorage
    localStorage.setItem('cis_active_file', filename);
    
    if (isLocal) {
      // Para archivos locales solo necesitamos guardarlo en localStorage
      // y limpiar la caché
      clearApiCache();
      
      return { 
        success: true, 
        message: 'Archivo local activado correctamente',
        isLocal: true
      };
    } else {
      // Para archivos remotos, activar en el servidor
      const data = await fetchWithErrorHandling(`${API_URL}/files/activate/${encodeURIComponent(filename)}`, {
        method: 'POST',
      });
      
      // Clear the cache since we've changed the active file
      clearApiCache();
      
      return data;
    }
  } catch (error) {
    console.error("Error activating file:", error);
    throw error;
  }
}

/**
 * Upload a new data file
 * @param {File} file - File object to upload
 * @param {boolean} saveLocally - Whether to save the file locally instead of sending to server
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFile(file, saveLocally = PREFER_LOCAL_FILES) {
  try {
    // Siempre intentar guardar localmente si está configurado así o estamos en producción
    if (saveLocally) {
      // Guardar el archivo localmente
      const result = await saveLocalFile(file);
      
      // Actualizar el archivo activo
      localStorage.setItem('cis_active_file', file.name);
      
      // Limpiar caché
      apiCache.remove("available_files");
      
      return {
        success: true,
        file: file.name,
        isLocal: true,
        message: "Archivo subido y guardado localmente"
      };
    } else {
      // En producción, verificar primero si podemos acceder al servidor
      // para evitar intentos fallidos de carga que serían rechazados por CORS
      if (isProduction) {
        try {
          // Hacer una petición pequeña para verificar CORS
          await fetch(`${API_URL}/`, { 
            method: 'HEAD',
            mode: 'cors',
            cache: 'no-cache',
            timeout: 3000
          });
        } catch (corsError) {
          console.warn('Detectado problema CORS, usando almacenamiento local como fallback');
          // Si hay un error CORS, usar almacenamiento local como fallback
          return uploadFile(file, true);
        }
      }
      
      // Enviar al servidor (comportamiento original)
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_URL}/files/upload`, {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header, let the browser set it with the boundary
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Clear the cache for files
        apiCache.remove("available_files");
        
        return data;
      } catch (uploadError) {
        console.error("Error al subir archivo al servidor, intentando almacenamiento local:", uploadError);
        // Si falla la carga al servidor por cualquier motivo, intentar almacenamiento local
        return uploadFile(file, true);
      }
    }
  } catch (error) {
    console.error("Error uploadingfile:", error);
    throw error;
  }
}

/**
 * Delete a file (local or remote)
 * @param {string} filename - Name of file to delete
 * @param {boolean} isLocal - Whether the file is stored locally
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFile(filename, isLocal = false) {
  try {
    if (isLocal) {
      // Eliminar archivo local
      const result = await deleteLocalFile(filename);
      
      // Si el archivo eliminado era el activo, limpiar el estado
      if (localStorage.getItem('cis_active_file') === filename) {
        localStorage.removeItem('cis_active_file');
      }
      
      // Limpiar caché
      apiCache.remove("available_files");
      
      return {
        success: true,
        message: "Archivo local eliminado correctamente"
      };
    } else {
      // Eliminar en el servidor (comportamiento original)
      const data = await fetchWithErrorHandling(`${API_URL}/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      
      // Clear the cache for files
      apiCache.remove("available_files");
      
      return data;
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

/**
 * Update a file's friendly name (local or remote)
 * @param {string} filename - Name of the file
 * @param {string} friendlyName - New friendly name for the file
 * @param {boolean} isLocal - Whether the file is stored locally
 * @returns {Promise<Object>} Update result
 */
export async function updateFileFriendlyName(filename, friendlyName, isLocal = false) {
  try {
    if (isLocal) {
      // Actualizar nombre amigable de archivo local
      const result = await updateLocalFileMetadata(filename, { friendly_name: friendlyName });
      
      // Limpiar caché
      apiCache.remove("available_files");
      
      return {
        success: true,
        filename,
        friendly_name: friendlyName
      };
    } else {
      // Actualizar en el servidor (comportamiento original)
      const data = await fetchWithErrorHandling(`${API_URL}/files/${encodeURIComponent(filename)}/friendly-name`, {
        method: 'POST',
        body: JSON.stringify({ friendly_name: friendlyName }),
      });
      
      // Clear the cache for files to reflect new friendly name immediately
      apiCache.remove("available_files");
      
      return data;
    }
  } catch (error) {
    console.error("Error updating file friendly name:", error);
    throw error;
  }
}

/**
 * Update a file's description (local or remote)
 * @param {string} filename - Name of the file
 * @param {string} description - New description for the file
 * @param {boolean} isLocal - Whether the file is stored locally
 * @returns {Promise<Object>} Update result
 */
export async function updateFileDescription(filename, description, isLocal = false) {
  try {
    if (isLocal) {
      // Actualizar descripción de archivo local
      const result = await updateLocalFileMetadata(filename, { description });
      
      // Limpiar caché
      apiCache.remove("available_files");
      
      return {
        success: true,
        filename,
        description
      };
    } else {
      // Actualizar en el servidor (comportamiento original)
      const data = await fetchWithErrorHandling(`${API_URL}/files/${encodeURIComponent(filename)}/description`, {
        method: 'POST',
        body: JSON.stringify({ description }),
      });
      
      // Clear the cache for files to reflect new description immediately
      apiCache.remove("available_files");
      
      return data;
    }
  } catch (error) {
    console.error("Error updating file description:", error);
    throw error;
  }
}

/**
 * Get all file metadata (friendly names and descriptions)
 * @returns {Promise<Object>} Metadata
 */
export async function getFilesMetadata() {
  const cacheKey = "files_metadata";
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) return cachedData;
  
  try {
    const data = await fetchWithErrorHandling(`${API_URL}/files/metadata`);
    apiCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error getting files metadata:", error);
    throw error;
  }
}

/**
 * Clear the API cache for specific pattern or completely
 * @param {string} pattern - Optional pattern to match cache keys
 */
export function clearApiCache(pattern) {
  if (pattern) {
    apiCache.clearPattern(pattern);
  } else {
    apiCache.clear();
  }
}

export { API_URL };
