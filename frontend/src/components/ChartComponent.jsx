import { useEffect, useState, useRef } from "react";
import { getDistribucion } from "../api/cisApi";
import { API_URL } from "../api/cisApi";
import Chart from 'chart.js/auto';
import { exportAsImage, getFormattedDate } from "../utils/chartExport";

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
  const [exporting, setExporting] = useState(false);
  const [chartOptions, setChartOptions] = useState({
    animation: true,
    responsive: true,
    aspectRatio: initialAspectRatio
  });
  
  const chartRef = useRef(null);
  const chartContainer = useRef(null);

  // Function to open chart in new tab
  const openInNewTab = () => {
    const baseUrl = window.location.origin;
    const excludedValuesParam = excludedValues.length > 0 ? `&excludedValues1=${excludedValues.join(',')}` : '';
    
    // Include additional chart configuration parameters
    const zoomParam = zoom !== 100 ? `&zoom=${zoom}` : '';
    const aspectRatioParam = chartOptions.aspectRatio !== 1.6 ? `&aspectRatio=${chartOptions.aspectRatio}` : '';
    const legendParam = `&showLegend=${showLegend}`;
    
    const url = `${baseUrl}/chart/univariate/${variable}?chartType=${chartType}&sortOrder=${sortOrder}${excludedValuesParam}&darkMode=${darkMode}${zoomParam}${aspectRatioParam}${legendParam}`;
    
    window.open(url, '_blank');
  };

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
      const maxLength = window.innerWidth < 640 ? 15 : 25;
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
    
    // Calculate appropriate base aspect ratio based on screen width
    const baseAspectRatio = window.innerWidth < 640 ? 1.2 : chartOptions.aspectRatio;
    
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
        maintainAspectRatio: !isFullscreenPage,
        scales: {
          x: {
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0,
              font: {
                size: window.innerWidth < 640 ? 10 : 12
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
                size: window.innerWidth < 640 ? 10 : 12
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
              padding: window.innerWidth < 640 ? 8 : 15,
              font: {
                size: window.innerWidth < 640 ? 10 : 12
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
    
    const ctx = chartRef.current.getContext('2d');
    const newChartInstance = new Chart(ctx, chartConfig);
    setChartInstance(newChartInstance);
    
    return () => {
      if (newChartInstance) {
        newChartInstance.destroy();
      }
    };
  }, [variable, chartType, sortOrder, excludedValues, data, valueLabels, loading, darkMode, zoom, showLegend, chartOptions]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = document.fullscreenElement === chartContainer.current;
      setIsFullscreen(isFS);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const downloadChart = async () => {
    if (!chartRef.current) return;
    
    try {
      setExporting(true);
      
      // Obtener el contenedor del gráfico (que contiene el canvas)
      const chartContainer = chartRef.current.parentNode;
      
      // Preparar opciones para la exportación
      const options = {
        title: `Distribución de ${variable}`,
        subtitle: `Tipo de gráfico: ${getChartTypeName()}`,
        description: excludedValues.length > 0 ? `(${excludedValues.length} valores excluidos)` : "",
        darkMode: darkMode,
        chartType: chartType,
        width: chartContainer.offsetWidth * 1.5,
        height: chartContainer.offsetHeight * 1.5,
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
        skipCssColors: true, // Manejar colores modernos como OKLCH que causan problemas
        // Extraer leyendas desde Chart.js
        legendItems: chartInstance ? 
          chartInstance.data.datasets[0].data.map((value, index) => ({
            color: Array.isArray(chartInstance.data.datasets[0].backgroundColor) 
              ? chartInstance.data.datasets[0].backgroundColor[index]
              : chartInstance.data.datasets[0].backgroundColor,
            text: chartInstance.data.labels[index]
          })) : []
      };
      
      // Nombre del archivo
      const filename = `grafico_${variable}_${chartType}_${getFormattedDate()}`;
      
      // Esperar a que el componente esté completamente renderizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Usar la función avanzada de exportación
      const success = await exportAsImage(chartContainer, filename, options);
      
      if (!success) {
        throw new Error("No se pudo exportar el gráfico");
      }
    } catch (err) {
      console.error('Error al descargar el gráfico:', err);
      alert('Error al descargar el gráfico');
    } finally {
      setExporting(false);
    }
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

  const getChartTypeName = () => {
    switch(chartType) {
      case 'bar': return 'barras';
      case 'line': return 'líneas';
      case 'pie': return 'sectores';
      case 'doughnut': return 'anillo';
      default: return 'barras';
    }
  };

  return (
    <div className={`relative ${darkMode ? 'text-white' : 'text-gray-800'}`}>
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
        
        <button
          onClick={downloadChart}
          className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-opacity duration-200 ${exporting ? 'cursor-not-allowed opacity-50' : ''}`}
          title="Descargar gráfico"
          disabled={exporting}
        >
          {exporting ? (
            <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
        
        <button
          onClick={increaseZoom}
          className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-opacity duration-200`}
          title="Aumentar zoom"
          disabled={zoom >= 200}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        
        <button
          onClick={decreaseZoom}
          className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-opacity duration-200`}
          title="Disminuir zoom"
          disabled={zoom <= 40}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        
        <button
          onClick={resetZoom}
          className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-opacity duration-200 ${zoom === 100 ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Restablecer zoom"
          disabled={zoom === 100}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-opacity duration-200`}
          title={showLegend ? "Ocultar leyenda" : "Mostrar leyenda"}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
        
        <button
          onClick={toggleAspectRatio}
          className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-opacity duration-200`}
          title="Cambiar relación de aspecto"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
        
        {/* Add button to open in a new tab if not already in fullscreen page */}
        {!isFullscreenPage && (
          <button
            onClick={openInNewTab}
            className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-opacity duration-200`}
            title="Abrir en nueva pestaña"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
        
        <button
          onClick={toggleFullscreen}
          className={`p-0.5 sm:p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title={isFullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
        >
          {isFullscreen ? (
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>
      </div>
      
      <div 
        ref={chartContainer}
        className={`relative group overflow-hidden rounded-lg ${
          isFullscreen 
            ? 'bg-black w-screen h-screen flex items-center justify-center' 
            : `${darkMode ? 'bg-gray-800/30' : 'bg-gray-50/50'} p-2 sm:p-4`
        }`}
        style={{ 
          minHeight: isFullscreenPage ? '100%' : '250px',
          height: isFullscreenPage ? '100%' : undefined
        }}
      >
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
          <div className={`${isFullscreen || isFullscreenPage ? 'p-2 sm:p-8 max-w-screen-xl mx-auto' : 'w-full'}`} style={{ height: isFullscreenPage ? '100%' : undefined }}>
            {zoom !== 100 && (
              <div className={`absolute top-0 left-0 m-2 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                {zoom}%
              </div>
            )}
            <canvas ref={chartRef} className="w-full h-full"></canvas>
          </div>
        )}
      </div>
    </div>
  );
}
