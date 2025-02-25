from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import Dict, List, Any
from pydantic import BaseModel

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
        DATA_DIRECTORY,
        logger,
        get_file_friendly_names, 
        set_file_friendly_name, 
        get_file_friendly_name,
        get_file_descriptions,
        set_file_description,
        get_file_description,
        DEFAULT_FRIENDLY_NAMES,
        DEFAULT_FILE_DESCRIPTIONS,
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
        DATA_DIRECTORY,
        logger,
        get_file_friendly_names, 
        set_file_friendly_name, 
        get_file_friendly_name,
        get_file_descriptions,
        set_file_description,
        get_file_description,
        DEFAULT_FRIENDLY_NAMES,
        DEFAULT_FILE_DESCRIPTIONS,
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

# Inicialización de la aplicación
@app.on_event("startup")
async def initialize_app():
    """Initialize application data and defaults."""
    logger.info("Initializing application...")
    
    # Asegurar que los nombres amigables predeterminados estén aplicados
    friendly_names = get_file_friendly_names()
    
    # Verificar archivos predeterminados en el sistema
    files_data = list_available_files()
    available_files = [file["name"] for file in files_data]
    
    # Registrar cambios realizados
    changes_made = False
    
    # Aplicar nombres amigables predeterminados para archivos existentes
    for filename, default_name in DEFAULT_FRIENDLY_NAMES.items():
        if filename in available_files and filename not in friendly_names:
            logger.info(f"Applying default friendly name for {filename}: {default_name}")
            set_file_friendly_name(filename, default_name)
            changes_made = True
    
    # Aplicar descripciones predeterminadas
    descriptions = get_file_descriptions()
    for filename, default_desc in DEFAULT_FILE_DESCRIPTIONS.items():
        if filename in available_files and filename not in descriptions:
            logger.info(f"Applying default description for {filename}")
            set_file_description(filename, default_desc)
            changes_made = True
    
    if changes_made:
        logger.info("Default friendly names and descriptions applied successfully")
    else:
        logger.info("No changes needed for friendly names and descriptions")

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
        # File deletion is disabled to protect shared files
        logger.warning(f"File deletion attempt blocked for: {filename}")
        result = delete_file(filename)
        # The delete_file function now always returns an error
        raise HTTPException(status_code=403, detail=result["error"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete file endpoint for {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la solicitud: {str(e)}")

# Add these new models for request validation
class FileNameUpdate(BaseModel):
    friendly_name: str

class FileDescriptionUpdate(BaseModel):
    description: str

# Add these new endpoints before the end of the file

@app.get("/files/metadata")
def get_files_metadata():
    """Get all file friendly names and descriptions."""
    try:
        friendly_names = get_file_friendly_names()
        descriptions = get_file_descriptions()
        return {
            "friendly_names": friendly_names,
            "descriptions": descriptions
        }
    except Exception as e:
        logger.error(f"Error in /files/metadata: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al obtener los metadatos de archivos")

@app.post("/files/{filename}/friendly-name")
def update_file_friendly_name(filename: str, data: FileNameUpdate):
    """Update the friendly name for a file."""
    try:
        # Verify file exists
        file_path = os.path.join(DATA_DIRECTORY, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        # Update friendly name
        result = set_file_friendly_name(filename, data.friendly_name)
        if not result:
            raise HTTPException(status_code=500, detail="Error al guardar el nombre amigable")
        
        return {"success": True, "filename": filename, "friendly_name": data.friendly_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating friendly name for {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar el nombre amigable")

@app.post("/files/{filename}/description")
def update_file_description(filename: str, data: FileDescriptionUpdate):
    """Update the description for a file."""
    try:
        # Verify file exists
        file_path = os.path.join(DATA_DIRECTORY, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        # Update description
        result = set_file_description(filename, data.description)
        if not result:
            raise HTTPException(status_code=500, detail="Error al guardar la descripción")
        
        return {"success": True, "filename": filename, "description": data.description}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating description for {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar la descripción")