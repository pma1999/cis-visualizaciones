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
  // Estados principales
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
  
  // Estados para las exclusiones
  const [excludedPrimaryValues, setExcludedPrimaryValues] = useState([]);
  const [excludedSecondaryValues, setExcludedSecondaryValues] = useState([]);

  // Estado para tutorial guiado
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Estado para modo claro/oscuro
  const [darkMode, setDarkMode] = useState(false);

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

  // Efecto para aplicar modo oscuro
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Manejar el cambio de archivo activo
  const handleFileChange = (filename, isLocalFile = false) => {
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
    
    console.log(`Archivo activo cambiado a: ${filename}${isLocalFile ? ' (local)' : ''}`);
  };

  // Función para reiniciar el análisis
  const handleReset = () => {
    setSelectedVariable(null);
    setSecondaryVariable(null);
    setExcludedPrimaryValues([]);
    setExcludedSecondaryValues([]);
  };

  // Función para cambiar entre modo claro y oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Función para activar el tutorial
  const startTutorial = () => {
    setShowTutorial(true);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header principal */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-600 to-blue-800'} shadow-lg`}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Botón de menú y título */}
            <div className="flex items-center">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className={`mr-3 text-white p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'} transition-colors flex items-center`}
                  aria-label="Abrir menú de variables"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="ml-2 hidden sm:inline">Variables</span>
                </button>
              )}
              <h1 className="text-xl font-bold text-white">Análisis de Datos CIS</h1>
            </div>
            
            {/* Acciones del header */}
            <div className="flex items-center space-x-3">
              {/* Selector de archivos */}
              <FileManager onFileChange={handleFileChange} />
              
              {/* Botón modo oscuro */}
              <button
                onClick={toggleDarkMode}
                className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
                title={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {darkMode ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              
              {/* Tutorial */}
              <button
                onClick={startTutorial}
                className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Iniciar tutorial"
                title="Iniciar tutorial"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* Botón inicio */}
              <Link 
                to="/" 
                className="text-white hover:text-blue-200 p-2 rounded-lg hover:bg-white/10 flex items-center transition-all duration-200"
                aria-label="Volver al inicio"
                title="Volver al inicio"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-[calc(100vh-64px)] flex flex-col md:flex-row">
        {/* Panel lateral mejorado */}
        <aside className={`
          ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} 
          shadow-lg
          fixed md:fixed top-0 left-0 h-screen z-40
          transform transition-transform duration-300 ease-in-out
          w-full sm:w-3/4 md:w-80 lg:w-96
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}>
          {/* Header del drawer */}
          <div className={`p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b flex justify-between items-center sticky top-0 z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold">Variables Disponibles</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className={`p-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
              aria-label="Cerrar menú de variables"
            >
              <svg 
                className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
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
              darkMode={darkMode}
            />
          </div>
        </aside>

        {/* Overlay para cerrar el drawer */}
        <div 
          className={`fixed inset-0 bg-black z-30 transition-opacity duration-300 ease-in-out ${isSidebarOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Contenido principal */}
        <main className={`
          flex-1 p-4 md:p-6 lg:p-8 
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'md:ml-80 lg:ml-96' : 'ml-0'}
        `}>
          {/* Tarjeta de instrucciones cuando no hay variable seleccionada */}
          {!selectedVariable?.code ? (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 md:p-8 max-w-3xl mx-auto mt-8 text-center transition-colors duration-300`}>
              <svg className={`w-20 h-20 mx-auto mb-6 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h2 className="text-2xl font-bold mb-4">Bienvenido al Análisis de Datos</h2>
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Para comenzar, selecciona una variable en el panel lateral. Podrás visualizar su distribución y realizar diferentes tipos de análisis.
              </p>
              <button
                onClick={() => setIsSidebarOpen(true)} 
                className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-6 py-3 rounded-lg font-medium flex items-center mx-auto transition-colors`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Seleccionar Variable
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tarjeta de configuración de análisis */}
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 transition-colors duration-300`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2">
                      {analysisType === 'univariate' ? 'Análisis Univariado' : 'Análisis Bivariado'}
                    </h2>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Variable principal: {selectedVariable.label} 
                      <span className="opacity-70 ml-1 text-sm">({selectedVariable.code})</span>
                    </p>
                    {secondaryVariable && analysisType === 'bivariate' && (
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                        Variable secundaria: {secondaryVariable.label}
                        <span className="opacity-70 ml-1 text-sm">({secondaryVariable.code})</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex space-x-3">
                    <button
                      onClick={handleReset}
                      className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reiniciar
                    </button>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Cambiar Variable
                    </button>
                  </div>
                </div>
                
                {/* Opciones de análisis en tarjeta */}
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Tipo de análisis:</label>
                      <select
                        className={`w-full p-2 rounded-md border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        value={analysisType}
                        onChange={(e) => {
                          setAnalysisType(e.target.value);
                          setSecondaryVariable(null);
                        }}
                      >
                        <option value="univariate">Univariado</option>
                        <option value="bivariate">Bivariado</option>
                      </select>
                    </div>

                    {analysisType === 'univariate' ? (
                      <>
                        <div>
                          <label className={`font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            Tipo de Gráfico:
                          </label>
                          <select
                            className={`w-full p-2 rounded-md border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value)}
                          >
                            <option value="bar">Barras</option>
                            <option value="line">Líneas</option>
                            <option value="pie">Pastel</option>
                          </select>
                        </div>

                        <div>
                          <label className={`font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            Ordenar por:
                          </label>
                          <select
                            className={`w-full p-2 rounded-md border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
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
                        <div>
                          <label className={`font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            Variable secundaria:
                          </label>
                          <VariablesList
                            onSelect={(variable) => setSecondaryVariable(variable)}
                            excludeVariable={selectedVariable.code}
                            isCompact={true}
                            darkMode={darkMode}
                          />
                        </div>

                        <div>
                          <label className={`font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            Tipo de Gráfico:
                          </label>
                          <select
                            className={`w-full p-2 rounded-md border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
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
                </div>
              </div>
              
              {/* Tarjeta de limpieza de variables */}
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 transition-colors duration-300`}>
                <h3 className="text-lg font-semibold mb-4">Limpieza de Datos</h3>
                <div className="space-y-4">
                  <VariableCleaningOptions
                    variable={selectedVariable.code}
                    excludedValues={excludedPrimaryValues}
                    onExcludedValuesChange={setExcludedPrimaryValues}
                    label={`Limpiar variable principal: ${selectedVariable.label}`}
                    darkMode={darkMode}
                  />

                  {analysisType === 'bivariate' && secondaryVariable && (
                    <VariableCleaningOptions
                      variable={secondaryVariable.code}
                      excludedValues={excludedSecondaryValues}
                      onExcludedValuesChange={setExcludedSecondaryValues}
                      label={`Limpiar variable secundaria: ${secondaryVariable.label}`}
                      darkMode={darkMode}
                    />
                  )}
                </div>
              </div>

              {/* Tarjeta de visualización */}
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 transition-colors duration-300`}>
                <h3 className="text-lg font-semibold mb-4">Visualización</h3>
                
                {/* Tabs para móvil */}
                <div className="md:hidden mb-5">
                  <div className={`flex rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-1`}>
                    <button
                      className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'table' ? 
                        (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 
                        (darkMode ? 'text-gray-300' : 'text-gray-600')}`}
                      onClick={() => setActiveTab('table')}
                    >
                      Tabla
                    </button>
                    <button
                      className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'chart' ? 
                        (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 
                        (darkMode ? 'text-gray-300' : 'text-gray-600')}`}
                      onClick={() => setActiveTab('chart')}
                    >
                      Gráfico
                    </button>
                  </div>
                </div>

                {/* Contenido responsive */}
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  {analysisType === 'univariate' ? (
                    <>
                      <div className={`${activeTab === 'table' ? 'block' : 'hidden'} md:block`}>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
                          <h4 className="font-medium mb-3">Distribución de Frecuencias</h4>
                          <FrequencyTable 
                            variable={selectedVariable.code} 
                            sortOrder={sortOrder} 
                            excludedValues={excludedPrimaryValues}
                            darkMode={darkMode}
                          />
                        </div>
                      </div>
                      <div className={`${activeTab === 'chart' ? 'block' : 'hidden'} md:block`}>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
                          <h4 className="font-medium mb-3">Gráfico</h4>
                          <ChartComponent 
                            variable={selectedVariable.code} 
                            chartType={chartType} 
                            sortOrder={sortOrder} 
                            excludedValues={excludedPrimaryValues}
                            darkMode={darkMode}
                          />
                        </div>
                      </div>
                    </>
                  ) : secondaryVariable ? (
                    <>
                      <div className={`${activeTab === 'table' ? 'block' : 'hidden'} md:block`}>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
                          <h4 className="font-medium mb-3">Tabla de Contingencia</h4>
                          <ContingencyTable 
                            variable1={selectedVariable.code} 
                            variable2={secondaryVariable.code} 
                            excludedValues1={excludedPrimaryValues}
                            excludedValues2={excludedSecondaryValues}
                            darkMode={darkMode}
                          />
                        </div>
                      </div>
                      <div className={`${activeTab === 'chart' ? 'block' : 'hidden'} md:block`}>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
                          <h4 className="font-medium mb-3">Gráfico Bivariado</h4>
                          <BivariateChart 
                            variable1={selectedVariable.code} 
                            variable2={secondaryVariable.code}
                            chartType={bivariateChartType}
                            excludedValues1={excludedPrimaryValues}
                            excludedValues2={excludedSecondaryValues}
                            darkMode={darkMode}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'} col-span-2 py-10`}>
                      Selecciona una variable secundaria para ver el análisis bivariado.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Tutorial modal - aparece solo cuando showTutorial es true */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-xl max-w-2xl w-full p-6 shadow-2xl`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Tutorial: Análisis de Datos CIS</h3>
              <button 
                onClick={() => setShowTutorial(false)}
                className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 mb-6 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <h4 className="font-bold mb-2">1. Seleccionar un archivo</h4>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Usa el gestor de archivos en la parte superior para seleccionar o cargar datos del CIS.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-2">2. Elegir una variable</h4>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Abre el panel lateral y selecciona la variable principal que deseas analizar.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-2">3. Configurar el análisis</h4>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Elige entre análisis univariado (una variable) o bivariado (dos variables). En el caso del bivariado, deberás seleccionar también una variable secundaria.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-2">4. Personalizar visualizaciones</h4>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ajusta el tipo de gráfico y el orden de los datos según tus necesidades.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-2">5. Limpiar datos</h4>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Usa las opciones de limpieza para excluir valores específicos del análisis.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowTutorial(false)}
                className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-5 py-2 rounded-lg font-medium transition-colors`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 