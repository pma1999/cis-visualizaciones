import pandas as pd
import pyreadstat
import os
import json
import traceback
from typing import Dict, List, Optional, Union, Any
import shutil

# Import configuration
try:
    from backend.config import DATA_FILE, DATA_DIRECTORY, ACTIVE_DATA_FILE, DEFAULT_DATA_FILE, ALLOWED_EXTENSIONS, logger
except ImportError:
    # Fallback for Railway deployment
    from config import DATA_FILE, DATA_DIRECTORY, ACTIVE_DATA_FILE, DEFAULT_DATA_FILE, ALLOWED_EXTENSIONS, logger

def write_debug(msg: str) -> None:
    """Write debug messages to the log file."""
    logger.debug(msg)

def get_absolute_data_path() -> str:
    """Get the absolute path to the data file."""
    return os.path.abspath(DATA_FILE)

def get_active_data_file() -> str:
    """Get the name of the currently active data file."""
    return ACTIVE_DATA_FILE

def set_active_data_file(filename: str) -> Dict[str, str]:
    """Set the active data file to use for analysis.
    
    Args:
        filename: Name of the .sav file in the data directory
        
    Returns:
        Dict with status message
    """
    # Validate file exists in data directory
    file_path = os.path.join(DATA_DIRECTORY, filename)
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return {"error": "Archivo no encontrado"}
    
    # Validate file extension
    _, file_ext = os.path.splitext(filename)
    if file_ext.lower() not in ALLOWED_EXTENSIONS:
        logger.error(f"Invalid file extension: {file_ext}")
        return {"error": "Formato de archivo no válido"}
    
    # Update global variables
    global DATA_FILE
    DATA_FILE = file_path
    
    # Update global
    global ACTIVE_DATA_FILE
    ACTIVE_DATA_FILE = filename
    
    # For Railway we use environment variables
    os.environ["ACTIVE_DATA_FILE"] = filename
    
    # Store in persistent configuration
    try:
        from config import save_persistent_config
        config = {"active_file": filename}
        save_result = save_persistent_config(config)
        if not save_result:
            logger.warning("No se pudo guardar la configuración persistente")
    except ImportError:
        logger.warning("No se pudo importar save_persistent_config")
    
    logger.info(f"Active data file set to: {filename}")
    return {"success": True, "file": filename}

def list_available_files() -> List[Dict[str, Any]]:
    """List all available .sav files in the data directory."""
    files = []
    
    try:
        for filename in os.listdir(DATA_DIRECTORY):
            file_path = os.path.join(DATA_DIRECTORY, filename)
            _, file_ext = os.path.splitext(filename)
            
            # Only include .sav files
            if os.path.isfile(file_path) and file_ext.lower() in ALLOWED_EXTENSIONS:
                # Get file size and last modification time
                file_stat = os.stat(file_path)
                size_kb = file_stat.st_size / 1024  # Convert to KB
                
                # Add file info to list
                files.append({
                    "name": filename,
                    "size_kb": round(size_kb, 2),
                    "last_modified": file_stat.st_mtime,
                    "active": filename == get_active_data_file()
                })
                
        return sorted(files, key=lambda x: x["name"])
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise

def upload_file(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Save an uploaded file to the data directory.
    
    Args:
        file_content: The binary content of the uploaded file
        filename: The name to save the file as
        
    Returns:
        Dict with status message
    """
    try:
        # Validate file extension
        _, file_ext = os.path.splitext(filename)
        if file_ext.lower() not in ALLOWED_EXTENSIONS:
            logger.error(f"Invalid file extension: {file_ext}")
            return {"error": "Formato de archivo no válido. Solo se aceptan archivos .sav"}
        
        # Save file to data directory
        file_path = os.path.join(DATA_DIRECTORY, filename)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"File uploaded successfully: {filename}")
        
        # Try to validate it's a valid .sav file
        try:
            pyreadstat.read_sav(file_path)
        except Exception as e:
            # If validation fails, delete the file and return error
            os.remove(file_path)
            logger.error(f"Invalid .sav file: {str(e)}")
            return {"error": "El archivo no es un archivo SPSS (.sav) válido"}
        
        return {
            "success": True, 
            "file": filename,
            "message": "Archivo subido correctamente"
        }
        
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return {"error": f"Error al subir el archivo: {str(e)}"}

def delete_file(filename: str) -> Dict[str, Any]:
    """Delete a file from the data directory.
    
    Args:
        filename: Name of the file to delete
        
    Returns:
        Dict with status message
    """
    try:
        # Don't allow deleting the default file
        if filename == DEFAULT_DATA_FILE:
            return {"error": "No se puede eliminar el archivo por defecto"}
        
        # Don't allow deleting the active file
        if filename == get_active_data_file():
            return {"error": "No se puede eliminar el archivo activo. Cambie a otro archivo primero."}
        
        file_path = os.path.join(DATA_DIRECTORY, filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return {"error": "Archivo no encontrado"}
        
        # Delete the file
        os.remove(file_path)
        
        logger.info(f"File deleted successfully: {filename}")
        return {
            "success": True,
            "message": "Archivo eliminado correctamente"
        }
        
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        return {"error": f"Error al eliminar el archivo: {str(e)}"}

def load_dataset():
    """Load the dataset and return dataframe and metadata."""
    try:
        # Ensure we're using the current DATA_FILE
        current_data_file = get_absolute_data_path()
        df, meta = pyreadstat.read_sav(current_data_file)
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
