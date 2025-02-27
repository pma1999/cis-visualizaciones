import { useEffect, useState } from "react";
import useBivariateData from "../hooks/useBivariateData";
import useChartExport from "../hooks/useChartExport";
import TreemapChart from "./charts/TreemapChart";
import StackedBarChart from "./charts/StackedBarChart";
import ChartControls from "./charts/ChartControls";

/**
 * Componente principal para visualizar datos bivariados usando diferentes tipos de gráficos
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.variable1 - Primera variable para el análisis bivariado
 * @param {string} props.variable2 - Segunda variable para el análisis bivariado
 * @param {string} props.chartType - Tipo de gráfico (treemap, stacked)
 * @param {string[]} props.excludedValues1 - Valores a excluir de la primera variable
 * @param {string[]} props.excludedValues2 - Valores a excluir de la segunda variable
 * @param {boolean} props.darkMode - Si se debe usar el modo oscuro
 * @param {string} props.viewMode - Modo de visualización inicial (absolute, relative)
 * @param {boolean} props.isFullscreenPage - Si se está mostrando en pantalla completa
 */
export default function BivariateChart({ 
  variable1, 
  variable2, 
  chartType = "treemap", 
  excludedValues1 = [], 
  excludedValues2 = [],
  darkMode = false,
  viewMode = 'absolute',
  isFullscreenPage = false
}) {
  // Estado local para el modo de visualización
  const [localViewMode, setLocalViewMode] = useState(viewMode);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Hooks personalizados
  const {
    loading,
    colorScheme,
    variable1Title,
    variable2Title,
    prepareTreemapData,
    prepareStackedBarData,
    getRelativeModeExplanation,
    totalExcluded,
    hasData
  } = useBivariateData(variable1, variable2, excludedValues1, excludedValues2, darkMode);

  const {
    exporting,
    chartContainerRef,
    handleExportChart,
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

  // Preparar los datos según el tipo de gráfico
  const getChartData = () => {
    if (chartType === 'treemap') {
      return prepareTreemapData(localViewMode);
    } else { // stacked
      return prepareStackedBarData(localViewMode);
    }
  };

  // Obtener las columnas para el gráfico de barras
  const getChartColumns = () => {
    if (!hasData || chartType !== 'stacked') return [];
    
    // Extraer nombres de columnas del primer elemento de datos
    const data = prepareStackedBarData(localViewMode);
    if (data.length === 0) return [];
    
    return Object.keys(data[0])
      .filter(key => !key.includes('_') && key !== 'name');
  };

  // Handler para exportar el gráfico
  const onExportChart = () => {
    handleExportChart({
      variable1Title,
      variable2Title,
      chartType,
      viewMode: localViewMode,
      darkMode,
      excludedValues1: excludedValues1.length,
      excludedValues2: excludedValues2.length
    });
  };

  // Handler para abrir en nueva pestaña
  const onOpenInNewTab = () => {
    openInNewTab({
      variable1,
      variable2,
      chartType,
      viewMode: localViewMode,
      darkMode,
      excludedValues1,
      excludedValues2
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
        <div className="flex flex-wrap items-center justify-between mb-3">
          <h3 className={`text-lg font-semibold ${isFullscreenPage ? 'sr-only' : ''}`}>
            {variable1Title && variable2Title ? (
              <>Análisis bivariado: {variable1Title} × {variable2Title}</>
            ) : (
              <>Análisis bivariado</>
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
          />
        </div>
      
        {totalExcluded > 0 && (
          <div className={`text-xs mb-2 px-2 py-1 rounded-md inline-block ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {totalExcluded} {totalExcluded === 1 ? 'valor excluido' : 'valores excluidos'}
          </div>
        )}
        
        <div 
          ref={chartContainerRef}
          className={`overflow-hidden rounded-lg ${darkMode ? 'bg-gray-800/30' : 'bg-gray-50/50'} p-4 ${isFullscreenPage ? 'h-full' : 'h-[500px]'}`}
          style={{ minHeight: isFullscreenPage ? '500px' : undefined }}
        >
          {chartType === 'treemap' ? (
            <TreemapChart 
              data={getChartData()}
              colorScheme={colorScheme}
              viewMode={localViewMode}
              isFullscreenPage={isFullscreenPage}
              darkMode={darkMode}
            />
          ) : (
            <StackedBarChart 
              data={getChartData()}
              colorScheme={colorScheme}
              columns={getChartColumns()}
              viewMode={localViewMode}
              isFullscreenPage={isFullscreenPage}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
} 