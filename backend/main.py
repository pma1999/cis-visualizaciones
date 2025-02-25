from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Intentar importar desde la raíz primero (caso local)
try:
    from backend.services import cargar_datos, listar_variables, obtener_datos_variable, obtener_distribucion, obtener_metadatos, obtener_contingencia
except ImportError:
    # Si falla, importar directamente (caso Railway)
    from services import cargar_datos, listar_variables, obtener_datos_variable, obtener_distribucion, obtener_metadatos, obtener_contingencia

app = FastAPI()

# Middleware de CORS - Permitir cualquier dominio de Vercel y Railway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir cualquier origen temporalmente
    allow_origin_regex="https://.*vercel.app",  # Permitir cualquier subdominio de Vercel
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permitir todos los headers
)


@app.get("/")
def leer_raiz():
    return {"mensaje": "API de Visualización del CIS"}

@app.get("/datos")
def obtener_datos():
    data = cargar_datos()
    return {"datos": data.to_dict(orient="records")}

@app.get("/variables")
def obtener_variables():
    return {"variables": listar_variables()}

@app.get("/datos/{variable}")
def obtener_datos(variable: str):
    data = obtener_datos_variable(variable)
    return {"datos": data.to_dict(orient="records")}

@app.get("/distribucion/{variable}")
def obtener_distribucion_variable(variable: str):
    distribucion = obtener_distribucion(variable)
    return {"distribucion": distribucion}

@app.get("/metadatos")
def obtener_metadatos_api():
    return obtener_metadatos()

@app.get("/contingencia/{variable1}/{variable2}")
def obtener_contingencia_variables(variable1: str, variable2: str):
    return obtener_contingencia(variable1, variable2)