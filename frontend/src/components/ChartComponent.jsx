import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { getDistribucion } from "../api/cisApi";
import { API_URL } from "../api/cisApi";
import Chart from 'chart.js/auto';
import { getFormattedDate } from "../utils/chartExport";
import ChartControls from "./charts/ChartControls";
import useChartExport from "../hooks/useChartExport";
import useAvailableSpace from "../hooks/useAvailableSpace";

export default function ChartComponent({ 
  variable, 
  chartType = 'bar', 
  sortOrder = 'code', 
  excludedValues = [],
  darkMode = false,
  isFullscreenPage = false,
  initialZoom = 100,
  initialAspectRatio = 1.6,
  initialShowLegend = true
}) {
  const [data, setData] = useState({});
  const [valueLabels, setValueLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(initialZoom);
  const [showLegend, setShowLegend] = useState(initialShowLegend);
  const [downloadFormat, setDownloadFormat] = useState('png');
  const [totalExcluded, setTotalExcluded] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [chartHeight, setChartHeight] = useState(windowWidth < 640 ? 350 : 500);
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true
  );
  const [chartOptions, setChartOptions] = useState({
    animation: true,
    responsive: true,
    aspectRatio: initialAspectRatio
  });
  
  const chartRef = useRef(null);
  const chartContainer = useRef(null);
  const toolbarRef = useRef(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const chartWrapperRef = useRef(null);

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

  // Use the export hook - now getting setExporting as well
  const { 
    exporting,
    setExporting,
    chartInstanceRef,
    exportChart,
    openInNewTab: openChartInNewTab
  } = useChartExport();

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

  // Function to open chart in new tab
  const openInNewTab = () => {
    // Instead of manually building the URL, use the hook function for consistency
    openChartInNewTab({
      variable1: variable,
      chartType: chartType,
      sortOrder: sortOrder,
      excludedValues1: excludedValues,
      darkMode: darkMode,
      zoom: zoom,
      aspectRatio: chartOptions.aspectRatio,
      showLegend: showLegend
    });
  };

  // Effect to handle window resizing
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

  useEffect(() => {
    async function fetchData() {
      if (!variable) return;
      
      setLoading(true);
      try {
        // Obtener la distribución
        const distribution = await getDistribucion(variable);
        setData(distribution);
        
        // Obtener metadatos
        const response = await fetch(`${API_URL}/metadatos`);
        const metadata = await response.json();
        setValueLabels(metadata.etiquetas_valores[variable] || {});
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [variable]);

  const getProcessedData = () => {
    // Filtrar valores excluidos
    const filteredData = Object.entries(data).filter(([key]) => !excludedValues.includes(key));
    
    // Ordenar según el criterio
    if (sortOrder === 'code') {
      // Ordenar por código/valor
      return filteredData.sort((a, b) => {
        // Si son números, ordenar numéricamente
        if (!isNaN(a[0]) && !isNaN(b[0])) {
          return parseFloat(a[0]) - parseFloat(b[0]);
        }
        // De lo contrario, ordenar alfabéticamente
        return a[0].localeCompare(b[0]);
      });
    } else if (sortOrder === 'frequency') {
      // Ordenar por frecuencia (descendente)
      return filteredData.sort((a, b) => b[1] - a[1]);
    }
    
    return filteredData;
  };

  useEffect(() => {
    if (loading || !chartRef.current) return;
    
    // Limpiar gráfico existente
    if (chartInstance) {
      chartInstance.destroy();
    }
    
    const processedData = getProcessedData();
    
    if (processedData.length === 0) {
      setError("No hay datos disponibles para visualizar");
      return;
    }
    
    const labels = processedData.map(([key]) => {
      const label = valueLabels[key] || key;
      // Acortar etiquetas muy largas
      const maxLength = windowWidth < 640 ? 15 : 25;
      return label.length > maxLength ? label.substring(0, maxLength - 3) + '...' : label;
    });
    
    const values = processedData.map(([, value]) => value);
    
    // Paleta de colores dinámica según modo oscuro
    const baseColors = darkMode ? [
      'rgba(59, 130, 246, 0.8)',    // blue-500
      'rgba(16, 185, 129, 0.8)',    // emerald-500
      'rgba(245, 158, 11, 0.8)',    // amber-500
      'rgba(239, 68, 68, 0.8)',     // red-500
      'rgba(139, 92, 246, 0.8)',    // violet-500
      'rgba(236, 72, 153, 0.8)',    // pink-500
      'rgba(20, 184, 166, 0.8)',    // teal-500
      'rgba(249, 115, 22, 0.8)',    // orange-500
      'rgba(6, 182, 212, 0.8)',     // cyan-500
      'rgba(168, 85, 247, 0.8)'     // purple-500
    ] : [
      'rgba(37, 99, 235, 0.8)',     // blue-600
      'rgba(5, 150, 105, 0.8)',     // emerald-600
      'rgba(217, 119, 6, 0.8)',     // amber-600
      'rgba(220, 38, 38, 0.8)',     // red-600
      'rgba(124, 58, 237, 0.8)',    // violet-600
      'rgba(219, 39, 119, 0.8)',    // pink-600
      'rgba(13, 148, 136, 0.8)',    // teal-600
      'rgba(234, 88, 12, 0.8)',     // orange-600
      'rgba(8, 145, 178, 0.8)',     // cyan-600
      'rgba(147, 51, 234, 0.8)'     // purple-600
    ];
    
    // Generar colores suficientes para todos los datos
    const colors = Array(values.length).fill().map((_, i) => baseColors[i % baseColors.length]);
    
    // Configurar el tema del gráfico según el modo oscuro
    Chart.defaults.color = darkMode ? '#e5e7eb' : '#374151';
    Chart.defaults.borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // Calculate appropriate base aspect ratio based on screen width and orientation
    let baseAspectRatio = windowWidth < 640 ? 1.2 : chartOptions.aspectRatio;
    // On mobile in portrait mode, reduce aspect ratio for better vertical space usage
    if (windowWidth < 640 && isPortrait) {
      baseAspectRatio = 0.8;
    }
    
    // Definir los tipos de gráficos disponibles
    const chartConfig = {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: `${variable}`,
          data: values,
          backgroundColor: chartType === 'line' ? baseColors[0] : colors,
          borderColor: chartType === 'line' ? baseColors[0] : colors,
          borderWidth: 1,
          hoverOffset: 4,
          fill: chartType === 'line' ? false : undefined,
          tension: chartType === 'line' ? 0.1 : undefined
        }]
      },
      options: {
        ...chartOptions,
        aspectRatio: baseAspectRatio,
        maintainAspectRatio: isFullscreenPage ? false : (isFullscreen ? false : true),
        layout: {
          padding: {
            top: 5,
            right: 5,
            bottom: 5,
            left: 5
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
            beginAtZero: true,
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: windowWidth < 640 ? 10 : 12
              }
            }
          }
        },
        plugins: {
          legend: {
            display: showLegend && (chartType === 'pie' || chartType === 'doughnut'),
            position: 'bottom',
            labels: {
              boxWidth: 15,
              padding: windowWidth < 640 ? 8 : 15,
              font: {
                size: windowWidth < 640 ? 10 : 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                const percentage = Math.round((value / total) * 100);
                return `${value.toLocaleString()} (${percentage}%)`;
              }
            },
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: darkMode ? '#e5e7eb' : '#111827',
            bodyColor: darkMode ? '#e5e7eb' : '#374151',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true
          }
        }
      }
    };
    
    // Aplicar zoom
    if (zoom !== 100) {
      chartConfig.options.scales.x.ticks.autoSkip = false;
      chartConfig.options.aspectRatio = chartConfig.options.aspectRatio * (100 / zoom);
    }
    
    // Add small delay to ensure the layout is stable before rendering the chart
    setTimeout(() => {
      const ctx = chartRef.current.getContext('2d');
      const newChartInstance = new Chart(ctx, chartConfig);
      
      // Store the chart instance in both state and ref
      setChartInstance(newChartInstance);
      chartInstanceRef.current = newChartInstance;
    }, 0);
    
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [variable, chartType, sortOrder, excludedValues, data, valueLabels, loading, darkMode, zoom, showLegend, chartOptions, windowWidth, isPortrait, chartHeight]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = document.fullscreenElement === chartContainer.current;
      setIsFullscreen(isFS);
      
      // Recalculate height after fullscreen change
      setTimeout(calculateHeight, 100);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [calculateHeight]);

  // Helper function to get human-readable chart type names
  const getChartTypeName = (type) => {
    const chartTypes = {
      'bar': 'Barras',
      'line': 'Líneas',
      'pie': 'Pastel',
      'doughnut': 'Anillo'
    };
    return chartTypes[type] || type;
  };

  // Add this function to ensure chart rendering for export
  const prepareChartForExport = () => {
    if (chartInstance) {
      // Apply any pending animations or updates
      chartInstance.update('none');
      // Force render
      chartInstance.render();
    }
  };

  // Update the useEffect for exporting to include preparation
  useEffect(() => {
    if (exporting) {
      prepareChartForExport();
    }
  }, [exporting]);

  // Enhanced chart export function
  const handleChartExport = async (format = 'png') => {
    if (!chartInstance) {
      console.error("No chart instance available for export");
      return;
    }
    
    try {
      // Create a filename with the variable name and date
      const date = getFormattedDate();
      const filename = `${variable}_chart_${date}`;
      
      // Enhanced export options
      const exportOptions = {
        chartInstance: chartInstance,
        filename: filename,
        format: format,
        title: `Distribución de ${variable}`,
        subtitle: `Tipo: ${getChartTypeName(chartType)}`,
        footnote: `Generado el ${date}`,
        darkMode: darkMode,
        // Include legend items for all chart types
        legendItems: chartInstance.data.datasets[0].data.map((value, index) => ({
          color: Array.isArray(chartInstance.data.datasets[0].backgroundColor) 
            ? chartInstance.data.datasets[0].backgroundColor[index]
            : chartInstance.data.datasets[0].backgroundColor,
          text: chartInstance.data.labels[index]
        }))
      };
      
      // Call the export function with the enhanced options
      await exportChart(exportOptions);
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };

  const downloadChart = async () => {
    // Use the enhanced handleChartExport function with the selected format
    await handleChartExport(downloadFormat);
  };
  
  const toggleFullscreen = () => {
    if (!chartContainer.current) return;
    
    if (!isFullscreen) {
      if (chartContainer.current.requestFullscreen) {
        chartContainer.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  const increaseZoom = () => {
    setZoom(prevZoom => Math.min(prevZoom + 20, 200));
  };
  
  const decreaseZoom = () => {
    setZoom(prevZoom => Math.max(prevZoom - 20, 40));
  };
  
  const resetZoom = () => {
    setZoom(100);
  };
  
  const toggleAspectRatio = () => {
    setChartOptions(prev => ({
      ...prev, 
      aspectRatio: prev.aspectRatio === 1.6 ? 1 : 1.6
    }));
  };

  if (loading) {
    return (
      <div className="p-2 md:p-4 border rounded-md bg-white shadow">
        <h3 className="text-lg font-semibold mb-4">Gráfico de {variable}</h3>
        <div className="animate-pulse h-[300px] bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${darkMode ? 'text-white' : 'text-gray-800'}`}
    >
      {!isFullscreenPage && (
        <div ref={headerRef}>
          <h3 className="text-lg font-semibold mb-3">
            {`Distribución de ${variable}`}
          </h3>
        </div>
      )}
      
      <div 
        ref={chartContainer}
        className={`relative group overflow-hidden rounded-lg ${
          isFullscreen 
            ? 'bg-black w-screen h-screen flex items-center justify-center' 
            : `${darkMode ? 'bg-gray-800/30' : 'bg-gray-50/50'} p-2 sm:p-4`
        }`}
        style={{ 
          minHeight: isFullscreenPage ? '100%' : '250px',
          height: isFullscreenPage || isFullscreen ? '100%' : `${chartHeight}px`
        }}
      >
        {/* Controls container with absolute positioning */}
        <div 
          ref={toolbarRef}
          className={`absolute top-0 left-0 right-0 z-10 px-2 py-2 sm:py-1.5 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2 border-b shadow-sm ${
            isFullscreen || darkMode 
              ? 'bg-black/30 backdrop-blur-sm border-gray-700/30' 
              : 'bg-white/70 backdrop-blur-sm border-gray-200/50'
          }`}
        >
          {/* Chart type and download format selection */}
          <div className="flex-shrink-0 w-full sm:w-auto mb-1 sm:mb-0">
            <select
              className={`text-xs p-1 rounded border w-full sm:w-auto min-w-[120px] ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
              value={chartType}
              onChange={(e) => window.location.href = `?variable=${variable}&chartType=${e.target.value}&sortOrder=${sortOrder}`}
              aria-label="Tipo de gráfico"
            >
              <option value="bar">Barras</option>
              <option value="line">Líneas</option>
              <option value="pie">Circular</option>
              <option value="doughnut">Anillo</option>
            </select>
          </div>
          
          {/* Right side controls */}
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
              exporting={exporting}
              handleExportChart={downloadChart}
              openInNewTab={openInNewTab}
              isFullscreenPage={isFullscreenPage}
              darkMode={darkMode}
              zoom={zoom}
              increaseZoom={increaseZoom}
              decreaseZoom={decreaseZoom}
              resetZoom={resetZoom}
              showLegend={showLegend}
              toggleLegend={() => setShowLegend(!showLegend)}
              toggleAspectRatio={toggleAspectRatio}
              toggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
              hideViewModeSelector={true}
            />
          </div>
        </div>
        
        {loading ? (
          <div className={`flex flex-col items-center justify-center ${isFullscreen ? 'h-screen' : 'h-80'}`}>
            <div className={`animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'} mb-4`}></div>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Cargando gráfico...</p>
          </div>
        ) : error ? (
          <div className={`flex flex-col items-center justify-center ${isFullscreen ? 'h-screen' : 'h-80'} text-red-500`}>
            <svg className="w-8 h-8 sm:w-12 sm:h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium text-center">{error}</p>
          </div>
        ) : (
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
            {zoom !== 100 && (
              <div className={`absolute bottom-0 left-0 m-2 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                {zoom}%
              </div>
            )}
            <canvas 
              ref={chartRef} 
              className="w-full h-full" 
              style={{ 
                paddingTop: 0,
                maxHeight: isFullscreen ? '95vh' : isFullscreenPage ? '100%' : '100%',
                maxWidth: isFullscreen ? '95vw' : '100%'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
