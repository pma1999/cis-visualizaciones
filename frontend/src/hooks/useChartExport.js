import { useState, useRef } from 'react';
import { exportAsImage, getFormattedDate } from '../utils/chartExport';

/**
 * Hook para manejar la exportación de gráficos como imágenes
 * 
 * @returns {Object} Funciones y estado relacionados con la exportación de gráficos
 */
const useChartExport = () => {
  const [exporting, setExporting] = useState(false);
  const chartContainerRef = useRef(null);

  /**
   * Exporta el gráfico actual como imagen
   * 
   * @param {Object} chartInfo - Información sobre el gráfico para la exportación
   * @param {string} chartInfo.variable1Title - Título de la primera variable
   * @param {string} chartInfo.variable2Title - Título de la segunda variable
   * @param {string} chartInfo.chartType - Tipo de gráfico (treemap, stacked)
   * @param {string} chartInfo.viewMode - Modo de visualización (absolute, relative)
   * @param {boolean} chartInfo.darkMode - Si se está usando el modo oscuro
   * @param {number} chartInfo.excludedValues1 - Cantidad de valores excluidos de la primera variable
   * @param {number} chartInfo.excludedValues2 - Cantidad de valores excluidos de la segunda variable
   */
  const handleExportChart = async ({ 
    variable1Title = '', 
    variable2Title = '', 
    chartType = 'treemap', 
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
        subtitle: `Tipo de gráfico: ${chartType === 'treemap' ? 'Mapa de árbol' : 'Barras apiladas'}`,
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
      const filename = `grafico_bivariado_${variable1Title.replace(/\s+/g, '_')}_${variable2Title.replace(/\s+/g, '_')}_${chartType}_${getFormattedDate()}`;
      
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
   * @param {string} chartInfo.chartType - Tipo de gráfico (treemap, stacked)
   * @param {string} chartInfo.viewMode - Modo de visualización (absolute, relative)
   * @param {boolean} chartInfo.darkMode - Si se está usando el modo oscuro
   * @param {string[]} chartInfo.excludedValues1 - Valores excluidos de la primera variable
   * @param {string[]} chartInfo.excludedValues2 - Valores excluidos de la segunda variable
   */
  const openInNewTab = ({ 
    variable1, 
    variable2, 
    chartType = 'treemap', 
    viewMode = 'absolute', 
    darkMode = false, 
    excludedValues1 = [], 
    excludedValues2 = [] 
  }) => {
    const baseUrl = window.location.origin;
    const excludedValues1Param = excludedValues1.length > 0 ? `&excludedValues1=${excludedValues1.join(',')}` : '';
    const excludedValues2Param = excludedValues2.length > 0 ? `&excludedValues2=${excludedValues2.join(',')}` : '';
    
    const url = `${baseUrl}/chart/bivariate/${variable1}/${variable2}?chartType=${chartType}${excludedValues1Param}${excludedValues2Param}&darkMode=${darkMode}&viewMode=${viewMode}`;
    
    window.open(url, '_blank');
  };

  return {
    exporting,
    chartContainerRef,
    handleExportChart,
    openInNewTab
  };
};

export default useChartExport; 