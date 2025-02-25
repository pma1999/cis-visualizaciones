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
            {/* Menu button for both mobile and desktop */}
            <div className="flex items-center">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="mr-3 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
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
              <Link 
                to="/" 
                className="text-white hover:text-blue-200 flex items-center justify-center transition-all duration-200"
                aria-label="Volver al inicio"
                title="Volver al inicio"
              >
                <svg 
                  className="w-5 h-5 sm:w-6 sm:h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 12l9-9 9 9M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" 
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row">
        {/* Sidebar/Drawer - Modified to be collapsible on all screen sizes */}
        <aside className={`
          bg-white shadow-lg
          fixed md:fixed top-0 left-0 h-screen z-40
          transform transition-transform duration-300 ease-in-out
          w-3/4 sm:w-2/3 md:w-80
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}>
          {/* Header del drawer con nuevo diseño */}
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Variables Disponibles</h2>
            {/* Botón de cerrar - visible en todos los tamaños */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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

        {/* Overlay para cerrar el drawer en todos los tamaños */}
        <div 
          className={`fixed inset-0 bg-black z-30 transition-opacity duration-300 ease-in-out ${isSidebarOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Main content - Modified to use full width when sidebar is closed */}
        <main className={`
          flex-1 p-4 md:p-8 
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'md:ml-80' : 'ml-0'}
        `}>
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