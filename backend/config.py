"""
Configuration settings for the CIS Visualization API backend.
"""
import os
import logging
import json
from logging.handlers import RotatingFileHandler

# Environment configuration
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"

# Data settings
DATA_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
# Archivo de configuración persistente
CONFIG_FILE = os.path.join(DATA_DIRECTORY, "config.json")

# Función para leer la configuración persistente
def get_persistent_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            # Error silencioso en producción
            return {}
    return {}

# Función para guardar la configuración persistente
def save_persistent_config(config):
    try:
        # Asegurar que el directorio existe
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
        return True
    except Exception:
        # Error silencioso en producción
        return False

# Inicializar config o usar defaults
persistent_config = get_persistent_config()

# Archivo por defecto (se podrá cambiar dinámicamente)
DEFAULT_DATA_FILE = "3492.sav"
ACTIVE_DATA_FILE = persistent_config.get("active_file") or os.getenv("ACTIVE_DATA_FILE", DEFAULT_DATA_FILE)
DATA_FILE = os.path.join(DATA_DIRECTORY, ACTIVE_DATA_FILE)

# Guardar configuración inicial
if "active_file" not in persistent_config:
    save_persistent_config({"active_file": ACTIVE_DATA_FILE})

# Upload settings
ALLOWED_EXTENSIONS = [".sav"]
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB

# API settings
API_TITLE = "Visualización del CIS API"
API_DESCRIPTION = "API para visualización de datos del Centro de Investigaciones Sociológicas"
API_VERSION = "1.0.0"

# CORS settings
CORS_ALLOWED_ORIGINS = ["*"]  # For production, this should be restricted
CORS_ALLOWED_ORIGIN_REGEX = r"https://.*vercel\.app"
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# Logging configuration
LOG_LEVEL = logging.DEBUG if DEBUG else logging.INFO
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug.log")
LOG_MAX_SIZE = 10 * 1024 * 1024  # 10 MB
LOG_BACKUP_COUNT = 3

# Cache settings
CACHE_ENABLED = True
CACHE_TTL = 300  # 5 minutes in seconds

# Setup logging
def setup_logging():
    """Configure logging for the application."""
    logger = logging.getLogger("cis_api")
    logger.setLevel(LOG_LEVEL)
    
    # Create formatter
    formatter = logging.Formatter(LOG_FORMAT)
    
    # File handler
    file_handler = RotatingFileHandler(
        LOG_FILE, 
        maxBytes=LOG_MAX_SIZE, 
        backupCount=LOG_BACKUP_COUNT
    )
    file_handler.setFormatter(formatter)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    # Add handlers
    logger.addHandler(file_handler)
    if DEBUG:
        logger.addHandler(console_handler)
    
    return logger

# Initialize logger
logger = setup_logging()
