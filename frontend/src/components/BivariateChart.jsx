import { useEffect, useState, useRef } from "react";
import useBivariateData from "../hooks/useBivariateData";
import useChartExport from "../hooks/useChartExport";
import Chart from 'chart.js/auto';
import ChartControls from "./charts/ChartControls";
import { getFormattedDate } from "../utils/chartExport";

/**
 * Componente principal para visualizar datos bivariados usando gráficos de barras apiladas
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.variable1 - Primera variable para el análisis bivariado
 * @param {string} props.variable2 - Segunda variable para el análisis bivariado
 * @param {string[]} props.excludedValues1 - Valores a excluir de la primera variable
 * @param {string[]} props.excludedValues2 - Valores a excluir de la segunda variable
 * @param {boolean} props.darkMode - Si se debe usar el modo oscuro
 * @param {string} props.viewMode - Modo de visualización inicial (absolute, relative)
 * @param {boolean} props.isFullscreenPage - Si se está mostrando en pantalla completa
 */
export default function BivariateChart({ 
  variable1, 
  variable2, 
  excludedValues1 = [], 
  excludedValues2 = [],
  darkMode = false,
  viewMode = 'absolute',
  isFullscreenPage = false
}) {
  // Estado local para el modo de visualización
  const [localViewMode, setLocalViewMode] = useState(viewMode);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [chartInstance, setChartInstance] = useState(null);
  const chartRef = useRef(null);
  const localChartContainer = useRef(null);
  // State variables for chart display
  const [aspectRatio, setAspectRatio] = useState(windowWidth < 640 ? 1.2 : 1.6);
  const [showLegend, setShowLegend] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Add download format state
  const [downloadFormat, setDownloadFormat] = useState('png');

  // Hooks personalizados
  const {
    loading,
    colorScheme,
    variable1Title,
    variable2Title,
    prepareStackedBarData,
    totalExcluded,
    hasData
  } = useBivariateData(variable1, variable2, excludedValues1, excludedValues2, darkMode);

  const {
    exporting,
    setExporting,
    chartInstanceRef,
    exportChart,
    openInNewTab
  } = useChartExport();

  // Actualizar el modo de visualización cuando cambia la prop
  useEffect(() => {
    setLocalViewMode(viewMode);
  }, [viewMode]);

  // Efecto para manejar el cambio de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Create or update chart when data or settings change
  useEffect(() => {
    if (hasData && chartRef.current) {
      createChartJS();
    }
    
    // Cleanup chart instance on unmount
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [
    hasData, 
    localViewMode, 
    darkMode, 
    windowWidth, 
    variable1, 
    variable2, 
    excludedValues1, 
    excludedValues2,
    aspectRatio,
    zoom,
    showLegend
  ]);

  // Adjust chart options based on zoom
  useEffect(() => {
    if (chartInstance && zoom !== 100) {
      // Use the current aspectRatio state instead of recalculating
      chartInstance.options.aspectRatio = aspectRatio * (100 / zoom);
      chartInstance.update();
    }
  }, [zoom, chartInstance, aspectRatio]);
  
  // Add zoom controls
  const increaseZoom = () => {
    setZoom(prevZoom => Math.min(prevZoom + 20, 200));
  };
  
  const decreaseZoom = () => {
    setZoom(prevZoom => Math.max(prevZoom - 20, 40));
  };
  
  const resetZoom = () => {
    setZoom(100);
  };
  
  // Add aspect ratio toggle function
  const toggleAspectRatio = () => {
    // Toggle between wide and square aspect ratio
    const newRatio = aspectRatio === (windowWidth < 640 ? 1.2 : 1.6) ? 1 : (windowWidth < 640 ? 1.2 : 1.6);
    setAspectRatio(newRatio);
    
    // Update chart if it exists
    if (chartInstance) {
      chartInstance.options.aspectRatio = newRatio * (100 / zoom);
      chartInstance.update();
    }
  };
  
  // Add legend toggle function
  const toggleLegend = () => {
    setShowLegend(!showLegend);
    
    // Update chart if it exists
    if (chartInstance) {
      chartInstance.options.plugins.legend.display = !showLegend;
      chartInstance.update();
    }
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!localChartContainer.current) return;
    
    if (!isFullscreen) {
      if (localChartContainer.current.requestFullscreen) {
        localChartContainer.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = document.fullscreenElement === localChartContainer.current;
      setIsFullscreen(isFS);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Preparar los datos según el tipo de gráfico
  const getChartData = () => {
    // Solo devolver datos para el gráfico de barras apiladas
    return prepareStackedBarData(localViewMode);
  };

  // Obtener las columnas para el gráfico de barras
  const getChartColumns = () => {
    if (!hasData) return [];
    
    // Extraer nombres de columnas del primer elemento de datos
    const data = prepareStackedBarData(localViewMode);
    if (data.length === 0) return [];
    
    return Object.keys(data[0])
      .filter(key => !key.includes('_') && key !== 'name');
  };

  // Create and manage Chart.js charts
  const createChartJS = () => {
    if (!hasData || !chartRef.current) return;
    
    // Destroy existing chart instance if it exists
    if (chartInstance) {
      chartInstance.destroy();
    }
    
    // Get chart data based on chart type
    const chartData = getChartData();
    if (!chartData || chartData.length === 0) return;
    
    // Configure Chart.js global defaults based on dark mode
    Chart.defaults.color = darkMode ? '#e5e7eb' : '#374151';
    Chart.defaults.borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // Create stacked bar chart configuration
    const chartConfig = createStackedBarConfig(chartData);
    
    // Create new chart instance
    const ctx = chartRef.current.getContext('2d');
    const newChartInstance = new Chart(ctx, chartConfig);
    setChartInstance(newChartInstance);
    
    return newChartInstance;
  };

  // Configuration for stacked bar chart
  const createStackedBarConfig = (stackedData) => {
    const columns = getChartColumns();
    
    // Prepare datasets for stacked bar
    const datasets = columns.map((columnName, index) => {
      // Get color from color scheme
      const colorKeys = Object.keys(colorScheme);
      
      // Determine color for this dataset
      let color;
      if (colorKeys.length > 0) {
        const colorKey = colorKeys[Math.min(index, colorKeys.length - 1)];
        const variations = colorScheme[colorKey]?.variations || [];
        
        if (variations.length > 0) {
          color = variations[index % variations.length];
        } else {
          const hue = (index * 30) % 360;
          color = `hsl(${hue}, 70%, ${darkMode ? 55 : 45}%)`;
        }
      } else {
        // Fallback color generation
        const hue = (index * 30) % 360;
        color = `hsl(${hue}, 70%, ${darkMode ? 55 : 45}%)`;
      }
      
      return {
        label: columnName,
        data: stackedData.map(item => item[columnName]),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        stack: 'Stack 0',
        // Store original data for tooltip
        originalData: stackedData.map(item => ({
          freq: item[`${columnName}_freq`] || 0,
          rowPercent: item[`${columnName}_row`] || 0,
          colPercent: item[`${columnName}_col`] || 0
        }))
      };
    });
    
    // Calculate appropriate base aspect ratio based on screen width
    const baseAspectRatio = windowWidth < 640 ? 1.2 : 1.6;
    
    return {
      type: 'bar',
      data: {
        labels: stackedData.map(item => item.name),
        datasets: datasets
      },
      options: {
        responsive: true,
        aspectRatio: aspectRatio * (100 / zoom), // Use aspectRatio state instead of hardcoded value
        maintainAspectRatio: !isFullscreenPage, // Don't maintain aspect ratio in fullscreen mode
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.raw;
                const originalData = context.dataset.originalData[context.dataIndex];
                
                // Format display based on view mode
                let displayValue;
                if (localViewMode === 'relative') {
                  displayValue = `${originalData.rowPercent.toFixed(2)}%`;
                } else {
                  displayValue = originalData.freq;
                }
                
                return `${label}: ${displayValue}`;
              }
            },
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: darkMode ? '#e5e7eb' : '#111827',
            bodyColor: darkMode ? '#e5e7eb' : '#374151',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: true
          },
          legend: {
            position: 'bottom',
            display: showLegend,
            labels: {
              boxWidth: 15,
              padding: windowWidth < 640 ? 8 : 15,
              font: {
                size: windowWidth < 640 ? 10 : 12
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0,
              font: {
                size: windowWidth < 640 ? 10 : 12
              }
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            title: {
              display: true,
              text: localViewMode === 'relative' ? 'Porcentaje (%)' : 'Frecuencia',
              color: darkMode ? '#e5e7eb' : '#374151',
              font: {
                size: windowWidth < 640 ? 11 : 12
              }
            },
            ticks: {
              font: {
                size: windowWidth < 640 ? 10 : 12
              }
            }
          }
        }
      }
    };
  };

  // Link the chart instance ref with our hook's ref
  useEffect(() => {
    if (chartInstance) {
      chartInstanceRef.current = chartInstance;
    }
  }, [chartInstance, chartInstanceRef]);

  // Handle chart export with proper chart rendering preparation
  const handleChartExport = async (format = 'png') => {
    if (!chartInstance) {
      console.error("No chart instance available for export");
      return;
    }
    
    try {
      // Create a filename with the variables and date
      const date = getFormattedDate();
      const filename = `${variable1}_${variable2}_chart_${date}`;
      
      // Enhanced export options
      const exportOptions = {
        chartInstance: chartInstance,
        filename: filename,
        format: format,
        title: `${variable1Title} × ${variable2Title}`,
        subtitle: `Modo: ${localViewMode === 'absolute' ? 'Absoluto' : 'Relativo'}`,
        footnote: `Generado el ${date}`,
        darkMode: darkMode,
        // Include legend items
        legendItems: chartInstance.data.datasets.map(dataset => ({
          text: dataset.label,
          color: dataset.backgroundColor
        }))
      };
      
      // Call the export function with the enhanced options
      await exportChart(exportOptions);
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };

  // Handler para exportar el gráfico
  const onExportChart = () => {
    // Use the enhanced handleChartExport function with the selected format
    handleChartExport(downloadFormat);
  };

  // Handler para abrir en nueva pestaña
  const onOpenInNewTab = () => {
    openInNewTab({
      variable1,
      variable2,
      chartType: 'stacked',
      viewMode: localViewMode,
      darkMode,
      excludedValues1,
      excludedValues2,
      zoom: zoom,
      aspectRatio: aspectRatio,
      showLegend: showLegend
    });
  };

  // Renderizado del componente en estado de carga
  if (loading) {
    return (
      <div className={`p-4 border rounded-lg shadow ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} transition-colors duration-200`}>
        <h3 className="text-lg font-semibold mb-4">
          Cargando datos...
        </h3>
        <div className="animate-pulse space-y-4">
          <div className={`h-64 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  // No renderizar si no hay datos
  if (!hasData) return null;

  return (
    <div className={`${darkMode ? 'text-white' : 'text-gray-800'}`}>
      <div className={`relative ${isFullscreenPage ? 'h-full' : ''}`}>
        {/* Only show title and controls in this layout when NOT in fullscreen page */}
        {!isFullscreenPage && (
          <div className="flex flex-wrap items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              {variable1Title && variable2Title ? (
                <>Análisis bivariado (barras apiladas): {variable1Title} × {variable2Title}</>
              ) : (
                <>Análisis bivariado (barras apiladas)</>
              )}
            </h3>
            
            <ChartControls 
              viewMode={localViewMode}
              setViewMode={setLocalViewMode}
              exporting={exporting}
              handleExportChart={onExportChart}
              openInNewTab={onOpenInNewTab}
              isFullscreenPage={isFullscreenPage}
              darkMode={darkMode}
              zoom={zoom}
              increaseZoom={increaseZoom}
              decreaseZoom={decreaseZoom}
              resetZoom={resetZoom}
              showLegend={showLegend}
              toggleLegend={toggleLegend}
              toggleAspectRatio={toggleAspectRatio}
              toggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
            />
          </div>
        )}
      
        {totalExcluded > 0 && !isFullscreenPage && (
          <div className={`text-xs mb-2 px-2 py-1 rounded-md inline-block ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {totalExcluded} {totalExcluded === 1 ? 'valor excluido' : 'valores excluidos'}
          </div>
        )}
        
        <div 
          ref={localChartContainer}
          className={`relative overflow-hidden rounded-lg ${
            isFullscreen 
              ? 'bg-black w-screen h-screen flex items-center justify-center' 
              : `${darkMode ? 'bg-gray-800/30' : 'bg-gray-50/50'} p-2 sm:p-4 ${isFullscreenPage ? 'h-full' : 'h-[350px] sm:h-[500px]'}`
          }`}
          style={{ 
            minHeight: isFullscreenPage ? '100%' : undefined
          }}
        >
          {/* Add absolute positioned controls similar to ChartComponent when in fullscreen page */}
          {isFullscreenPage && (
            <div className={`absolute top-0 right-0 z-10 flex items-center space-x-1 p-1 ${isFullscreen ? 'bg-black/20 rounded-bl-lg backdrop-blur-sm' : ''}`}>
              <div className="transition-opacity duration-200">
                <select
                  className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                </select>
              </div>
              
              <ChartControls 
                viewMode={localViewMode}
                setViewMode={setLocalViewMode}
                exporting={exporting}
                handleExportChart={onExportChart}
                openInNewTab={onOpenInNewTab}
                isFullscreenPage={isFullscreenPage}
                darkMode={darkMode}
                zoom={zoom}
                increaseZoom={increaseZoom}
                decreaseZoom={decreaseZoom}
                resetZoom={resetZoom}
                showLegend={showLegend}
                toggleLegend={toggleLegend}
                toggleAspectRatio={toggleAspectRatio}
                toggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
              />
            </div>
          )}
          
          <canvas 
            ref={chartRef}
            className="w-full h-full"
            style={{ 
              maxHeight: isFullscreen ? '95vh' : isFullscreenPage ? '100%' : undefined,
              maxWidth: isFullscreen ? '95vw' : '100%'
            }}
          />
        </div>
      </div>
    </div>
  );
} 