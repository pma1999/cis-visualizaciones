import pandas as pd
import pyreadstat
import os
import json
import traceback
from typing import Dict, List, Optional, Union, Any

# Import configuration
try:
    from backend.config import DATA_FILE, logger
except ImportError:
    # Fallback for Railway deployment
    from config import DATA_FILE, logger

def write_debug(msg: str) -> None:
    """Write debug messages to the log file."""
    logger.debug(msg)

def get_absolute_data_path() -> str:
    """Get the absolute path to the data file."""
    return os.path.abspath(DATA_FILE)

def load_dataset():
    """Load the dataset and return dataframe and metadata."""
    try:
        df, meta = pyreadstat.read_sav(DATA_FILE)
        return df, meta
    except Exception as e:
        logger.error(f"Error loading dataset: {str(e)}")
        raise

def cargar_datos() -> pd.DataFrame:
    """Load and return the complete dataset."""
    df, _ = load_dataset()
    return df

def listar_variables() -> Dict[str, str]:
    """List all variables with their labels."""
    try:
        _, meta = pyreadstat.read_sav(get_absolute_data_path())
        
        mapping = {}
        for name, label in zip(meta.column_names, meta.column_labels):
            mapping[name] = label
        return mapping
    except Exception as e:
        logger.error(f"Error listing variables: {str(e)}")
        raise

def obtener_datos_variable(variable: str) -> Union[pd.DataFrame, Dict[str, str]]:
    """Get data for a specific variable."""
    try:
        df, _ = load_dataset()
        
        if variable not in df.columns:
            logger.warning(f"Variable not found: {variable}")
            return {"error": "Variable no encontrada"}
        
        return df[[variable]].dropna()
    except Exception as e:
        logger.error(f"Error obtaining variable data: {str(e)}")
        raise

def obtener_distribucion(variable: str) -> Union[Dict[str, int], Dict[str, str]]:
    """Get the frequency distribution of a variable."""
    try:
        df, _ = load_dataset()
        
        if variable not in df.columns:
            logger.warning(f"Variable not found for distribution: {variable}")
            return {"error": "Variable no encontrada"}
        
        conteo = df[variable].value_counts().to_dict()
        return conteo
    except Exception as e:
        logger.error(f"Error obtaining distribution: {str(e)}")
        raise

def obtener_metadatos() -> Dict[str, Any]:
    """Get metadata for all variables."""
    try:
        _, meta = pyreadstat.read_sav(get_absolute_data_path())

        etiquetas_variables = meta.column_labels
        etiquetas_valores = meta.variable_value_labels

        return {
            "etiquetas_variables": etiquetas_variables,
            "etiquetas_valores": etiquetas_valores
        }
    except Exception as e:
        logger.error(f"Error obtaining metadata: {str(e)}")
        raise

def obtener_contingencia(variable1: str, variable2: str) -> Dict[str, Any]:
    """Get contingency table for two variables."""
    logger.info(f"Starting contingency analysis for variables: {variable1} and {variable2}")
    
    try:
        df, meta = load_dataset()
        
        if variable1 not in df.columns or variable2 not in df.columns:
            logger.warning(f"Variables not found. Available columns: {df.columns.tolist()}")
            return {"error": "Una o ambas variables no encontradas"}
        
        contingencia = pd.crosstab(df[variable1], df[variable2], margins=True)
        porcentajes_fila = pd.crosstab(df[variable1], df[variable2], normalize='index') * 100
        porcentajes_columna = pd.crosstab(df[variable1], df[variable2], normalize='columns') * 100
        
        etiquetas_var1 = meta.variable_value_labels.get(variable1, {})
        etiquetas_var2 = meta.variable_value_labels.get(variable2, {})
        
        resultado = {
            "datos": {
                "filas": {
                    str(idx): {
                        "etiqueta": etiquetas_var1.get(float(idx), str(idx)) if idx != "All" else "Total",
                        "valores": {
                            str(col): {
                                "frecuencia": int(contingencia.loc[idx, col]),
                                "porcentaje_fila": float(porcentajes_fila.loc[idx, col]) if idx != "All" and col != "All" else None,
                                "porcentaje_columna": float(porcentajes_columna.loc[idx, col]) if idx != "All" and col != "All" else None
                            } for col in contingencia.columns
                        }
                    } for idx in contingencia.index
                },
                "columnas": {
                    str(col): {
                        "etiqueta": etiquetas_var2.get(float(col), str(col)) if col != "All" else "Total"
                    } for col in contingencia.columns
                }
            },
            "metadatos": {
                "variable1": {
                    "codigo": variable1,
                    "etiqueta": meta.column_labels[meta.column_names.index(variable1)],
                    "total_casos": int(contingencia.loc["All", "All"])
                },
                "variable2": {
                    "codigo": variable2,
                    "etiqueta": meta.column_labels[meta.column_names.index(variable2)]
                }
            }
        }
        return resultado
        
    except Exception as e:
        logger.error(f"Error in contingency analysis: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise
