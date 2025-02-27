/**
 * Utilidades para la generación de colores y esquemas de color para gráficos
 */

/**
 * Genera colores base distintivos para categorías principales
 * @param {number} count - Número de colores a generar
 * @param {boolean} darkMode - Si se debe usar el modo oscuro
 * @returns {string[]} - Array de colores en formato HSL
 */
export const generateBaseColors = (count, darkMode = false) => {
  const saturation = darkMode ? 80 : 70;
  const lightness = darkMode ? 55 : 45;
  
  return Array.from({ length: count }, (_, i) => {
    const hue = (i * 360) / count;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`; // Color base distintivo
  });
};

/**
 * Genera variaciones de un color base para subcategorías
 * @param {string} baseColor - Color base en formato HSL
 * @param {number} count - Número de variaciones a generar
 * @param {boolean} darkMode - Si se debe usar el modo oscuro
 * @returns {string[]} - Array de colores en formato HSL
 */
export const generateColorVariations = (baseColor, count, darkMode = false) => {
  const hsl = baseColor.match(/\d+/g).map(Number);
  return Array.from({ length: count }, (_, i) => {
    // Ajustar la luminosidad para subcategorías, manteniendo el mismo tono
    const lightnessDelta = darkMode ? 5 : 15;
    const lightness = (darkMode ? 55 : 45) + (i * lightnessDelta);
    return `hsl(${hsl[0]}, ${hsl[1]}%, ${Math.min(lightness, darkMode ? 80 : 75)}%)`;
  });
};

/**
 * Genera un esquema de colores para las categorías de datos
 * @param {Object} data - Datos estructurados con categorías principales y secundarias
 * @param {boolean} darkMode - Si se debe usar el modo oscuro
 * @returns {Object} - Esquema de colores organizados por categoría
 */
export const generateColorScheme = (data, darkMode = false) => {
  if (!data || !data.datos || !data.datos.filas) return {};
  
  const mainCategories = Object.entries(data.datos.filas)
    .filter(([key]) => key !== "All")
    .map(([key]) => key);
  
  const baseColors = generateBaseColors(mainCategories.length, darkMode);
  const scheme = {};
  
  mainCategories.forEach((category, index) => {
    const secondaryCategories = Object.keys(data.datos.filas[category].valores)
      .filter(key => key !== "All");
    scheme[category] = {
      base: baseColors[index],
      variations: generateColorVariations(baseColors[index], secondaryCategories.length, darkMode)
    };
  });
  
  return scheme;
};

/**
 * Genera un array de colores para usar en gráficos simples
 * @param {number} length - Número de colores a generar
 * @param {boolean} darkMode - Si se debe usar el modo oscuro
 * @returns {string[]} - Array de colores en formato HSL
 */
export const getChartColors = (length, darkMode = false) => {
  const saturation = darkMode ? 80 : 70;
  const lightness = darkMode ? 55 : 50;
  
  return Array.from({ length }, (_, i) => 
    `hsl(${(i * 360) / length}, ${saturation}%, ${lightness}%)`
  );
};

/**
 * Devuelve los estilos para los ticks de los ejes en gráficos
 * @param {boolean} darkMode - Si se debe usar el modo oscuro
 * @returns {Object} - Estilos para los ticks
 */
export const getAxisTickStyles = (darkMode = false) => {
  return { 
    fontSize: 12,
    fontWeight: "500",
    fill: darkMode ? '#e5e7eb' : '#374151'
  };
}; 