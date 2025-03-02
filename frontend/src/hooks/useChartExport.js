import { useState, useRef, useEffect } from 'react';
import { exportChartAsImage, getFormattedDate } from '../utils/chartExport';
import { getActiveFileInfo } from '../api/cisApi';

/**
 * Hook para manejar la exportación de gráficos como imágenes
 * 
 * @returns {Object} Funciones y estado relacionados con la exportación de gráficos
 */
const useChartExport = () => {
  const [exporting, setExporting] = useState(false);
  const chartInstanceRef = useRef(null);
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
   * Exporta el gráfico actual como imagen usando Chart.js
   * 
   * @param {Object} options - Opciones para la exportación
   * @param {Chart} options.chartInstance - Instancia de Chart.js a exportar
   * @param {string} options.filename - Nombre base del archivo sin extensión
   * @param {string} options.title - Título para el gráfico exportado
   * @param {string} options.subtitle - Subtítulo para el gráfico exportado
   * @param {string} options.footnote - Nota al pie para el gráfico exportado
   * @param {Array} options.legendItems - Elementos de la leyenda con color y texto
   * @param {boolean} options.darkMode - Si debe usarse modo oscuro en la exportación
   * @param {string} options.format - Formato de exportación (png, jpeg, webp)
   * @returns {Promise<boolean>} - True si la exportación fue exitosa
   */
  const exportChart = async (options = {}) => {
    try {
      // Set exporting state
      setExporting(true);
      
      // Get chart instance, either from options or ref
      const chartInstance = options.chartInstance || chartInstanceRef.current;
      
      if (!chartInstance) {
        console.error("No chart instance found for export");
        return false;
      }
      
      // Prepare filename
      const filename = options.filename || `chart_${getFormattedDate()}`;
      
      // Execute the export
      const success = await exportChartAsImage(chartInstance, filename, {
        // Default options
        format: options.format || 'png',
        quality: options.quality || 0.95,
        
        // Metadata options
        title: options.title || '',
        subtitle: options.subtitle || '',
        footnote: options.footnote || '',
        legendItems: options.legendItems || [],
        
        // Style options
        darkMode: options.darkMode || false
      });
      
      return success;
    } catch (error) {
      console.error("Error exporting chart:", error);
      return false;
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
    // Base URL for the chart pages - updated to match router paths in App.jsx
    let baseUrl = '';
    
    // Determine if it's a univariate or bivariate chart
    if (options.variable1 && options.variable2) {
      // Bivariate chart - use the correct path that matches router definition
      baseUrl = `/chart/bivariate/${options.variable1}/${options.variable2}`;
    } else if (options.variable1) {
      // Univariate chart - use the correct path that matches router definition
      baseUrl = `/chart/univariate/${options.variable1}`;
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
    setExporting,
    chartInstanceRef,
    exportChart,
    openInNewTab,
    activeFile
  };
};

export default useChartExport; 