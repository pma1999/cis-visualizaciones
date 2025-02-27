import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import ChartComponent from "./ChartComponent";
import BivariateChart from "./BivariateChart";
import { getVariables } from "../api/cisApi";

export default function FullscreenChartPage() {
  const { type, variable1, variable2 } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Determine the actual chart type from the URL path
  // If it contains 'bivariate' in the path, it's a bivariate chart, otherwise univariate
  const actualChartType = location.pathname.includes('/bivariate/') ? 'bivariate' : 'univariate';
  
  // Chart configuration from URL parameters
  const [chartConfig, setChartConfig] = useState({
    chartType: searchParams.get("chartType") || (actualChartType === "univariate" ? "bar" : "stacked"),
    sortOrder: searchParams.get("sortOrder") || "code",
    excludedValues1: searchParams.get("excludedValues1") ? 
      searchParams.get("excludedValues1").split(",") : [],
    excludedValues2: searchParams.get("excludedValues2") ? 
      searchParams.get("excludedValues2").split(",") : [],
    darkMode: searchParams.get("darkMode") === "true",
    viewMode: searchParams.get("viewMode") || "absolute",
    zoom: searchParams.get("zoom") ? parseInt(searchParams.get("zoom")) : 100,
    aspectRatio: searchParams.get("aspectRatio") ? parseFloat(searchParams.get("aspectRatio")) : 1.6,
    showLegend: searchParams.get("showLegend") !== "false",
  });
  
  // Variable metadata
  const [variableData, setVariableData] = useState({
    var1: null,
    var2: null,
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch variable metadata
  useEffect(() => {
    async function fetchVariableData() {
      try {
        setIsLoading(true);
        const variables = await getVariables();
        
        if (variables && variable1) {
          // Create variable object with code and label
          // Since 'variables' is an object of format { code: label, ... }
          const var1Data = variables[variable1] ? {
            code: variable1,
            label: variables[variable1]
          } : null;
          
          const var2Data = variable2 && variables[variable2] ? {
            code: variable2,
            label: variables[variable2]
          } : null;
          
          if (!var1Data) {
            throw new Error(`Variable ${variable1} no encontrada`);
          }
          
          if (actualChartType === "bivariate" && variable2 && !var2Data) {
            throw new Error(`Variable ${variable2} no encontrada`);
          }
          
          setVariableData({
            var1: var1Data,
            var2: var2Data
          });
        } else {
          throw new Error("Parámetros de URL inválidos");
        }
      } catch (err) {
        console.error("Error al cargar datos de variables:", err);
        setError(err.message || "Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchVariableData();
  }, [variable1, variable2, actualChartType]);
  
  // Share functionality
  const [shareUrl, setShareUrl] = useState("");
  const [shareTooltip, setShareTooltip] = useState(false);
  
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    });
  };
  
  const toggleDarkMode = () => {
    setChartConfig(prev => ({
      ...prev,
      darkMode: !prev.darkMode
    }));
  };
  
  // Format title for display
  const getPageTitle = () => {
    if (isLoading || error) return "Cargando gráfico...";
    
    if (actualChartType === "univariate") {
      return `${variableData.var1?.label || variable1}`;
    } else {
      return `${variableData.var1?.label || variable1} × ${variableData.var2?.label || variable2}`;
    }
  };
  
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${chartConfig.darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${chartConfig.darkMode ? "border-blue-400" : "border-blue-600"} mb-4 mx-auto`}></div>
          <p className="text-lg">Cargando gráfico...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${chartConfig.darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="text-center max-w-lg px-4">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="mb-6">{error}</p>
          <Link to="/analysis" className={`px-6 py-3 rounded-lg font-medium ${chartConfig.darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white transition-colors`}>
            Volver al análisis
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${chartConfig.darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      {/* Header with controls */}
      <header className={`fixed top-0 left-0 right-0 z-10 ${chartConfig.darkMode ? "bg-gray-800/90" : "bg-white/90"} backdrop-blur-sm shadow-md px-2 sm:px-4 py-2 sm:py-3`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center">
            <Link to="/analysis" className={`mr-2 sm:mr-3 p-1.5 sm:p-2 rounded-lg ${chartConfig.darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors`} aria-label="Volver al análisis">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-base sm:text-lg font-semibold mr-4 truncate max-w-[200px] sm:max-w-sm">
              {getPageTitle()}
            </h1>
            <div className="hidden md:flex items-center text-xs">
              <span className={`px-2 py-1 rounded-full ${chartConfig.darkMode ? "bg-blue-900/50 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                {actualChartType === "univariate" ? "Univariado" : "Bivariado"}
              </span>
              <span className={`ml-2 px-2 py-1 rounded-full ${chartConfig.darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}`}>
                {actualChartType === "univariate" ? chartConfig.chartType : "Barras apiladas"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="relative">
              <button
                onClick={copyToClipboard}
                className={`p-1.5 sm:p-2 rounded-lg ${chartConfig.darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors`}
                aria-label="Compartir gráfico"
                title="Compartir gráfico"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              {shareTooltip && (
                <div className={`absolute right-0 top-full mt-1 px-2 py-1 rounded text-xs ${chartConfig.darkMode ? "bg-gray-700" : "bg-gray-800 text-white"}`}>
                  ¡URL copiada!
                </div>
              )}
            </div>
            
            <button
              onClick={toggleDarkMode}
              className={`p-1.5 sm:p-2 rounded-lg ${chartConfig.darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors`}
              aria-label={chartConfig.darkMode ? "Activar modo claro" : "Activar modo oscuro"}
              title={chartConfig.darkMode ? "Activar modo claro" : "Activar modo oscuro"}
            >
              {chartConfig.darkMode ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            {actualChartType === "univariate" && (
              <div>
                <select
                  className={`text-xs sm:text-sm rounded-lg p-1 sm:p-2 ${chartConfig.darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} border`}
                  value={chartConfig.chartType}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, chartType: e.target.value }))}
                >
                  <option value="bar">Barras</option>
                  <option value="line">Líneas</option>
                  <option value="pie">Pastel</option>
                </select>
              </div>
            )}
            
            {actualChartType === "bivariate" && (
              <div>
                <select
                  className={`text-xs sm:text-sm rounded-lg p-1 sm:p-2 ${chartConfig.darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} border`}
                  value={chartConfig.chartType}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, chartType: e.target.value }))}
                >
                  <option value="stacked">Barras apiladas</option>
                </select>
              </div>
            )}
            
            {actualChartType === "univariate" && (
              <div className="hidden sm:block">
                <select
                  className={`text-xs sm:text-sm rounded-lg p-1 sm:p-2 ${chartConfig.darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} border`}
                  value={chartConfig.sortOrder}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, sortOrder: e.target.value }))}
                >
                  <option value="code">Código (ascendente)</option>
                  <option value="frequency">Frecuencia (descendente)</option>
                </select>
              </div>
            )}
            
            {actualChartType === "bivariate" && (
              <div>
                <select
                  className={`text-xs sm:text-sm rounded-lg p-1 sm:p-2 ${chartConfig.darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} border`}
                  value={chartConfig.viewMode}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, viewMode: e.target.value }))}
                >
                  <option value="absolute">Valores absolutos</option>
                  <option value="relative">Valores relativos (%)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main chart container - Optimized height calculation */}
      <main className="pt-12 sm:pt-16 md:pt-20 px-2 sm:px-4 pb-3 sm:pb-6 md:pb-10 max-w-7xl mx-auto">
        <div className="h-[calc(100vh-70px)] sm:h-[calc(100vh-90px)] md:h-[calc(100vh-120px)] w-full flex items-center justify-center">
          {actualChartType === "univariate" ? (
            <div className="w-full h-full">
              <ChartComponent
                variable={variable1}
                chartType={chartConfig.chartType}
                sortOrder={chartConfig.sortOrder}
                excludedValues={chartConfig.excludedValues1}
                darkMode={chartConfig.darkMode}
                isFullscreenPage={true}
                initialZoom={chartConfig.zoom}
                initialAspectRatio={chartConfig.aspectRatio}
                initialShowLegend={chartConfig.showLegend}
              />
            </div>
          ) : (
            <div className="w-full h-full">
              <BivariateChart
                variable1={variable1}
                variable2={variable2}
                excludedValues1={chartConfig.excludedValues1}
                excludedValues2={chartConfig.excludedValues2}
                darkMode={chartConfig.darkMode}
                viewMode={chartConfig.viewMode}
                isFullscreenPage={true}
              />
            </div>
          )}
        </div>
      </main>
      
      {/* Footer with metadata - More compact for mobile */}
      <footer className={`fixed bottom-0 left-0 right-0 ${chartConfig.darkMode ? "bg-gray-800/90" : "bg-white/90"} backdrop-blur-sm shadow-[0_-2px_5px_rgba(0,0,0,0.1)] px-2 sm:px-4 py-1 sm:py-2`}>
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center text-[10px] sm:text-xs">
          <div className="flex flex-wrap items-center">
            <span className="mr-2 sm:mr-3 font-medium">Variable{actualChartType === "bivariate" ? "s" : ""}: </span>
            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md ${chartConfig.darkMode ? "bg-gray-700" : "bg-gray-100"} mr-2`}>
              {variable1} - {variableData.var1?.label}
            </span>
            {actualChartType === "bivariate" && (
              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md ${chartConfig.darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                {variable2} - {variableData.var2?.label}
              </span>
            )}
          </div>
          <div className={`${chartConfig.darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5 sm:mt-0`}>
            {chartConfig.excludedValues1.length > 0 && (
              <span className="mr-2 sm:mr-3">Valores excluidos: {chartConfig.excludedValues1.length}</span>
            )}
            {actualChartType === "bivariate" && chartConfig.excludedValues2.length > 0 && (
              <span>Valores excluidos (var2): {chartConfig.excludedValues2.length}</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
} 