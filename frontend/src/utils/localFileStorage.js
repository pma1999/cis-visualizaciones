/**
 * Local File Storage
 * Este módulo gestiona el almacenamiento local de archivos .sav usando IndexedDB
 */

const DB_NAME = 'cis_files_db';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const METADATA_STORE = 'metadata';

// Inicializar la base de datos
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error al abrir la base de datos:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Almacen para los archivos
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE);
      }
      
      // Almacen para los metadatos de los archivos
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'name' });
        metadataStore.createIndex('last_modified', 'last_modified', { unique: false });
      }
    };
  });
};

// Obtener un objeto de la base de datos
const getDBObject = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = (event) => {
      console.error(`Error al obtener ${key} de ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

// Guardar un objeto en la base de datos
const putDBObject = async (storeName, key, value) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    let request;
    
    if (key) {
      request = store.put(value, key);
    } else {
      request = store.put(value);
    }
    
    request.onsuccess = () => {
      resolve(true);
    };
    
    request.onerror = (event) => {
      console.error(`Error al guardar en ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

// Eliminar un objeto de la base de datos
const deleteDBObject = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    
    request.onsuccess = () => {
      resolve(true);
    };
    
    request.onerror = (event) => {
      console.error(`Error al eliminar ${key} de ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

// Obtener todos los objetos de un store
const getAllDBObjects = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = (event) => {
      console.error(`Error al obtener objetos de ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

// Guardar un archivo local
export const saveLocalFile = async (file) => {
  try {
    // Leer el archivo como ArrayBuffer
    const fileData = await file.arrayBuffer();
    
    // Crear metadatos del archivo
    const metadata = {
      name: file.name,
      size_kb: Math.round(file.size / 1024 * 100) / 100,
      type: file.type,
      last_modified: new Date().getTime(),
      isLocal: true,
      friendly_name: file.name // Nombre amigable por defecto igual al nombre del archivo
    };
    
    // Guardar el archivo
    await putDBObject(FILES_STORE, file.name, fileData);
    
    // Guardar los metadatos
    await putDBObject(METADATA_STORE, null, metadata);
    
    return { success: true, file: metadata };
  } catch (error) {
    console.error('Error al guardar archivo local:', error);
    throw error;
  }
};

// Obtener un archivo local
export const getLocalFile = async (filename) => {
  try {
    const fileData = await getDBObject(FILES_STORE, filename);
    if (!fileData) {
      throw new Error('Archivo no encontrado');
    }
    
    const metadata = await getDBObject(METADATA_STORE, filename);
    
    return { 
      data: fileData, 
      metadata: metadata || { name: filename } 
    };
  } catch (error) {
    console.error('Error al obtener archivo local:', error);
    throw error;
  }
};

// Listar todos los archivos locales
export const listLocalFiles = async () => {
  try {
    const metadataList = await getAllDBObjects(METADATA_STORE);
    return metadataList.map(metadata => ({
      ...metadata,
      isLocal: true
    }));
  } catch (error) {
    console.error('Error al listar archivos locales:', error);
    return [];
  }
};

// Eliminar un archivo local
export const deleteLocalFile = async (filename) => {
  try {
    await deleteDBObject(FILES_STORE, filename);
    await deleteDBObject(METADATA_STORE, filename);
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar archivo local:', error);
    throw error;
  }
};

// Actualizar metadatos de un archivo local
export const updateLocalFileMetadata = async (filename, updates) => {
  try {
    const metadata = await getDBObject(METADATA_STORE, filename);
    if (!metadata) {
      throw new Error('Archivo no encontrado');
    }
    
    const updatedMetadata = {
      ...metadata,
      ...updates,
      last_modified: updates.last_modified || new Date().getTime()
    };
    
    await putDBObject(METADATA_STORE, null, updatedMetadata);
    return { success: true, metadata: updatedMetadata };
  } catch (error) {
    console.error('Error al actualizar metadatos:', error);
    throw error;
  }
}; 