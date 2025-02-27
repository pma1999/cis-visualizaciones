import html2canvas from 'html2canvas';
import { saveSvgAsPng } from 'save-svg-as-png';
import { renderToString } from 'react-dom/server';

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

/**
 * Crea un contenedor dedicado para la exportación del gráfico
 * @param {Object} dimensions - Dimensiones del contenedor
 * @returns {HTMLElement} Contenedor creado
 */
const createExportContainer = (dimensions = { width: 800, height: 600 }) => {
  // Eliminar contenedor existente si hay alguno
  const existingContainer = document.getElementById('chart-export-container');
  if (existingContainer) {
    document.body.removeChild(existingContainer);
  }
  
  // Crear nuevo contenedor con ID único
  const container = document.createElement('div');
  container.id = 'chart-export-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = 0;
  container.style.width = `${dimensions.width}px`;
  container.style.height = `${dimensions.height}px`;
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '0';
  container.style.margin = '0';
  container.style.overflow = 'hidden';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';
  
  document.body.appendChild(container);
  return container;
};

/**
 * Crea y agrega una sección de título al contenedor de exportación
 * @param {HTMLElement} container - Contenedor donde se agregará el título
 * @param {Object} options - Opciones de configuración del título
 */
const addTitleSection = (container, options) => {
  const titleSection = document.createElement('div');
  titleSection.style.textAlign = 'center';
  titleSection.style.padding = '20px 10px';
  titleSection.style.borderBottom = '1px solid #eaeaea';
  titleSection.style.backgroundColor = '#ffffff';
  titleSection.style.width = '100%';
  
  titleSection.innerHTML = `
    <h2 style="font-size: 22px; margin: 0 0 10px 0; font-weight: bold; color: #333;">${options.title || ''}</h2>
    ${options.subtitle ? `<p style="font-size: 16px; margin: 0 0 5px 0; color: #555;">${options.subtitle}</p>` : ''}
    ${options.description ? `<p style="font-size: 14px; margin: 5px 0 0 0; color: #777;">${options.description}</p>` : ''}
  `;
  
  container.appendChild(titleSection);
};

/**
 * Crea y agrega una sección de leyenda al contenedor de exportación
 * @param {HTMLElement} container - Contenedor donde se agregará la leyenda
 * @param {Array} legendItems - Elementos de la leyenda (color, texto)
 * @param {Object} options - Opciones de configuración
 */
const addLegendSection = (container, legendItems, options = {}) => {
  if (!legendItems || !legendItems.length) return;
  
  const legendSection = document.createElement('div');
  legendSection.style.padding = '15px';
  legendSection.style.textAlign = options.legendAlign || 'center';
  legendSection.style.display = 'flex';
  legendSection.style.flexWrap = 'wrap';
  legendSection.style.justifyContent = 'center';
  legendSection.style.gap = '15px';
  legendSection.style.width = '100%';
  legendSection.style.borderTop = '1px solid #eaeaea';
  legendSection.style.marginTop = '10px';
  
  legendItems.forEach(item => {
    const legendItem = document.createElement('div');
    legendItem.style.display = 'flex';
    legendItem.style.alignItems = 'center';
    legendItem.style.marginRight = '15px';
    
    const colorBox = document.createElement('div');
    colorBox.style.width = '15px';
    colorBox.style.height = '15px';
    colorBox.style.backgroundColor = item.color;
    colorBox.style.marginRight = '8px';
    colorBox.style.borderRadius = '3px';
    
    const label = document.createElement('span');
    label.style.fontSize = '14px';
    label.style.color = '#333';
    label.textContent = item.text;
    
    legendItem.appendChild(colorBox);
    legendItem.appendChild(label);
    legendSection.appendChild(legendItem);
  });
  
  container.appendChild(legendSection);
};

/**
 * Agrega una nota al pie para información adicional como valores excluidos
 * @param {HTMLElement} container - Contenedor donde se agregará la nota
 * @param {string} text - Texto de la nota
 */
