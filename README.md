# Visualizador de Datos CIS

![Estado](https://img.shields.io/badge/estado-desarrollo-green)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)
![Versión](https://img.shields.io/badge/versión-1.0.0-orange)

Una aplicación web moderna para explorar, analizar y visualizar datos sociológicos del Centro de Investigaciones Sociológicas (CIS) de España.

![Captura de pantalla de la aplicación](frontend\public\assets\screenshot.png)

## 🔍 Demo en vivo

Puedes probar una versión en vivo de la aplicación aquí: [https://cis-visualizaciones.vercel.app/](https://cis-visualizaciones.vercel.app/)

## 🌟 Características

- **Análisis univariado y bivariado**: Estudia una variable o examina relaciones entre dos variables.
- **Visualizaciones interactivas**: Gráficos dinámicos de barras, líneas, tarta, mapas de árbol y barras apiladas.
- **Tablas de frecuencia y contingencia**: Visualiza distribuciones y relaciones entre variables con datos precisos.
- **Gestión de archivos de datos**: Carga, guarda y gestiona tus propios archivos de datos SPSS (.sav).
- **Almacenamiento local**: Trabaja con archivos localmente sin necesidad de servidor en línea.
- **Limpieza de datos**: Excluye valores específicos del análisis para resultados más precisos.
- **Modo oscuro/claro**: Interfaz adaptable a tus preferencias visuales.
- **Diseño responsivo**: Funciona perfectamente en dispositivos móviles, tablets y escritorio.

## 🚀 Tecnologías

### Frontend
- **React**: Biblioteca JavaScript para construir interfaces de usuario
- **Vite**: Entorno de desarrollo ultrarrápido
- **Tailwind CSS**: Framework CSS para diseño moderno y responsivo
- **Chart.js y Recharts**: Bibliotecas para visualizaciones de datos
- **React Router**: Navegación fluida entre componentes

### Backend
- **FastAPI**: Framework web de Python de alto rendimiento
- **Pandas**: Análisis de datos y manipulación
- **Pyreadstat**: Lectura de archivos SPSS (.sav)
- **Uvicorn**: Servidor ASGI para servir la API

## 🛠️ Instalación

### Requisitos previos
- Python 3.8 o superior
- Node.js 18.x o superior
- npm o yarn

### Configuración del Backend

1. Clona el repositorio:
   ```bash
   git clone https://github.com/pma1999/cis-visualizaciones.git
   cd cis-visualizaciones
   ```

2. Crea un entorno virtual y actívalo:
   ```bash
   python -m venv env
   # En Windows:
   env\Scripts\activate
   # En macOS/Linux:
   source env/bin/activate
   ```

3. Instala las dependencias:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Configura las variables de entorno:
   ```bash
   cp backend/.env.example backend/.env
   # Edita el archivo .env según tus necesidades
   ```

5. Inicia el servidor de desarrollo:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

### Configuración del Frontend

1. En otra terminal, navega a la carpeta del frontend:
   ```bash
   cd cis-visualizaciones/frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   # o
   yarn install
   ```

3. Configura las variables de entorno:
   ```bash
   cp frontend/.env.example frontend/.env
   # Edita el archivo .env según tus necesidades
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   yarn dev
   ```

5. Abre tu navegador en la dirección indicada (normalmente http://localhost:5173)

## 📊 Uso

### Carga de datos
1. Utiliza el gestor de archivos en la parte superior para cargar un nuevo archivo .sav o seleccionar uno existente.
2. La aplicación soporta archivos en formato SPSS (.sav).

### Análisis Univariado
1. Selecciona una variable del panel lateral.
2. Elige el tipo de gráfico (barras, líneas, tarta).
3. Ajusta el orden (por código o frecuencia).
4. Opcionalmente, excluye valores específicos para un análisis más limpio.

### Análisis Bivariado
1. Selecciona una variable principal.
2. Cambia el tipo de análisis a "Bivariado".
3. Selecciona una variable secundaria.
4. Explora la tabla de contingencia y las visualizaciones.

### Limpieza de Datos
- Usa las opciones de limpieza para excluir categorías específicas.
- Los cambios se reflejan inmediatamente en las visualizaciones y tablas.

## 🚀 Despliegue

Para instrucciones detalladas sobre cómo desplegar este proyecto en diferentes plataformas, consulta el archivo [DEPLOYMENT.md](DEPLOYMENT.md).

## 📋 Estructura del Proyecto

```
cis-visualizaciones/
├── backend/                   # Servidor API
│   ├── config.py              # Configuración y variables globales
│   ├── data/                  # Directorio para archivos .sav
│   ├── main.py                # Puntos de entrada de la API
│   ├── models.py              # Modelos de datos
│   ├── requirements.txt       # Dependencias de Python
│   └── services.py            # Lógica de negocio
├── frontend/                  # Aplicación React
│   ├── public/                # Archivos estáticos
│   ├── src/                   
│   │   ├── api/               # Cliente API
│   │   ├── components/        # Componentes React
│   │   ├── utils/             # Utilidades
│   │   ├── App.jsx            # Componente raíz
│   │   └── main.jsx           # Punto de entrada
│   ├── package.json           # Dependencias de Node.js
│   └── vite.config.js         # Configuración de Vite
├── DEPLOYMENT.md              # Guía detallada de despliegue
├── vercel.example.json        # Ejemplo de configuración para Vercel
├── railway.example.json       # Ejemplo de configuración para Railway
└── README.md                  # Este archivo
```

## 🔒 Almacenamiento Local

La aplicación puede funcionar completamente con almacenamiento local:

- Los archivos .sav se pueden guardar en el navegador usando IndexedDB.
- Esta característica es útil cuando no se puede conectar al servidor o durante el desarrollo.
- Los datos nunca salen de tu navegador, lo que garantiza privacidad.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Haz un fork del proyecto
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - vea el archivo LICENSE para más detalles.

## 👏 Reconocimientos

- Centro de Investigaciones Sociológicas (CIS) por proveer los datos.
- Comunidad de código abierto de Python y JavaScript por sus excelentes herramientas. 