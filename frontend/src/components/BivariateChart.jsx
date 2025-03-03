import { useEffect, useState, useRef, useLayoutEffect } from "react";
import useBivariateData from "../hooks/useBivariateData";
import useChartExport from "../hooks/useChartExport";
import Chart from 'chart.js/auto';
import ChartControls from "./charts/ChartControls";
import { getFormattedDate } from "../utils/chartExport";
import useAvailableSpace from "../hooks/useAvailableSpace";

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
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [chartInstance, setChartInstance] = useState(null);
  const chartRef = useRef(null);
  const localChartContainer = useRef(null);
  const chartWrapperRef = useRef(null);
  const toolbarRef = useRef(null);
  const containerRef = useRef(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  // State variables for chart display
  const [aspectRatio, setAspectRatio] = useState(windowWidth < 640 ? 1.2 : 1.6);
  const [showLegend, setShowLegend] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Add download format state
  const [downloadFormat, setDownloadFormat] = useState('png');
  // Track chart height
  const [chartHeight, setChartHeight] = useState(windowWidth < 640 ? 350 : 500);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef(null);
  // Track whether portrait or landscape
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true
  );

  // Use custom hook for available space calculation
  const { availableHeight, calculateHeight } = useAvailableSpace({
    containerRef,
    headerRef,
    toolbarRef, 
    isFullscreenPage,
    isFullscreen,
    defaultHeight: windowWidth < 640 ? 350 : 500,
    additionalOffset: 30, // Extra safety margin
    minHeight: 250
  });

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

  // Update chart height when available height changes
  useEffect(() => {
    if (availableHeight > 0) {
      setChartHeight(availableHeight);
      
      // Also update chart if it exists
      if (chartInstance) {
        chartInstance.resize();
      }
    }
  }, [availableHeight, chartInstance]);

  // Efecto para manejar el cambio de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowWidth(width);
      setWindowHeight(height);
      setIsPortrait(height > width);
      
      // Trigger height calculation
      calculateHeight();
      
      // Update toolbar measurement on resize as well
      if (toolbarRef.current) {
        const toolbarHeight = toolbarRef.current.getBoundingClientRect().height;
        setToolbarHeight(toolbarHeight);
      }
      
      // Measure header height if not in fullscreen
      if (headerRef.current && !isFullscreenPage && !isFullscreen) {
        const headerHeight = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight(headerHeight);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', () => {
        // Small delay to ensure browser has updated layout after orientation change
        setTimeout(handleResize, 150);
      });
      handleResize();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      }
    };
  }, [isFullscreenPage, isFullscreen, calculateHeight]);

  // Observe toolbar height changes using ResizeObserver
  useEffect(() => {
    if (!toolbarRef.current) return;
    
    const updateToolbarHeight = () => {
      if (toolbarRef.current) {
        const height = toolbarRef.current.getBoundingClientRect().height;
        setToolbarHeight(height);
        // Recalculate available height after toolbar height changes
        calculateHeight();
      }
    };
    
    // Call immediately for initial measurement
    updateToolbarHeight();
    
    // Also update on orientation change which might affect layout
    const handleOrientationChange = () => {
      // Slight delay to ensure the browser has updated layout after orientation change
      setTimeout(updateToolbarHeight, 150);
    };
    
    // Set up ResizeObserver to track changes
    let resizeObserver;
    try {
      resizeObserver = new ResizeObserver(() => {
        updateToolbarHeight();
      });
      
      resizeObserver.observe(toolbarRef.current);
      window.addEventListener('orientationchange', handleOrientationChange);
    } catch (error) {
      console.warn('ResizeObserver not supported in this browser, falling back to static measurements');
      // Fallback for browsers without ResizeObserver
      updateToolbarHeight();
      window.addEventListener('orientationchange', handleOrientationChange);
    }
    
    return () => {
      if (resizeObserver && toolbarRef.current) {
        try {
          resizeObserver.unobserve(toolbarRef.current);
          resizeObserver.disconnect();
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [calculateHeight]);

  // Measure header height
  useEffect(() => {
    if (headerRef.current && !isFullscreenPage && !isFullscreen) {
      const measureHeader = () => {
        const height = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight(height);
        calculateHeight();
      };
      
      measureHeader();
      
      // Set up ResizeObserver for header as well
      let headerObserver;
      try {
        headerObserver = new ResizeObserver(measureHeader);
        headerObserver.observe(headerRef.current);
      } catch (error) {
        // Fallback for browsers without ResizeObserver
      }
      
      return () => {
        if (headerObserver && headerRef.current) {
          try {
            headerObserver.unobserve(headerRef.current);
            headerObserver.disconnect();
          } catch (error) {
            // Ignore errors on cleanup
          }
        }
      };
    }
  }, [isFullscreenPage, isFullscreen, calculateHeight]);

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
    showLegend,
    chartHeight
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
      
      // Recalculate height after fullscreen change
      setTimeout(calculateHeight, 100);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [calculateHeight]);

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
    
    // Add small delay to ensure the layout is stable before rendering the chart
    setTimeout(() => {
      // Create new chart instance
      const ctx = chartRef.current.getContext('2d');
      const newChartInstance = new Chart(ctx, chartConfig);
      setChartInstance(newChartInstance);
    }, 0);
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
    
    // Calculate appropriate base aspect ratio based on screen width and orientation
    let baseAspectRatio = windowWidth < 640 ? 1.2 : 1.6;
    // On mobile in portrait mode, reduce aspect ratio for better vertical space usage
    if (windowWidth < 640 && isPortrait) {
      baseAspectRatio = 0.8;
    }
    
    return {
      type: 'bar',
      data: {
        labels: stackedData.map(item => item.name),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: isFullscreenPage ? false : (isFullscreen ? false : true),
        aspectRatio: baseAspectRatio * (100 / zoom),
        layout: {
          padding: {
            top: 5,
            right: 5,
            bottom: 5,
            left: 5
          }
        },
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
    <div 
      ref={containerRef}
      className={`${darkMode ? 'text-white' : 'text-gray-800'}`}
    >
      <div 
        ref={headerRef}
        className={`${isFullscreenPage ? 'h-full' : ''}`}
      >
        {/* Only show title when NOT in fullscreen page */}
        {!isFullscreenPage && (
          <h3 className="text-lg font-semibold mb-3">
            {variable1Title && variable2Title ? (
              <>Análisis bivariado (barras apiladas): {variable1Title} × {variable2Title}</>
            ) : (
              <>Análisis bivariado (barras apiladas)</>
            )}
          </h3>
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
              : `${darkMode ? 'bg-gray-800/30' : 'bg-gray-50/50'} p-2 sm:p-4`
          }`}
          style={{ 
            minHeight: isFullscreenPage ? '100%' : '250px',
            height: isFullscreenPage || isFullscreen ? '100%' : `${chartHeight}px`
          }}
        >
          {/* Controls container with absolute positioning - shown in all cases */}
          <div 
            ref={toolbarRef}
            className={`absolute top-0 left-0 right-0 z-10 px-2 py-2 sm:py-1.5 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2 border-b shadow-sm ${
              isFullscreen || darkMode 
                ? 'bg-black/30 backdrop-blur-sm border-gray-700/30' 
                : 'bg-white/70 backdrop-blur-sm border-gray-200/50'
            }`}
          >
            {/* Left side: View mode selector */}
            <div className="flex-shrink-0 w-full sm:w-auto mb-1 sm:mb-0">
              <select
                className={`text-xs p-1 rounded border w-full sm:w-auto min-w-[120px] ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                value={localViewMode}
                onChange={(e) => setLocalViewMode(e.target.value)}
                aria-label="Modo de visualización"
              >
                <option value="absolute">Valores absolutos</option>
                <option value="relative">Valores relativos (%)</option>
              </select>
            </div>
            
            {/* Right side: Chart controls */}
            <div className="flex items-center gap-1">
              <div className={`${windowWidth < 640 ? 'hidden sm:block' : ''}`}>
                <select
                  className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  aria-label="Formato de descarga"
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
                hideViewModeSelector={true}
              />
            </div>
          </div>
          
          {zoom !== 100 && (
            <div className={`absolute bottom-0 left-0 m-2 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
              {zoom}%
            </div>
          )}
          
          {/* Container for chart with dynamic spacing from toolbar */}
          <div 
            ref={chartWrapperRef}
            className="relative w-full h-full" 
            style={{ 
              paddingTop: `${Math.max(toolbarHeight + (windowWidth < 480 ? 12 : 8), windowWidth < 480 ? 70 : windowWidth < 640 ? 60 : 50)}px`,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <canvas 
              ref={chartRef}
              className="w-full h-full"
              style={{ 
                maxHeight: isFullscreen ? '95vh' : isFullscreenPage ? '100%' : '100%',
                maxWidth: isFullscreen ? '95vw' : '100%',
                paddingTop: 0
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 