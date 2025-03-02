import { useState, useRef, useEffect } from 'react';
import { exportAsImage, getFormattedDate } from '../utils/chartExport';
import { getActiveFileInfo } from '../api/cisApi';

/**
 * Hook para manejar la exportación de gráficos como imágenes
 * 
 * @returns {Object} Funciones y estado relacionados con la exportación de gráficos
 */
const useChartExport = () => {
  const [exporting, setExporting] = useState(false);
  const chartContainerRef = useRef(null);
  const [activeFile, setActiveFile] = useState(null);
  
  // Fetch active file information on mount
  useEffect(() => {
    async function fetchActiveFile() {
      try {
        const fileInfo = await getActiveFileInfo();
        if (!fileInfo.error) {
          setActiveFile(fileInfo);
        }
      } catch (error) {
        console.error("Error fetching active file info:", error);
      }
    }
    
    fetchActiveFile();
  }, []);

  /**
   * Exporta el gráfico actual como imagen
   * 
   * @param {Object} chartInfo - Información sobre el gráfico para la exportación
   * @param {string} chartInfo.variable1Title - Título de la primera variable
   * @param {string} chartInfo.variable2Title - Título de la segunda variable
   * @param {string} chartInfo.chartType - Tipo de gráfico (stacked)
   * @param {string} chartInfo.viewMode - Modo de visualización (absolute, relative)
   * @param {boolean} chartInfo.darkMode - Si se está usando el modo oscuro
   * @param {number} chartInfo.excludedValues1 - Cantidad de valores excluidos de la primera variable
   * @param {number} chartInfo.excludedValues2 - Cantidad de valores excluidos de la segunda variable
   */
  const handleExportChart = async ({ 
    variable1Title = '', 
    variable2Title = '', 
    chartType = 'stacked', 
    viewMode = 'absolute', 
    darkMode = false, 
    excludedValues1 = 0,
    excludedValues2 = 0
  }) => {
    if (!chartContainerRef.current) return;
    
    setExporting(true);
    try {
      // Preparar opciones para la exportación
      const options = {
        title: `Análisis bivariado de ${variable1Title} y ${variable2Title}`,
        subtitle: `Tipo de gráfico: Barras apiladas`,
        description: `Modo de visualización: ${viewMode === 'absolute' ? 'Valores absolutos' : 'Porcentajes'}`,
        darkMode: darkMode,
        chartType: chartType,
        width: chartContainerRef.current.offsetWidth * 1.5,
        height: chartContainerRef.current.offsetHeight * 1.5,
        footnote: excludedValues1 || excludedValues2 ? 
          `Valores excluidos: ${excludedValues1} en variable 1, ${excludedValues2} en variable 2` : 
          undefined,
        // Mejoras para garantizar una exportación perfecta
        scale: 2, // Aumentar escala para mejor calidad
        canvasOptions: {
          logging: false, // Reducir ruido en consola
          allowTaint: true, // Permitir contenido externo
          useCORS: true, // Importante para imágenes externas
          backgroundColor: darkMode ? '#0f172a' : '#ffffff',
          windowWidth: window.innerWidth, // Asegurar que se capture todo el ancho
          windowHeight: window.innerHeight // Asegurar altura correcta
        },
        skipCssColors: true // Manejar colores modernos como OKLCH que causan problemas
      };
      
      // Nombre del archivo
      const filename = `grafico_bivariado_${variable1Title.replace(/\s+/g, '_')}_${variable2Title.replace(/\s+/g, '_')}_barras_${getFormattedDate()}`;
      
      // Esperar a que el componente esté completamente renderizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Usar la función avanzada de exportación
      const success = await exportAsImage(chartContainerRef.current, filename, options);
      
      if (!success) {
        throw new Error("No se pudo exportar el gráfico");
      }
    } catch (error) {
      console.error("Error al exportar el gráfico:", error);
      alert('Error al exportar el gráfico. Por favor, inténtelo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  /**
   * Abre el gráfico en una nueva pestaña
   * 
   * @param {Object} chartInfo - Información sobre el gráfico para abrir en nueva pestaña
   * @param {string} chartInfo.variable1 - Nombre de la primera variable
   * @param {string} chartInfo.variable2 - Nombre de la segunda variable
   * @param {string} chartInfo.chartType - Tipo de gráfico (stacked)
   * @param {string} chartInfo.viewMode - Modo de visualización (absolute, relative)
   * @param {boolean} chartInfo.darkMode - Si se está usando el modo oscuro
   * @param {string[]} chartInfo.excludedValues1 - Valores excluidos de la primera variable
   * @param {string[]} chartInfo.excludedValues2 - Valores excluidos de la segunda variable
   * @param {string} chartInfo.file - Nombre del archivo específico para usar (opcional)
   * @param {boolean} chartInfo.isLocalFile - Si el archivo es local (opcional)
   */
  const openInNewTab = (options) => {
    // Base URL for the fullscreen page
    let baseUrl = '/fullscreen';
    
    // Determine if it's a univariate or bivariate chart
    if (options.variable1 && options.variable2) {
      // Bivariate chart
      baseUrl += `/bivariate/${options.variable1}/${options.variable2}`;
    } else if (options.variable1) {
      // Univariate chart
      baseUrl += `/chart/${options.variable1}`;
    } else {
      console.error("No variables provided for opening in new tab");
      return;
    }
    
    // Prepare URL params
    const params = new URLSearchParams();
    
    // Add chart type
    if (options.chartType) {
      params.append('chartType', options.chartType);
    }
    
    // Add sort order for univariate charts
    if (options.sortOrder) {
      params.append('sortOrder', options.sortOrder);
    }
    
    // Add view mode for bivariate charts
    if (options.viewMode) {
      params.append('viewMode', options.viewMode);
    }
    
    // Add excluded values
    if (options.excludedValues1 && options.excludedValues1.length > 0) {
      params.append('excludedValues1', options.excludedValues1.join(','));
    }
    
    if (options.excludedValues2 && options.excludedValues2.length > 0) {
      params.append('excludedValues2', options.excludedValues2.join(','));
    }
    
    // Add dark mode
    if (options.darkMode) {
      params.append('darkMode', options.darkMode);
    }
    
    // Add zoom level
    if (options.zoom) {
      params.append('zoom', options.zoom);
    }
    
    // Add aspect ratio
    if (options.aspectRatio) {
      params.append('aspectRatio', options.aspectRatio);
    }
    
    // Add show legend
    if (options.showLegend !== undefined) {
      params.append('showLegend', options.showLegend);
    }
    
    // Include file information in the URL
    if (activeFile) {
      params.append('file', activeFile.filename);
      params.append('fileType', activeFile.isLocal ? 'local' : 'shared');
    }
    
    // Open new tab with constructed URL
    window.open(`${baseUrl}?${params.toString()}`, '_blank');
  };

  return {
    exporting,
    chartContainerRef,
    handleExportChart,
    openInNewTab,
    activeFile
  };
};

export default useChartExport; 