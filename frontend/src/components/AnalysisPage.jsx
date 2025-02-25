import { useState, useEffect } from "react";
import VariablesList from "./VariablesList";
import FrequencyTable from "./FrequencyTable";
import ChartComponent from "./ChartComponent";
import ContingencyTable from "./ContingencyTable";
import BivariateChart from "./BivariateChart";
import VariableCleaningOptions from "./VariableCleaningOptions";
import FileManager from './FileManager';
import { Link } from 'react-router-dom';
import { getVariables } from "../api/cisApi";

export default function AnalysisPage() {
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [secondaryVariable, setSecondaryVariable] = useState(null);
  const [chartType, setChartType] = useState("bar");
  const [bivariateChartType, setBivariateChartType] = useState("treemap");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('table');
  const [sortOrder, setSortOrder] = useState('code');
  const [analysisType, setAnalysisType] = useState('univariate');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Nuevos estados para las exclusiones
  const [excludedPrimaryValues, setExcludedPrimaryValues] = useState([]);
  const [excludedSecondaryValues, setExcludedSecondaryValues] = useState([]);

  // Efecto para reiniciar exclusiones cuando cambian variables
  useEffect(() => {
    setExcludedPrimaryValues([]);
  }, [selectedVariable]);

  useEffect(() => {
    setExcludedSecondaryValues([]);
  }, [secondaryVariable]);

  // Efecto para manejar el overflow del body
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isSidebarOpen]);

  // Manejar el cambio de archivo activo
  const handleFileChange = (filename) => {
    // Limpiar los datos cargados
    setSelectedVariable(null);
    setSecondaryVariable(null);
    setChartType("bar");
    setBivariateChartType("treemap");
    setIsSidebarOpen(false);
    setActiveTab('table');
    setSortOrder('code');
    setAnalysisType('univariate');
    setExcludedPrimaryValues([]);
    setExcludedSecondaryValues([]);
    
    // No es necesario actualizar nada más ya que VariablesList se encarga de cargar las variables
    console.log(`Archivo activo cambiado a: ${filename}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Menu button integrated into header for mobile */}
            <div className="flex items-center">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden mr-3 text-white p-2 rounded-lg"
                  aria-label="Abrir menú de variables"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-bold text-white">Análisis de Datos CIS</h1>
            </div>
            <div className="flex space-x-4">
              <FileManager onFileChange={handleFileChange} />
              <Link to="/" className="text-white hover:text-blue-200">
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row">
        {/* Sidebar/Drawer */}
        <aside className={`
          md:w-1/4 bg-white shadow-lg
          fixed md:static top-0 left-0 h-screen z-40
          transform transition-transform duration-300 ease-in-out
          w-3/4 sm:w-2/3
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          flex flex-col
        `}>
          {/* Header del drawer con nuevo diseño */}
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Variables Disponibles</h2>
            {/* Botón de cerrar - solo visible en móvil */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Cerrar menú de variables"
            >
              <svg 
                className="w-6 h-6 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>

          {/* Contenedor scrolleable */}
          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <VariablesList 
              onSelect={(variable) => {
                setSelectedVariable(variable);
                setIsSidebarOpen(false);
              }} 
            />
          </div>
        </aside>

        {/* Overlay para cerrar el drawer en móvil */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 mt-4 md:mt-0">
            Visualización del CIS
          </h1>

          {selectedVariable?.code ? (
            <div className="bg-white p-4 md:p-6 shadow-md rounded-lg">
              <h2 className="text-xl font-semibold mb-4">
                Variable principal: {selectedVariable.label} ({selectedVariable.code})
              </h2>

              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="font-medium block">Tipo de análisis:</label>
                  <select
                    className="border p-2 rounded-md mt-2 w-full"
                    value={analysisType}
                    onChange={(e) => {
                      setAnalysisType(e.target.value);
                      setSecondaryVariable(null); // Reset secondary variable when changing analysis type
                    }}
                  >
                    <option value="univariate">Univariado</option>
                    <option value="bivariate">Bivariado</option>
                  </select>
                </div>

                {analysisType === 'univariate' ? (
                  <>
                    <div className="flex-1">
                      <label className="font-medium block">Tipo de Gráfico:</label>
                      <select
                        className="border p-2 rounded-md mt-2 w-full"
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                      >
                        <option value="bar">Barras</option>
                        <option value="line">Líneas</option>
                        <option value="pie">Pastel</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="font-medium block">Ordenar por:</label>
                      <select
                        className="border p-2 rounded-md mt-2 w-full"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                      >
                        <option value="code">Código (ascendente)</option>
                        <option value="frequency">Frecuencia (descendente)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <label className="font-medium block">Variable secundaria:</label>
                      <VariablesList
                        onSelect={(variable) => setSecondaryVariable(variable)}
                        excludeVariable={selectedVariable.code}
                        isCompact={true}
                      />
                    </div>

                    <div className="flex-1">
                      <label className="font-medium block">Tipo de Gráfico:</label>
                      <select
                        className="border p-2 rounded-md mt-2 w-full"
                        value={bivariateChartType}
                        onChange={(e) => setBivariateChartType(e.target.value)}
                      >
                        <option value="treemap">Mapa de árbol</option>
                        <option value="stacked">Barras apiladas</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Opciones de limpieza de variables */}
              <div className="mt-6 mb-2">
                <VariableCleaningOptions
                  variable={selectedVariable.code}
                  excludedValues={excludedPrimaryValues}
                  onExcludedValuesChange={setExcludedPrimaryValues}
                  label={`Limpiar variable principal: ${selectedVariable.label}`}
                />

                {analysisType === 'bivariate' && secondaryVariable && (
                  <VariableCleaningOptions
                    variable={secondaryVariable.code}
                    excludedValues={excludedSecondaryValues}
                    onExcludedValuesChange={setExcludedSecondaryValues}
                    label={`Limpiar variable secundaria: ${secondaryVariable.label}`}
                  />
                )}
              </div>

              {/* Tabs para móvil */}
              <div className="md:hidden mb-4">
                <div className="flex border-b">
                  <button
                    className={`flex-1 py-2 px-4 ${activeTab === 'table' ? 'border-b-2 border-blue-500 text-blue-600' : ''}`}
                    onClick={() => setActiveTab('table')}
                  >
                    Tabla
                  </button>
                  <button
                    className={`flex-1 py-2 px-4 ${activeTab === 'chart' ? 'border-b-2 border-blue-500 text-blue-600' : ''}`}
                    onClick={() => setActiveTab('chart')}
                  >
                    Gráfico
                  </button>
                </div>
              </div>

              {/* Contenido responsive */}
              <div className="md:grid md:grid-cols-2 md:gap-6">
                {analysisType === 'univariate' ? (
                  <>
                    <div className={`${activeTab === 'table' ? 'block' : 'hidden'} md:block`}>
                      <FrequencyTable 
                        variable={selectedVariable.code} 
                        sortOrder={sortOrder} 
                        excludedValues={excludedPrimaryValues}
                      />
                    </div>
                    <div className={`${activeTab === 'chart' ? 'block' : 'hidden'} md:block`}>
                      <ChartComponent 
                        variable={selectedVariable.code} 
                        chartType={chartType} 
                        sortOrder={sortOrder} 
                        excludedValues={excludedPrimaryValues}
                      />
                    </div>
                  </>
                ) : secondaryVariable ? (
                  <>
                    <div className={`${activeTab === 'table' ? 'block' : 'hidden'} md:block`}>
                      <ContingencyTable 
                        variable1={selectedVariable.code} 
                        variable2={secondaryVariable.code} 
                        excludedValues1={excludedPrimaryValues}
                        excludedValues2={excludedSecondaryValues}
                      />
                    </div>
                    <div className={`${activeTab === 'chart' ? 'block' : 'hidden'} md:block`}>
                      <BivariateChart 
                        variable1={selectedVariable.code} 
                        variable2={secondaryVariable.code}
                        chartType={bivariateChartType}
                        excludedValues1={excludedPrimaryValues}
                        excludedValues2={excludedSecondaryValues}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600 col-span-2 text-center">
                    Selecciona una variable secundaria para ver el análisis bivariado.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center md:text-left">
              Selecciona una variable en el panel lateral para ver los datos.
            </p>
          )}
        </main>
      </div>
    </div>
  );
} 