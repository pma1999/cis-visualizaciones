# CIS Visualizaciones

Una aplicación web para visualizar y analizar datos del Centro de Investigaciones Sociológicas (CIS).

## Descripción

Este proyecto proporciona herramientas para visualizar y analizar datos de encuestas del CIS. Permite explorar variables, crear tablas de frecuencias, generar gráficos y realizar análisis bivariados.

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

- **Backend**: API REST desarrollada con FastAPI para procesar y servir los datos.
- **Frontend**: Aplicación web desarrollada con React para visualizar los datos.

## Requisitos

### Backend
- Python 3.8+
- FastAPI
- Pandas
- Pyreadstat
- Uvicorn

### Frontend
- Node.js 14+
- React 18
- Vite
- React Router
- MUI (Material-UI)
- Recharts

## Instalación

### Backend

1. Navega al directorio del backend:
   ```
   cd backend
   ```

2. Crea un entorno virtual:
   ```
   python -m venv env
   ```

3. Activa el entorno virtual:
   - Windows: `env\Scripts\activate`
   - Linux/Mac: `source env/bin/activate`

4. Instala las dependencias:
   ```
   pip install -r requirements.txt
   ```

5. Inicia el servidor:
   ```
   uvicorn main:app --reload
   ```

### Frontend

1. Navega al directorio del frontend:
   ```
   cd frontend
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```
   npm run dev
   ```

## Uso

1. Accede a la aplicación web en `http://localhost:5173/`
2. Selecciona las variables que deseas analizar
3. Explora los diferentes tipos de visualizaciones disponibles

## API

El backend proporciona los siguientes endpoints:

- `GET /`: Información básica de la API
- `GET /datos`: Obtener todos los datos
- `GET /variables`: Listar todas las variables disponibles
- `GET /datos/{variable}`: Obtener datos para una variable específica
- `GET /distribucion/{variable}`: Obtener distribución de frecuencias para una variable
- `GET /metadatos`: Obtener metadatos de las variables
- `GET /contingencia/{variable1}/{variable2}`: Obtener tabla de contingencia para dos variables

## Despliegue

El proyecto está configurado para ser desplegado en:

- Backend: Railway
- Frontend: Vercel

## Licencia

Este proyecto está bajo licencia MIT.

## Autores

- Equipo de desarrollo del proyecto CIS Visualizaciones 