const addFootnoteSection = (container, text) => {
  if (!text) return;
  
  const footnoteSection = document.createElement('div');
  footnoteSection.style.padding = '10px 15px';
  footnoteSection.style.borderTop = '1px solid #eaeaea';
  footnoteSection.style.fontSize = '12px';
  footnoteSection.style.color = '#666';
  footnoteSection.style.textAlign = 'center';
  footnoteSection.style.width = '100%';
  footnoteSection.textContent = text;
  
  container.appendChild(footnoteSection);
};

/**
 * Obtiene configuraciones específicas según el dispositivo
 * @returns {Object} Configuraciones específicas del dispositivo
 */
const getDeviceSpecificSettings = () => {
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  
  return {
    width: isMobile ? 800 : 1200,
    height: isMobile ? 700 : 900,
    legendPosition: isMobile ? 'bottom' : 'right',
    chartHeight: isMobile ? 500 : 600,
    fontSize: {
      title: isMobile ? 16 : 20,
      subtitle: isMobile ? 14 : 16,
      labels: isMobile ? 12 : 14,
      legend: isMobile ? 10 : 12
    },
    margins: isMobile 
      ? { top: 10, right: 10, bottom: 60, left: 30 }
      : { top: 20, right: 20, bottom: 40, left: 40 }
  };
};

/**
 * Optimiza un elemento SVG para la exportación
 * @param {SVGElement} svgElement - Elemento SVG a optimizar
 * @param {number} width - Ancho deseado
 * @param {number} height - Altura deseada
 */
