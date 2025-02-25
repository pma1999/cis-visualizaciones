/**
 * CIS API Client
 * This module handles all API communication with the backend server
 */

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || "https://cis-visualizaciones-production.up.railway.app";

// Cache Implementation
class ApiCache {
  constructor() {
    // En producción, cachear más tiempo por defecto (15 minutos vs 5 en desarrollo)
    const isProd = import.meta.env.PROD;
    const enableCache = import.meta.env.VITE_ENABLE_CACHE !== "false";
    const defaultTTL = isProd ? 15 : 5;
    const cacheTTLMinutes = parseInt(import.meta.env.VITE_CACHE_TTL_MINUTES || defaultTTL, 10);
    
    this.cache = {};
    this.cacheTTL = cacheTTLMinutes * 60 * 1000; // Convert minutes to milliseconds
    this.cacheTimestamps = {};
    this.enabled = enableCache;
    
    // TTL especial por tipo de recurso (en milisegundos)
    this.resourceTTL = {
      // La lista de archivos se actualiza con menos frecuencia en producción
      "available_files": isProd ? 30000 : 5000, // 30 seg en prod, 5 seg en dev
      // Datos de variables se cachean más tiempo
      "variables": isProd ? 3600000 : 300000, // 1 hora en prod, 5 min en dev
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
    if (import.meta.env.DEV) {
      console.log(`Fetching from: ${url}`);
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    
    // Specific error handling
    if (error.message.includes('CORS')) {
      throw new Error('Error de conexión con el servidor. Por favor, contacta al administrador.');
    }
    
    // Rethrow the error for further handling
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
  
  const data = await fetchWithErrorHandling(`${API_URL}/files`);
  apiCache.set(cacheKey, data);
  return data;
}

/**
 * Activate a data file
 * @param {string} filename - Name of the file to activate
 * @returns {Promise<Object>} Result of activation
 */
export async function activateFile(filename) {
  try {
    const data = await fetchWithErrorHandling(`${API_URL}/files/activate/${encodeURIComponent(filename)}`, {
      method: 'POST',
    });
    
    // Clear the cache since we've changed the active file
    clearApiCache();
    
    return data;
  } catch (error) {
    console.error("Error activating file:", error);
    throw error;
  }
}

/**
 * Upload a new data file
 * @param {File} file - File object to upload
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFile(file) {
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
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

/**
 * Delete a data file
 * @param {string} filename - Name of file to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFile(filename) {
  try {
    const data = await fetchWithErrorHandling(`${API_URL}/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    
    // Clear the cache for files
    apiCache.remove("available_files");
    
    return data;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

/**
 * Update a file's friendly name
 * @param {string} filename - Name of the file
 * @param {string} friendlyName - New friendly name for the file
 * @returns {Promise<Object>} Update result
 */
export async function updateFileFriendlyName(filename, friendlyName) {
  try {
    const data = await fetchWithErrorHandling(`${API_URL}/files/${encodeURIComponent(filename)}/friendly-name`, {
      method: 'POST',
      body: JSON.stringify({ friendly_name: friendlyName }),
    });
    
    // Clear the cache for files to reflect new friendly name immediately
    apiCache.remove("available_files");
    
    return data;
  } catch (error) {
    console.error("Error updating file friendly name:", error);
    throw error;
  }
}

/**
 * Update a file's description
 * @param {string} filename - Name of the file
 * @param {string} description - New description for the file
 * @returns {Promise<Object>} Update result
 */
export async function updateFileDescription(filename, description) {
  try {
    const data = await fetchWithErrorHandling(`${API_URL}/files/${encodeURIComponent(filename)}/description`, {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
    
    // Clear the cache for files to reflect new description immediately
    apiCache.remove("available_files");
    
    return data;
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
