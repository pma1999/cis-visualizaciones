from fastapi import FastAPI, HTTPException, Depends
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
        logger
    )
    from backend.services import (
        cargar_datos, 
        listar_variables, 
        obtener_datos_variable, 
        obtener_distribucion, 
        obtener_metadatos, 
        obtener_contingencia
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
        logger
    )
    from services import (
        cargar_datos, 
        listar_variables, 
        obtener_datos_variable, 
        obtener_distribucion, 
        obtener_metadatos, 
        obtener_contingencia
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