const optimizeSvgForExport = (svgElement, width, height) => {
  if (!svgElement) return;
  
  // Aplicar dimensiones explícitas
  svgElement.setAttribute('width', width);
  svgElement.setAttribute('height', height);
  
  // Asegurar que el SVG tiene viewBox
  if (!svgElement.getAttribute('viewBox')) {
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  
  // Optimización adicional para aprovechar el espacio
  svgElement.style.display = 'block';
  svgElement.style.margin = '0 auto';
  svgElement.style.maxWidth = '100%';
  svgElement.style.maxHeight = '100%';
  
  // Optimizar textos y fuentes
  svgElement.setAttribute('font-family', 'Arial, sans-serif');
  svgElement.setAttribute('text-rendering', 'geometricPrecision');
  
  // Optimizar textos individuales
  const textElements = svgElement.querySelectorAll('text');
  textElements.forEach(text => {
    if (!text.getAttribute('font-family')) {
      text.setAttribute('font-family', 'Arial, sans-serif');
    }
    
    // Garantizar visibilidad del texto
    const currentFontSize = text.getAttribute('font-size');
    if (!currentFontSize || parseInt(currentFontSize) < 10) {
      text.setAttribute('font-size', '12');
    }
    
    // Mejorar legibilidad con un ligero contorno
    if (!text.getAttribute('stroke-width')) {
      text.setAttribute('stroke-width', '0.5');
      text.setAttribute('stroke', 'rgba(255,255,255,0.5)');
      text.setAttribute('paint-order', 'stroke');
    }
  });
};

/**
 * Clona y prepara el gráfico original para exportación
 * @param {HTMLElement} originalChartElement - Elemento del gráfico original
 * @param {HTMLElement} container - Contenedor de exportación
 * @param {Object} options - Opciones de configuración
 * @returns {HTMLElement} Elemento del gráfico clonado y optimizado
 */
const prepareChartForExport = (originalChartElement, container, options) => {
  // Crear contenedor para el gráfico
  const chartContainer = document.createElement('div');
  chartContainer.style.width = '100%';
  chartContainer.style.height = `${options.chartHeight || 500}px`;
  chartContainer.style.position = 'relative';
  chartContainer.style.margin = '10px 0';
  
  // Clonar el SVG original
  const originalSvg = originalChartElement.querySelector('svg');
  if (originalSvg) {
    const clonedSvg = originalSvg.cloneNode(true);
    
    // Optimizar el SVG para exportación
    optimizeSvgForExport(clonedSvg, container.offsetWidth, options.chartHeight || 500);
    
    // Agregar el SVG optimizado al contenedor
    chartContainer.appendChild(clonedSvg);
  } else {
    // Si no hay SVG, clonar todo el contenido del gráfico
    const chartContent = originalChartElement.querySelector('.h-\\[calc\\(100\\%-60px\\)\\], .h-\\[calc\\(100\\%-80px\\)\\]');
    if (chartContent) {
      chartContainer.innerHTML = chartContent.innerHTML;
    } else {
      // Último recurso: clonar todo
      chartContainer.innerHTML = originalChartElement.innerHTML;
    }
  }
  
  container.appendChild(chartContainer);
  return chartContainer;
};

/**
 * Extrae información del gráfico original para la exportación
 * @param {HTMLElement} chartElement - Elemento del gráfico original
 * @returns {Object} Información extraída del gráfico
 */
const extractChartInfo = (chartElement) => {
  const info = {
    title: '',
    subtitle: '',
    description: '',
    legendItems: []
  };
  
  // Extraer título si existe
  const titleElement = chartElement.querySelector('h3');
  if (titleElement) {
    info.title = titleElement.textContent.trim();
  }
  
  const subtitleElement = chartElement.querySelector('.chart-subtitle');
  if (subtitleElement) {
    info.subtitle = subtitleElement.textContent.trim();
  }
  
  const descriptionElement = chartElement.querySelector('.text-xs, .chart-description');
  if (descriptionElement) {
    info.description = descriptionElement.textContent.trim();
  }
  
  // Extraer elementos de leyenda de Chart.js si existen
  // Chart.js crea elementos li para la leyenda
  const legendElements = chartElement.querySelectorAll('canvas + div ul li');
  if (legendElements && legendElements.length) {
    legendElements.forEach(item => {
      const colorBoxElement = item.querySelector('span');
      const textContent = item.textContent.trim();
      
      if (colorBoxElement && textContent) {
        const color = window.getComputedStyle(colorBoxElement).backgroundColor || '#333';
        
        info.legendItems.push({
          color: color,
          text: textContent
        });
      }
    });
  }
  
  return info;
};

/**
 * Exporta un gráfico como imagen usando Canvas
 * @param {HTMLElement} container - Contenedor con el gráfico a exportar
 * @param {string} filename - Nombre del archivo a descargar
 * @param {Object} options - Opciones para html2canvas
 */
const exportUsingCanvas = async (container, filename, options = {}) => {
  try {
    console.log('Exportando usando canvas con contenedor de tamaño:', container.offsetWidth, 'x', container.scrollHeight);
    
    // Si se activa la opción skipCssColors, intentamos reemplazar los colores OKLCH con alternativas compatibles
    if (options.skipCssColors) {
      // Guardar una referencia a los estilos originales
      const elementsToRestore = [];
      
      try {
        // Buscar elementos con posibles colores problemáticos
        const allElements = container.querySelectorAll('*');
        allElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const originalStyles = {};
          let needsRestore = false;
          
          // Lista de formatos de color problemáticos
          const problematicColorFormats = ['oklch', 'oklab', 'lch', 'lab', 'hsl('];
          
          // Verificar propiedades de color comunes que podrían usar formatos de color problemáticos
          const colorProps = ['backgroundColor', 'color', 'borderColor', 'fill', 'stroke'];
          colorProps.forEach(prop => {
            const cssName = prop.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`); // camelCase a kebab-case
            const value = style[prop];
            
            if (value && typeof value === 'string') {
              const hasProblematicFormat = problematicColorFormats.some(format => 
                value.toLowerCase().includes(format)
              );
              
              if (hasProblematicFormat) {
                // Determinar si es un modo oscuro basado en análisis de colores
                // Un análisis simple es mirar si el color de fondo es oscuro
                const isDarkMode = options.darkMode || (
                  style.backgroundColor && 
                  style.backgroundColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/) && 
                  (parseInt(RegExp.$1) + parseInt(RegExp.$2) + parseInt(RegExp.$3)) / 3 < 128
                );
                
                // Guardar el estilo original para restaurarlo después
                originalStyles[cssName] = el.style[prop];
                needsRestore = true;
                
                // Aplicar colores de reemplazo según el tipo de propiedad y el modo
                if (prop === 'color') {
                  // Para texto
                  el.style[prop] = isDarkMode ? '#e2e8f0' : '#1e293b';
                } else if (prop === 'backgroundColor') {
                  // Para fondos
                  el.style[prop] = isDarkMode ? '#1e293b' : '#f8fafc';
                } else if (prop === 'fill') {
                  // Para rellenos SVG
                  el.style[prop] = isDarkMode ? '#4b5563' : '#334155';
                } else if (prop === 'stroke') {
                  // Para bordes SVG
                  el.style[prop] = isDarkMode ? '#6b7280' : '#64748b';
                } else {
                  // Para otros tipos de propiedades
                  el.style[prop] = isDarkMode ? '#4b5563' : '#cbd5e1';
                }
              }
            }
          });
          
          if (needsRestore) {
            elementsToRestore.push({ element: el, originalStyles });
          }
        });
      } catch (error) {
        console.warn('Error al procesar colores CSS:', error);
      }
      
      // Guardar una referencia a la función de restauración para usarla después
      const restoreOriginalStyles = () => {
        elementsToRestore.forEach(({ element, originalStyles }) => {
          Object.entries(originalStyles).forEach(([prop, value]) => {
            element.style[prop] = value;
          });
        });
      };
      
      // Configurar para restaurar los estilos después de la captura
      setTimeout(() => {
        restoreOriginalStyles();
      }, 5000); // Darle tiempo suficiente a html2canvas para capturar
    }
    
    // Opciones para html2canvas
    const canvasOptions = {
      scale: options.scale || 2, // Mayor escala para mejor calidad
      useCORS: true, // Permitir imágenes de otros dominios
      allowTaint: true, // Permitir que se contamine el canvas con imágenes externas
      backgroundColor: options.darkMode ? '#0f172a' : '#ffffff', // Color de fondo según modo
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
      logging: false, // Desactivar logs para mejorar rendimiento
      ...options.canvasOptions // Permitir opciones personalizadas adicionales
    };
    
    // Capturar el elemento como canvas
    const canvas = await html2canvas(container, canvasOptions);
    
    // Convertir canvas a URL de datos (blob para formato ajustable)
    canvas.toBlob((blob) => {
      // Crear URL para el blob
      const url = URL.createObjectURL(blob);
      
      // Crear enlace para descarga
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${filename}.png`;
      
      // Simular clic para descargar
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Liberar URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');
    
    return true;
  } catch (error) {
    console.error('Error al exportar usando Canvas:', error);
    return false;
  }
};

/**
 * Exporta un SVG como imagen PNG
 * @param {HTMLElement} container - Contenedor con el SVG
 * @param {string} filename - Nombre del archivo a descargar
 * @param {Object} options - Opciones para saveSvgAsPng
 * @returns {boolean} Éxito de la operación
 */
const exportUsingSvg = async (container, filename, options = {}) => {
  try {
    const svgElement = container.querySelector('svg');
    if (!svgElement) return false;
    
    // Optimizar SVG
    optimizeSvgForExport(svgElement, container.offsetWidth, container.offsetHeight);
    
    // Configuración para saveSvgAsPng
    const svgOptions = {
      scale: 2,
      backgroundColor: '#ffffff',
      encoderOptions: 1.0,
      ...options
    };
    
    // Exportar el SVG como PNG
    await saveSvgAsPng(svgElement, `${filename}.png`, svgOptions);
    return true;
  } catch (error) {
    console.error('Error al exportar usando SVG:', error);
    return false;
  }
};

/**
 * Crea un elemento HTML completo para exportar, incluyendo título, subtítulo y leyenda
 * @param {HTMLElement} originalElement - Elemento del gráfico original
 * @param {Object} options - Opciones de configuración
 * @returns {HTMLElement} Elemento completo listo para exportar
 */
const createCompleteChartElement = (originalElement, options) => {
  // Extraer información del gráfico original
  const chartInfo = extractChartInfo(originalElement);
  
  // Crear un nuevo contenedor para el gráfico completo
  const completeContainer = document.createElement('div');
  completeContainer.style.fontFamily = 'Arial, sans-serif';
  completeContainer.style.backgroundColor = options.darkMode ? '#0f172a' : '#ffffff';
  completeContainer.style.border = `1px solid ${options.darkMode ? '#1e293b' : '#eaeaea'}`;
  completeContainer.style.borderRadius = '8px';
  completeContainer.style.overflow = 'hidden';
  completeContainer.style.width = `${options.width || 800}px`;
  completeContainer.style.boxShadow = options.darkMode ? 
    '0 4px 12px rgba(0,0,0,0.25)' : 
    '0 2px 10px rgba(0,0,0,0.05)';
  completeContainer.style.color = options.darkMode ? '#e2e8f0' : '#1e293b';
  
  // 1. Agregar sección de título
  const titleSection = document.createElement('div');
  titleSection.style.padding = '15px 10px';
  titleSection.style.borderBottom = `1px solid ${options.darkMode ? '#1e293b' : '#eaeaea'}`;
  titleSection.style.textAlign = 'center';
  
  const title = document.createElement('h2');
  title.style.margin = '0 0 5px 0';
  title.style.fontSize = '22px';
  title.style.fontWeight = 'bold';
  title.style.color = options.darkMode ? '#f1f5f9' : '#333';
  title.textContent = options.title || chartInfo.title || '';
  
  titleSection.appendChild(title);
  
  if (options.subtitle || chartInfo.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.style.margin = '0 0 3px 0';
    subtitle.style.fontSize = '16px';
    subtitle.style.color = options.darkMode ? '#cbd5e1' : '#555';
    subtitle.textContent = options.subtitle || chartInfo.subtitle || '';
    titleSection.appendChild(subtitle);
  }
  
  if (options.description || chartInfo.description) {
    const description = document.createElement('p');
    description.style.margin = '3px 0 0 0';
    description.style.fontSize = '14px';
    description.style.color = options.darkMode ? '#94a3b8' : '#777';
    description.textContent = options.description || chartInfo.description || '';
    titleSection.appendChild(description);
  }
  
  completeContainer.appendChild(titleSection);
  
  // 2. Clonar y ajustar el contenido del gráfico original
  const chartContent = document.createElement('div');
  chartContent.style.padding = '15px';
  chartContent.style.textAlign = 'center';
  chartContent.style.backgroundColor = options.darkMode ? '#1e293b' : '#ffffff';
  
  // Clonar el elemento original
  const chartClone = originalElement.cloneNode(true);
  
  // Asegurarse que el gráfico clonado tenga las dimensiones correctas
  chartClone.style.width = '100%';
  chartClone.style.maxWidth = '100%';
  chartClone.style.height = 'auto';
  chartClone.style.minHeight = '300px';
  chartClone.style.margin = '0 auto';
  
  chartContent.appendChild(chartClone);
  completeContainer.appendChild(chartContent);
  
  // 3. Agregar leyenda si está disponible
  if (chartInfo.legendItems && chartInfo.legendItems.length > 0) {
    const legendSection = document.createElement('div');
    legendSection.style.padding = '10px 15px 15px';
    legendSection.style.borderTop = `1px solid ${options.darkMode ? '#1e293b' : '#eaeaea'}`;
    legendSection.style.display = 'flex';
    legendSection.style.flexWrap = 'wrap';
    legendSection.style.justifyContent = 'center';
    legendSection.style.gap = '10px';
    
    chartInfo.legendItems.forEach(item => {
      const legendItem = document.createElement('div');
      legendItem.style.display = 'flex';
      legendItem.style.alignItems = 'center';
      legendItem.style.marginRight = '15px';
      
      const colorBox = document.createElement('span');
      colorBox.style.display = 'inline-block';
      colorBox.style.width = '12px';
      colorBox.style.height = '12px';
      colorBox.style.backgroundColor = item.color;
      colorBox.style.marginRight = '5px';
      colorBox.style.borderRadius = '2px';
      
      const label = document.createElement('span');
      label.style.fontSize = '13px';
      label.style.color = options.darkMode ? '#cbd5e1' : '#666';
      label.textContent = item.text;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);
      legendSection.appendChild(legendItem);
    });
    
    completeContainer.appendChild(legendSection);
  }
  
  // 4. Agregar pie de página si está disponible
  if (options.footnote) {
    const footnoteSection = document.createElement('div');
    footnoteSection.style.padding = '8px 15px';
    footnoteSection.style.borderTop = `1px solid ${options.darkMode ? '#1e293b' : '#eaeaea'}`;
    footnoteSection.style.fontSize = '12px';
    footnoteSection.style.color = options.darkMode ? '#94a3b8' : '#777';
    footnoteSection.style.textAlign = 'left';
    footnoteSection.textContent = options.footnote;
    
    completeContainer.appendChild(footnoteSection);
  }
  
  return completeContainer;
};

/**
 * Función unificada que maneja la exportación de todos los tipos de gráficos
 * @param {HTMLElement} originalChartElement - Elemento del gráfico original
 * @param {string} filename - Nombre del archivo a descargar
 * @param {Object} userOptions - Opciones proporcionadas por el usuario
 * @returns {Promise<boolean>} Éxito de la operación
 */
export const exportAsImage = async (originalChartElement, filename, userOptions = {}) => {
  if (!originalChartElement) {
    console.error('No se proporcionó un elemento para exportar');
    return false;
  }
  
  try {
    // 1. Obtener configuraciones según el dispositivo
    const deviceSettings = getDeviceSpecificSettings();
    
    // 2. Combinar opciones de usuario con configuraciones por defecto
    const options = { 
      ...deviceSettings,
      ...userOptions,
      chartType: userOptions.chartType || 'default',
      skipCssColors: userOptions.skipCssColors || false, // Opción para manejar colores problemáticos como OKLCH
      darkMode: userOptions.darkMode || false // Asegurar que darkMode siempre esté definido
    };
    
    // 3. Extraer información del gráfico original
    const chartInfo = extractChartInfo(originalChartElement);
    options.title = options.title || chartInfo.title || '';
    options.subtitle = options.subtitle || chartInfo.subtitle || '';
    options.description = options.description || chartInfo.description || '';
    options.legendItems = options.legendItems || chartInfo.legendItems || [];
    
    console.log('Información extraída del gráfico:', {
      title: options.title,
      subtitle: options.subtitle,
      description: options.description,
      legendItems: options.legendItems.map(item => item.text ? `${item.text}: ${item.color}` : 'sin texto').join(', '),
      footnote: options.footnote || ''
    });
    
    // 4. Crear un elemento visual completo con HTML
    const completeChartElement = createCompleteChartElement(originalChartElement, options);
    
    // 5. Agregar temporalmente al body para poder capturarlo
    completeChartElement.style.position = 'fixed';
    completeChartElement.style.top = '0';
    completeChartElement.style.left = '-9999px';
    completeChartElement.style.zIndex = '-9999';
    document.body.appendChild(completeChartElement);
    
    // 6. Dar tiempo al navegador para renderizar correctamente
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // 7. Exportar usando Canvas
      const success = await exportUsingCanvas(completeChartElement, filename, options);
      
      return success;
    } finally {
      // 8. Limpiar: eliminar el elemento temporal
      document.body.removeChild(completeChartElement);
    }
  } catch (error) {
    console.error('Error al exportar como imagen:', error);
    return false;
  }
}; 