import html2canvas from 'html2canvas';

/**
 * Reemplaza temporalmente los colores oklch con colores rgb compatibles
 * @param {HTMLElement} element - El elemento DOM a procesar
 * @returns {Array} Un array de objetos con información sobre los elementos modificados
 */
const handleColorCompatibility = (element) => {
  if (!element) return [];
  
  const modifiedElements = [];
  
  // Encuentra todos los elementos con estilos computados
  const allElements = element.querySelectorAll('*');
  const elementsToCheck = [element, ...allElements];
  
  elementsToCheck.forEach(el => {
    const computedStyle = window.getComputedStyle(el);
    let modified = false;
    
    // Propiedades a verificar
    const colorProps = [
      'color', 'background-color', 'border-color', 
      'fill', 'stroke', 'box-shadow', 'text-shadow'
    ];
    
    const originalStyles = {};
    
    colorProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      
      // Si el valor contiene oklch (o cualquier otro formato no compatible)
      if (value && (value.includes('oklch') || value.includes('hsl'))) {
        originalStyles[prop] = value;
        modified = true;
        
        // Para elementos SVG
        if (el.tagName.toLowerCase() === 'svg' || el.ownerSVGElement) {
          if (prop === 'fill' || prop === 'stroke') {
            const originalValue = el.getAttribute(prop);
            if (originalValue) {
              originalStyles[`attr-${prop}`] = originalValue;
              // Establecer un color compatible
              el.setAttribute(prop, prop === 'fill' ? '#3182ce' : '#000000');
            }
          }
        } else {
          // Para elementos HTML normales, usar estilos inline temporales
          el.style[prop] = prop.includes('color') ? '#3182ce' : 
                           prop.includes('shadow') ? 'none' : 'inherit';
        }
      }
    });
    
    if (modified) {
      modifiedElements.push({
        element: el,
        originalStyles,
      });
    }
  });
  
  return modifiedElements;
};

/**
 * Restaura los estilos originales de los elementos modificados
 * @param {Array} modifiedElements - Array de elementos modificados con sus estilos originales
 */
const restoreOriginalStyles = (modifiedElements) => {
  modifiedElements.forEach(({ element, originalStyles }) => {
    Object.entries(originalStyles).forEach(([prop, value]) => {
      if (prop.startsWith('attr-')) {
        // Restaurar atributos SVG
        const attrName = prop.replace('attr-', '');
        element.setAttribute(attrName, value);
      } else {
        // Restaurar estilos CSS
        element.style[prop] = value;
      }
    });
  });
};

/**
 * Exporta un elemento DOM como una imagen
 * @param {HTMLElement} element - El elemento DOM a exportar
 * @param {string} filename - Nombre del archivo a descargar
 * @param {Object} options - Opciones adicionales para html2canvas
 */
export const exportAsImage = async (element, filename, options = {}) => {
  if (!element) {
    console.error('No se proporcionó un elemento para exportar');
    return false;
  }
  
  try {
    // Mostrar un indicador de carga o feedback al usuario
    const originalPosition = element.style.position;
    const originalZIndex = element.style.zIndex;
    
    // Asegurarse de que el elemento es visible para la captura
    element.style.position = 'relative';
    element.style.zIndex = '9999';
    
    // Reemplazar temporalmente colores no compatibles
    const modifiedElements = handleColorCompatibility(element);
    
    // Configuración por defecto para mejor calidad
    const defaultOptions = {
      scale: 2, // Mayor escala para mejor calidad
      useCORS: true, // Permitir imágenes de otros dominios
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ...options
    };
    
    // Capturar el elemento como canvas
    const canvas = await html2canvas(element, defaultOptions);
    
    // Restaurar estilos originales
    restoreOriginalStyles(modifiedElements);
    
    // Restaurar estilos originales del elemento principal
    element.style.position = originalPosition;
    element.style.zIndex = originalZIndex;
    
    // Convertir a imagen y descargar
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = image;
    link.click();
    
    return true;
  } catch (error) {
    console.error('Error al exportar la imagen:', error);
    return false;
  }
};

/**
 * Formatea la fecha actual para usar en nombres de archivo
 * @returns {string} Fecha formateada (YYYY-MM-DD_HH-MM-SS)
 */
export const getFormattedDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}; 