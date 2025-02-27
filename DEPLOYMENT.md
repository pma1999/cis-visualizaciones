# Guía de Despliegue

Esta guía detalla las opciones para desplegar el proyecto Visualizador de Datos CIS en diferentes entornos.

## 📋 Índice
- [Opciones de Despliegue](#opciones-de-despliegue)
- [Despliegue Local](#despliegue-local)
- [Despliegue en Vercel (Frontend)](#despliegue-en-vercel-frontend)
- [Despliegue en Railway (Backend)](#despliegue-en-railway-backend)
- [Despliegue en Otras Plataformas](#despliegue-en-otras-plataformas)
- [Variables de Entorno](#variables-de-entorno)
- [Resolución de Problemas](#resolución-de-problemas)

## Opciones de Despliegue

El proyecto consiste en dos partes que pueden desplegarse por separado:

1. **Frontend**: Aplicación React/Vite que proporciona la interfaz de usuario
2. **Backend**: API FastAPI que procesa los datos

Puedes elegir diferentes configuraciones de despliegue:

- **Solo Frontend con almacenamiento local**: El frontend puede funcionar independientemente usando IndexedDB para almacenar archivos .sav
- **Frontend + Backend**: Configuración completa que permite aprovechar todas las funcionalidades

## Despliegue Local

### Backend

1. Configura las variables de entorno:
   ```bash
   cp backend/.env.example backend/.env
   # Edita el archivo .env según tus necesidades
   ```

2. Instala las dependencias e inicia el servidor:
   ```bash
   pip install -r backend/requirements.txt
   cd backend
   uvicorn main:app --reload
   ```

### Frontend

1. Configura las variables de entorno:
   ```bash
   cp frontend/.env.example frontend/.env
   # Edita el archivo .env según tus necesidades
   ```

2. Instala las dependencias e inicia el servidor de desarrollo:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Despliegue en Vercel (Frontend)

1. Instala la CLI de Vercel si no la tienes:
   ```bash
   npm install -g vercel
   ```

2. Crea tu archivo de configuración:
   ```bash
   cp vercel.example.json vercel.json
   # Edita vercel.json según tus necesidades
   ```

3. Despliega desde la CLI:
   ```bash
   vercel
   ```

Alternativamente, puedes configurar un despliegue automático desde GitHub:

1. Haz fork del repositorio en tu cuenta de GitHub
2. Inicia sesión en [Vercel](https://vercel.com)
3. Crea un nuevo proyecto e importa tu repositorio
4. Configura:
   - **Framework preset**: Vite
   - **Root directory**: frontend
   - **Build Command**: npm run build
   - **Output Directory**: dist
5. Añade las variables de entorno necesarias (ver [Variables de Entorno](#variables-de-entorno))
6. Haz clic en "Deploy"

## Despliegue en Railway (Backend)

1. Instala la CLI de Railway:
   ```bash
   npm install -g @railway/cli
   ```

2. Prepara la configuración:
   ```bash
   cp railway.example.json railway.json
   # Edita railway.json según tus necesidades
   ```

3. Inicia sesión y despliega:
   ```bash
   railway login
   railway up
   ```

Alternativamente, desde la interfaz web:

1. Inicia sesión en [Railway](https://railway.app)
2. Crea un nuevo proyecto e importa tu repositorio
3. Configura el servicio:
   - **Comando de inicio**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Añade las variables de entorno necesarias
5. Configura el dominio personalizado si lo deseas

## Despliegue en Otras Plataformas

### Heroku

Para el backend:
```bash
heroku create mi-cis-backend
git push heroku main
```

### DigitalOcean App Platform

Puedes crear un nuevo servicio y seleccionar tu repositorio, configurando los comandos de construcción y despliegue según la documentación proporcionada aquí.

### Docker

En la raíz del proyecto hay archivos Dockerfile para facilitar la containerización.

## Variables de Entorno

### Variables Críticas del Frontend

- `VITE_API_URL`: URL del backend, ej: "https://mi-backend.railway.app"

### Variables Críticas del Backend

- `CORS_ALLOWED_ORIGINS`: Listado de orígenes permitidos separados por comas, ej: "https://mi-frontend.vercel.app"
- `PORT`: Puerto en el que se ejecutará el servidor (normalmente proporcionado por la plataforma)

Consulta los archivos `.env.example` para ver todas las variables disponibles.

## Resolución de Problemas

### Errores CORS

Si tienes errores CORS:
1. Verifica que `CORS_ALLOWED_ORIGINS` en el backend incluye la URL de tu frontend
2. Usa el modo de almacenamiento local si no puedes resolver los problemas CORS

### Problemas de Despliegue en Railway

Railway requiere que la aplicación responda en el puerto especificado por la variable `PORT`. Asegúrate de configurar tu aplicación para escuchar en `$PORT` en el comando de inicio.

---

Si tienes problemas o preguntas sobre el despliegue, por favor abre un issue en el repositorio. 