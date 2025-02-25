from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import Dict, List, Any

# Import configuration and services
try:
    from backend.config import (
        API_TITLE,
        API_DESCRIPTION,
        API_VERSION,
        CORS_ALLOWED_ORIGINS,
        CORS_ALLOWED_ORIGIN_REGEX,
        CORS_ALLOW_CREDENTIALS,
        CORS_ALLOW_METHODS,
        CORS_ALLOW_HEADERS,
        ALLOWED_EXTENSIONS,
        MAX_UPLOAD_SIZE,
        logger
    )
    from backend.services import (
        cargar_datos, 
        listar_variables, 
        obtener_datos_variable, 
        obtener_distribucion, 
        obtener_metadatos, 
        obtener_contingencia,
        list_available_files,
        get_active_data_file,
        set_active_data_file,
        upload_file,
        delete_file
    )
except ImportError:
    # Fallback for Railway deployment
    from config import (
        API_TITLE,
        API_DESCRIPTION,
        API_VERSION,
        CORS_ALLOWED_ORIGINS,
        CORS_ALLOWED_ORIGIN_REGEX,
        CORS_ALLOW_CREDENTIALS,
        CORS_ALLOW_METHODS,
        CORS_ALLOW_HEADERS,
        ALLOWED_EXTENSIONS,
        MAX_UPLOAD_SIZE,
        logger
    )
    from services import (
        cargar_datos, 
        listar_variables, 
        obtener_datos_variable, 
        obtener_distribucion, 
        obtener_metadatos, 
        obtener_contingencia,
        list_available_files,
        get_active_data_file,
        set_active_data_file,
        upload_file,
        delete_file
    )

# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_origin_regex=CORS_ALLOWED_ORIGIN_REGEX,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

# Error handler
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Error interno del servidor"}
    )

# API Routes
@app.get("/")
def leer_raiz():
    """Root endpoint that returns basic API information."""
    return {"mensaje": "API de Visualización del CIS"}

@app.get("/datos")
def obtener_datos():
    """Get all data from the dataset."""
    try:
        data = cargar_datos()
        return {"datos": data.to_dict(orient="records")}
    except Exception as e:
        logger.error(f"Error in /datos: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al cargar los datos")

@app.get("/variables")
def obtener_variables():
    """Get a list of all variables with their labels."""
    try:
        return {"variables": listar_variables()}
    except Exception as e:
        logger.error(f"Error in /variables: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al listar las variables")

@app.get("/datos/{variable}")
def obtener_datos_por_variable(variable: str):
    """Get data for a specific variable."""
    try:
        data = obtener_datos_variable(variable)
        if isinstance(data, dict) and "error" in data:
            raise HTTPException(status_code=404, detail=data["error"])
        return {"datos": data.to_dict(orient="records")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /datos/{variable}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al obtener datos para {variable}")

@app.get("/distribucion/{variable}")
def obtener_distribucion_variable(variable: str):
    """Get frequency distribution for a variable."""
    try:
        distribucion = obtener_distribucion(variable)
        if isinstance(distribucion, dict) and "error" in distribucion:
            raise HTTPException(status_code=404, detail=distribucion["error"])
        return {"distribucion": distribucion}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /distribucion/{variable}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al obtener la distribución para {variable}")

@app.get("/metadatos")
def obtener_metadatos_api():
    """Get metadata for all variables."""
    try:
        return obtener_metadatos()
    except Exception as e:
        logger.error(f"Error in /metadatos: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al obtener los metadatos")

@app.get("/contingencia/{variable1}/{variable2}")
def obtener_contingencia_variables(variable1: str, variable2: str):
    """Get contingency table for two variables."""
    try:
        result = obtener_contingencia(variable1, variable2)
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /contingencia/{variable1}/{variable2}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al obtener la tabla de contingencia para {variable1} y {variable2}")

# Nuevas rutas para gestión de archivos
@app.get("/files")
def get_available_files():
    """Get a list of available .sav files in the data directory."""
    try:
        files = list_available_files()
        active_file = get_active_data_file()
        return {
            "files": files, 
            "active_file": active_file
        }
    except Exception as e:
        logger.error(f"Error in /files: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al listar los archivos disponibles")

@app.post("/files/activate/{filename}")
def activate_file(filename: str):
    """Set the active data file to use for analysis."""
    try:
        result = set_active_data_file(filename)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /files/activate/{filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al activar el archivo {filename}")

@app.post("/files/upload")
async def upload_data_file(file: UploadFile = File(...)):
    """Upload a new .sav file."""
    try:
        # Validate file size
        file_size = file.size
        if file_size and file_size > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"El archivo es demasiado grande. El tamaño máximo permitido es {MAX_UPLOAD_SIZE / (1024 * 1024)} MB"
            )
        
        # Validate file extension
        _, file_ext = os.path.splitext(file.filename)
        if file_ext.lower() not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=415, 
                detail=f"Formato de archivo no válido. Solo se aceptan archivos con extensiones: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        contents = await file.read()
        
        # Upload file
        result = upload_file(contents, file.filename)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {str(e)}")

@app.delete("/files/{filename}")
def delete_data_file(filename: str):
    """Delete a .sav file from the data directory."""
    try:
        result = delete_file(filename)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al eliminar el archivo: {str(e)}")