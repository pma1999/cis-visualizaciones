"""
Configuration settings for the CIS Visualization API backend.
"""
import os
import logging
from logging.handlers import RotatingFileHandler

# Environment configuration
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"

# Data settings
DATA_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DATA_FILE = os.path.join(DATA_DIRECTORY, "3492.sav")

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
