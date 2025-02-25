import { useState, useEffect } from 'react';
import { getAvailableFiles, activateFile, uploadFile, deleteFile } from '../api/cisApi';
import { fileChangeEvent } from './VariablesList';
import { useFiles } from '../contexts/FileContext';

export default function FileManager({ onFileChange }) {
  // Usar el contexto para el estado de archivos
  const { 
    files, 
    activeFile, 
    isLoading: isContextLoading, 
    loadFiles, 
    activateFile: contextActivateFile 
  } = useFiles();
  
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [processingFile, setProcessingFile] = useState(null);
  const [displayedActiveFile, setDisplayedActiveFile] = useState('');

  // Actualizar el archivo mostrado cuando cambia el archivo activo en el contexto
  useEffect(() => {
    setDisplayedActiveFile(activeFile);
  }, [activeFile]);

  // Efecto para cargar archivos iniciales y configurar sincronización
  useEffect(() => {
    loadFiles();
    
    // Sincronizar al abrir/cerrar el diálogo
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const handleActivateFile = async (filename) => {
    // Evitar activar el mismo archivo
    if (filename === activeFile) {
      showNotification('Este archivo ya está activo');
      return;
    }

    try {
      setProcessingFile(filename);
      
      // Usar la función del contexto
      const result = await contextActivateFile(filename);
      
      if (result.success) {
        showNotification(result.message);
        
        // Forzar actualización del archivo mostrado inmediatamente
        setDisplayedActiveFile(result.activeFile);
        
        // Cerrar el diálogo después de activar
        setIsOpen(false);
        
        // Emitir evento de cambio de archivo
        fileChangeEvent.dispatchEvent(new CustomEvent('fileChange', { detail: result.activeFile }));
        
        // Notificar al componente padre
        if (onFileChange) {
          onFileChange(result.activeFile);
        }
        
        // Forzar recarga de archivos
        setTimeout(() => loadFiles(), 500);
      } else {
        setError(`Error al activar el archivo: ${result.message}`);
      }
    } catch (err) {
      setError(`Error al activar el archivo: ${err.message}`);
    } finally {
      setProcessingFile(null);
    }
  };

  const handleUploadFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input
    event.target.value = null;

    // Validate file extension
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'sav') {
      setError('Solo se aceptan archivos con formato .sav');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      await uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reload files list
      await loadFiles();
      
      setIsUploading(false);
      showNotification('Archivo subido correctamente');
    } catch (err) {
      setIsUploading(false);
      setError(`Error al subir el archivo: ${err.message}`);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!confirm(`¿Estás seguro que deseas eliminar el archivo '${filename}'?`)) {
      return;
    }

    try {
      await deleteFile(filename);
      
      // Reload files list
      await loadFiles();
      
      showNotification('Archivo eliminado correctamente');
    } catch (err) {
      setError(`Error al eliminar el archivo: ${err.message}`);
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatSize = (sizeKB) => {
    return sizeKB < 1024 
      ? `${sizeKB.toFixed(1)} KB` 
      : `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  const toggleOpen = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Si estamos abriendo el diálogo, refrescar la lista de archivos
    if (newIsOpen) {
      loadFiles();
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={toggleOpen}
        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title={`Archivo activo: ${activeFile || 'Ninguno'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
          <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
        </svg>
        {displayedActiveFile ? (
          <span className="truncate max-w-[150px] inline-block">
            Archivo: {displayedActiveFile}
          </span>
        ) : (
          'Seleccionar archivo'
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-96 bg-white rounded-md shadow-lg z-50 border border-gray-200">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Gestión de archivos</h3>
              <button 
                onClick={toggleOpen}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {notification && (
              <div className="mb-4 p-2 bg-green-100 text-green-800 rounded-md">
                {notification}
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md">
                {error}
                <button 
                  className="float-right text-red-600 hover:text-red-800" 
                  onClick={() => setError(null)}
                >
                  ×
                </button>
              </div>
            )}
            
            {/* Información adicional - archivo activo actualmente */}
            <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-sm text-blue-800">
                Archivo activo actual: <strong>{activeFile || 'Ninguno'}</strong>
              </p>
            </div>
            
            <div className="mb-4">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".sav"
                onChange={handleUploadFile}
              />
              <label
                htmlFor="file-upload"
                className="flex justify-center items-center p-4 border-2 border-blue-300 border-dashed rounded-md cursor-pointer bg-blue-50 hover:bg-blue-100 transition"
              >
                <div className="space-y-1 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mx-auto h-12 w-12 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-blue-600">
                    Clic para subir o arrastrar y soltar
                  </p>
                  <p className="text-xs text-gray-500">
                    Archivo SPSS (.sav)
                  </p>
                </div>
              </label>
              
              {isUploading && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 text-center">
                    {uploadProgress < 100 ? 'Subiendo...' : 'Procesando archivo...'}
                  </p>
                </div>
              )}
            </div>
            
            {isContextLoading && !isUploading ? (
              <div className="py-4 text-center text-gray-600">
                Cargando archivos...
              </div>
            ) : (
              <div className="overflow-hidden overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ARCHIVO
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TAMAÑO
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ACCIONES
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-center text-sm text-gray-500">
                          No hay archivos disponibles
                        </td>
                      </tr>
                    ) : (
                      files.map((file) => (
                        <tr key={file.name} className={activeFile === file.name ? 'bg-blue-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {file.name}
                            {activeFile === file.name && (
                              <span className="ml-2 text-xs font-medium text-blue-600">
                                Activo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatSize(file.size_kb)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {activeFile !== file.name ? (
                              <button
                                onClick={() => handleActivateFile(file.name)}
                                disabled={processingFile === file.name}
                                className={`text-blue-600 hover:text-blue-900 ${
                                  processingFile === file.name ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {processingFile === file.name ? 'Activando...' : 'Activar'}
                              </button>
                            ) : (
                              <span className="text-gray-400">Activo</span>
                            )}
                            {activeFile !== file.name && (
                              <>
                                <span className="text-gray-300 mx-1">|</span>
                                <button
                                  onClick={() => handleDeleteFile(file.name)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 