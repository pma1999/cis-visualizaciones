/**
 * CIS API Client
 * This module handles all API communication with the backend server
 */

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || "https://cis-visualizaciones-production.up.railway.app";

// Cache Implementation
class ApiCache {
  constructor() {
    const enableCache = import.meta.env.VITE_ENABLE_CACHE !== "false";
    const cacheTTLMinutes = parseInt(import.meta.env.VITE_CACHE_TTL_MINUTES || "5", 10);
    
    this.cache = {};
    this.cacheTTL = cacheTTLMinutes * 60 * 1000; // Convert minutes to milliseconds
    this.cacheTimestamps = {};
    this.enabled = enableCache;
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
    
    // Check if cache is expired
    if (now - timestamp > this.cacheTTL) {
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
}

const apiCache = new ApiCache();

/**
 * Fetch data from API with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 * @throws {Error} Network or API error
 */
async function fetchWithErrorHandling(url, options = {}) {
  try {
    console.log(`Fetching from: ${url}`);
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
 * Clear the API cache
 */
export function clearApiCache() {
  apiCache.clear();
}

export { API_URL };
