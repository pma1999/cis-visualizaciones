import { useState, useEffect } from 'react';
import { getContingencia } from '../api/cisApi';
import { generateColorScheme } from '../utils/colorUtils';

/**
 * Hook para cargar y manipular datos bivariados
 * 
 * @param {string} variable1 - Primera variable para el análisis bivariado
 * @param {string} variable2 - Segunda variable para el análisis bivariado
 * @param {string[]} excludedValues1 - Valores a excluir de la primera variable
 * @param {string[]} excludedValues2 - Valores a excluir de la segunda variable
 * @param {boolean} darkMode - Si se debe usar el modo oscuro para los colores
 * @returns {Object} Datos y funciones relacionadas con el análisis bivariado
 */
const useBivariateData = (variable1, variable2, excludedValues1 = [], excludedValues2 = [], darkMode = false) => {
  const [originalData, setOriginalData] = useState(null);
  const [contingencyData, setContingencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colorScheme, setColorScheme] = useState({});
  const [variable1Title, setVariable1Title] = useState('');
  const [variable2Title, setVariable2Title] = useState('');

  // Efecto para cargar los datos iniciales
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getContingencia(variable1, variable2);
        
        // Guardar los títulos de las variables
        if (data.metadatos) {
          setVariable1Title(data.metadatos.variable1.etiqueta || variable1);
          setVariable2Title(data.metadatos.variable2.etiqueta || variable2);
        } else {
          setVariable1Title(variable1);
          setVariable2Title(variable2);
        }
        
        setOriginalData(data); // Guardar los datos originales sin modificar
        setLoading(false);
      } catch (error) {
        console.error("Error fetching contingency data:", error);
        setLoading(false);
      }
    }

    if (variable1 && variable2) {
      fetchData();
    }
  }, [variable1, variable2]);

  // Efecto para aplicar exclusiones cuando cambian los datos originales o las exclusiones
  useEffect(() => {
    if (!originalData) return;
    
    // Crear una copia profunda de los datos originales
    const dataCopy = JSON.parse(JSON.stringify(originalData));
    
    // Aplicar exclusiones a la copia
    if (excludedValues1.length > 0 || excludedValues2.length > 0) {
      // Filtrar filas excluidas
      if (excludedValues1.length > 0) {
        excludedValues1.forEach(rowKey => {
          if (dataCopy.datos.filas[rowKey]) {
            delete dataCopy.datos.filas[rowKey];
          }
        });
      }
      
      // Filtrar columnas excluidas
      if (excludedValues2.length > 0) {
        excludedValues2.forEach(colKey => {
          if (dataCopy.datos.columnas[colKey]) {
            delete dataCopy.datos.columnas[colKey];
            
            // También eliminar esta columna de cada fila
            Object.keys(dataCopy.datos.filas).forEach(rowKey => {
              if (rowKey !== "All" && dataCopy.datos.filas[rowKey].valores[colKey]) {
                delete dataCopy.datos.filas[rowKey].valores[colKey];
              }
            });
          }
        });
      }
    }
    
    setContingencyData(dataCopy);
    
    // Generar esquema de colores
    const newColorScheme = generateColorScheme(dataCopy, darkMode);
    // Añadir una propiedad para indicar el modo oscuro
    newColorScheme.isDarkMode = darkMode;
    setColorScheme(newColorScheme);
  }, [originalData, excludedValues1, excludedValues2, darkMode]);

  /**
   * Prepara los datos para el gráfico de mapa de árbol (Treemap)
   * @param {string} viewMode - Modo de visualización (absolute o relative)
   * @returns {Array} Datos formateados para el Treemap
   */
  const prepareTreemapData = (viewMode) => {
    if (!contingencyData) return [];
    
    return Object.entries(contingencyData.datos.filas)
      .filter(([key]) => key !== "All")
      .flatMap(([key, row]) => 
        Object.entries(row.valores)
          .filter(([colKey]) => colKey !== "All")
          .map(([colKey, valor], index) => {
            // Para treemap, usamos porcentaje del total en modo relativo
            const totalValue = contingencyData.datos.filas["All"]?.valores["All"]?.frecuencia || 0;
            const percentTotal = totalValue > 0 ? (valor.frecuencia / totalValue) * 100 : 0;
            
            // Determine the value to display based on viewMode
            let displayValue;
            let sizeValue;
            
            if (viewMode === 'relative') {
              displayValue = percentTotal;
              sizeValue = percentTotal;
            } else { // 'absolute'
              displayValue = valor.frecuencia;
              sizeValue = valor.frecuencia;
            }
            
            return {
              name: contingencyData.datos.columnas[colKey].etiqueta,
              secondaryLabel: contingencyData.datos.columnas[colKey].etiqueta,
              secondaryVariable: contingencyData.metadatos.variable2.etiqueta,
              mainVariable: contingencyData.metadatos.variable1.etiqueta,
              mainValue: row.etiqueta,
              mainKey: key,
              colorIndex: index,
              size: sizeValue,
              value: displayValue,
              displayValue: displayValue,
              viewMode: viewMode,
              frecuencia: valor.frecuencia,
              percentRow: valor.porcentaje_fila,
              percentCol: valor.porcentaje_columna,
              percentTotal: percentTotal
            };
          })
      );
  };

  /**
   * Prepara los datos para el gráfico de barras apiladas
   * @param {string} viewMode - Modo de visualización (absolute o relative)
   * @returns {Array} Datos formateados para el gráfico de barras apiladas
   */
  const prepareStackedBarData = (viewMode) => {
    if (!contingencyData) return [];
    
    return Object.entries(contingencyData.datos.filas)
      .filter(([key]) => key !== "All")
      .map(([key, row]) => {
        const barData = {
          name: row.etiqueta
        };
        Object.entries(row.valores)
          .filter(([colKey]) => colKey !== "All")
          .forEach(([colKey, valor]) => {
            // Para gráfico de barras, usamos porcentaje por fila en modo relativo
            let value;
            if (viewMode === 'relative') {
              value = valor.porcentaje_fila;
            } else { // 'absolute'
              value = valor.frecuencia;
            }
            
            barData[contingencyData.datos.columnas[colKey].etiqueta] = value;
            // Store original values for tooltip
            barData[`${contingencyData.datos.columnas[colKey].etiqueta}_freq`] = valor.frecuencia;
            barData[`${contingencyData.datos.columnas[colKey].etiqueta}_row`] = valor.porcentaje_fila;
            barData[`${contingencyData.datos.columnas[colKey].etiqueta}_col`] = valor.porcentaje_columna;
          });
        return barData;
      });
  };

  // Obtener explicación del modo relativo según el tipo de gráfico
  const getRelativeModeExplanation = (chartType) => {
    if (chartType === 'treemap') {
      return 'Porcentajes del total';
    } else { // stacked
      return 'Porcentajes por fila';
    }
  };

  return {
    loading,
    colorScheme,
    variable1Title,
    variable2Title,
    prepareTreemapData,
    prepareStackedBarData,
    getRelativeModeExplanation,
    totalExcluded: excludedValues1.length + excludedValues2.length,
    hasData: !!contingencyData
  };
};

export default useBivariateData; 