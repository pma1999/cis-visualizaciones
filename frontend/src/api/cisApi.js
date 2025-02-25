const API_URL = "https://cis-backend-zlsi.onrender.com";
const cache = {};

async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    if (error.message.includes('CORS')) {
      throw new Error('Error de conexión con el servidor. Por favor, contacta al administrador.');
    }
    throw error;
  }
}

export async function getVariables() {
  if (cache["variables"]) return cache["variables"];
  const data = await fetchWithErrorHandling(`${API_URL}/variables`);
  cache["variables"] = data.variables;
  return data.variables;
}

export async function getDatos(variable) {
  if (cache[`datos_${variable}`]) return cache[`datos_${variable}`];
  const data = await fetchWithErrorHandling(`${API_URL}/datos/${variable}`);
  cache[`datos_${variable}`] = data.datos;
  return data.datos;
}

export async function getDistribucion(variable) {
  if (cache[`distribucion_${variable}`]) return cache[`distribucion_${variable}`];
  const data = await fetchWithErrorHandling(`${API_URL}/distribucion/${variable}`);
  cache[`distribucion_${variable}`] = data.distribucion;
  return data.distribucion;
}

export async function getContingencia(variable1, variable2) {
  const cacheKey = `contingencia_${variable1}_${variable2}`;
  if (cache[cacheKey]) return cache[cacheKey];
  
  try {
    const url = `${API_URL}/contingencia/${encodeURIComponent(variable1)}/${encodeURIComponent(variable2)}`;
    const data = await fetchWithErrorHandling(url);
    
    if (data.error) {
      console.error("Backend returned error:", data.error);
      throw new Error(data.error);
    }
    
    cache[cacheKey] = data;
    return data;
  } catch (error) {
    console.error("Error in getContingencia:", error);
    throw error;
  }
}

export { API_URL };
