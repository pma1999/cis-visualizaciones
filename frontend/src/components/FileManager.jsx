import { useState, useEffect, useRef } from 'react';
import { getAvailableFiles, activateFile, uploadFile, deleteLocalFile } from '../api/cisApi';
import { fileChangeEvent } from './VariablesList';
import { useFiles } from '../contexts/FileContext';

export default function FileManager({ onFileChange }) {
  // Usar el contexto para el estado de archivos
  const { 
    files, 
    activeFile, 
    isLoading: isContextLoading, 
    loadFiles, 
    activateFile: contextActivateFile,
    getFileFriendlyName,
    getFileDescription,
    updateUserFriendlyName,
    updateUserDescription
  } = useFiles();
  
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [processingFile, setProcessingFile] = useState(null);
  const [displayedActiveFile, setDisplayedActiveFile] = useState('');
  const [editingFile, setEditingFile] = useState(null);
  const [editFriendlyName, setEditFriendlyName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const editNameInputRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 'auto', bottom: 'auto' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Actualizar el archivo mostrado cuando cambia el archivo activo en el contexto
  useEffect(() => {
    if (activeFile) {
      const friendlyName = getFileFriendlyName(activeFile);
      setDisplayedActiveFile(friendlyName || activeFile);
    } else {
      setDisplayedActiveFile('');
    }
  }, [activeFile, files, getFileFriendlyName]);

  // Efecto para cargar archivos iniciales y configurar sincronización
  useEffect(() => {
    // Cargar archivos solo cuando:
    // 1. El componente se monta inicialmente
    // 2. El diálogo se abre
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]); // Sólo dependencia es isOpen
  
  // Focus input when editing starts
  useEffect(() => {
    if (editingFile && editNameInputRef.current) {
      editNameInputRef.current.focus();
    }
  }, [editingFile]);

  // Add an useEffect hook to handle outside clicks for mobile dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll('.file-action-dropdown');
      
      dropdowns.forEach(dropdown => {
        // Check if the click was outside the dropdown and its toggle button
        const toggleButton = dropdown.previousElementSibling;
        if (!dropdown.contains(event.target) && !toggleButton.contains(event.target)) {
          dropdown.classList.add('hidden');
        }
      });
    };
    
    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutside);
    
    // Remove event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleActivateFile = async (filename) => {
    if (isContextLoading || isUploading) return;
    
    try {
      setProcessingFile(filename);
      
      // Determinar si el archivo es local
      const fileObj = files.find(f => f.name === filename);
      const isLocalFile = fileObj ? !!fileObj.isLocal : false;
      
      // Activate the file (either local or remote)
      const result = await contextActivateFile(filename, isLocalFile);
      
      if (result.success) {
        // Close the dropdown
        setIsOpen(false);
        
        // Trigger the onFileChange callback
        if (onFileChange) {
          // Add isLocal flag to the callback to inform parent component
          onFileChange(filename, isLocalFile);
        }
        
        // Trigger custom event for components listening to file changes
        fileChangeEvent.dispatchEvent(new CustomEvent('fileChange', { detail: filename }));
      } else {
        setError(result.error || 'Error al activar el archivo');
      }
    } catch (error) {
      setError(`Error al activar el archivo: ${error.message}`);
    } finally {
      setProcessingFile(null);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!filename || isContextLoading || isUploading) return;
    
    // Solo se permite eliminar archivos locales
    const fileObj = files.find(f => f.name === filename);
    if (!fileObj || !fileObj.isLocal) {
      setError('Solo se pueden eliminar archivos locales');
      return;
    }
    
    // Confirmación de eliminación
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el archivo "${fileObj.friendly_name || filename}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      setProcessingFile(filename);
      
      // Si es el archivo activo, primero hay que desactivarlo
      if (activeFile === filename) {
        setError('No puedes eliminar el archivo actualmente activo. Por favor, activa otro archivo primero.');
        setProcessingFile(null);
        return;
      }
      
      // Eliminar archivo local
      await deleteLocalFile(filename);
      
      // Recargar lista de archivos
      await loadFiles();
      
      showNotification('Archivo eliminado correctamente');
    } catch (error) {
      setError(`Error al eliminar el archivo: ${error.message}`);
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

      // Utilizar uploadFile con saveLocally=true para guardar localmente
      await uploadFile(file, true);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reload files list
      await loadFiles();
      
      setIsUploading(false);
      showNotification('Archivo subido correctamente (almacenado localmente)');
      
      // Show prompt to add friendly name
      const uploadedFilename = file.name;
      startEditingFriendlyName(uploadedFilename);
    } catch (err) {
      setIsUploading(false);
      setError(`Error al subir el archivo: ${err.message}`);
    }
  };

  const startEditingFriendlyName = (filename) => {
    if (filename) {
      setEditingFile(filename);
      // Usar el nombre amigable personalizado si existe
      setEditFriendlyName(getFileFriendlyName(filename));
      // Usar la descripción personalizada si existe
      setEditDescription(getFileDescription(filename) || '');
    }
  };
  
  const cancelEditing = () => {
    setEditingFile(null);
    setEditFriendlyName('');
    setEditDescription('');
  };
  
  const saveFriendlyName = async () => {
    if (!editingFile || !editFriendlyName.trim()) {
      cancelEditing();
      return;
    }

    try {
      setIsSaving(true);
      
      // Determinar si el archivo es local
      const fileObj = files.find(f => f.name === editingFile);
      const isLocalFile = fileObj ? !!fileObj.isLocal : false;
      
      // Update the friendly name
      await updateUserFriendlyName(editingFile, editFriendlyName.trim(), isLocalFile);

      // If a description was provided, update it too
      if (editDescription.trim()) {
        await updateUserDescription(editingFile, editDescription.trim(), isLocalFile);
      }

      // Reload files list
      await loadFiles();
      
      cancelEditing();
      showNotification('Nombre y descripción actualizados');
    } catch (error) {
      setError(`Error al guardar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const viewFileInfo = (filename) => {
    if (filename) {
      setEditingFile(filename);
      // Usar el nombre amigable personalizado si existe
      setEditFriendlyName(getFileFriendlyName(filename));
      // Usar la descripción personalizada si existe
      setEditDescription(getFileDescription(filename) || '');
      setShowInfoModal(true);
    }
  };
  
  const closeInfoModal = () => {
    setShowInfoModal(false);
    cancelEditing();
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
      
      // Calculate optimal position for the modal on mobile
      setTimeout(() => {
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY;
        const buttonPos = document.getElementById('file-manager-toggle-btn')?.getBoundingClientRect();
        
        if (buttonPos && window.innerWidth < 640) { // Mobile view
          const spaceBelow = windowHeight - buttonPos.bottom;
          const spaceAbove = buttonPos.top;
          
          // If more space below, position below button
          if (spaceBelow > 300 || spaceBelow > spaceAbove) {
            setModalPosition({ top: buttonPos.bottom + scrollY, bottom: 'auto' });
          } else {
            // Otherwise position above button
            setModalPosition({ top: 'auto', bottom: windowHeight - buttonPos.top + 10 });
          }
        } else {
          // Reset for desktop
          setModalPosition({ top: 'auto', bottom: 'auto' });
        }
      }, 10);
    }
  };

  // Función para renderizar los modales
  const renderModals = () => {
    if (showInfoModal) {
      // Modal de información del archivo
      return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información del archivo</h3>
            
            <div className="mb-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Nombre del archivo:</span>
                <span className="text-sm text-gray-900">{editingFile}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Nombre amigable:</span>
                <span className="text-sm text-gray-900">{editFriendlyName}</span>
              </div>
            </div>
            
            {editDescription && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-500 mb-1">Descripción:</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{editDescription}</div>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Tamaño:</span>
                <span className="text-sm text-gray-900">
                  {formatSize(files.find(f => f.name === editingFile)?.size_kb || 0)}
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Última modificación:</span>
                <span className="text-sm text-gray-900">
                  {formatDate(files.find(f => f.name === editingFile)?.last_modified || 0)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between gap-2">
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  startEditingFriendlyName(editingFile);
                }}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Editar nombre
              </button>
              <button
                onClick={closeInfoModal}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      // Modal para editar el nombre amigable
      return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Editar nombre del archivo</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre original
              </label>
              <div className="text-sm bg-gray-100 p-2 rounded">
                {editingFile}
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="friendly-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre amigable
              </label>
              <input
                ref={editNameInputRef}
                type="text"
                id="friendly-name"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                value={editFriendlyName}
                onChange={(e) => setEditFriendlyName(e.target.value)}
                placeholder="Ej. Barómetro de enero 2023"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="Añade información adicional sobre este archivo..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={saveFriendlyName}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative">
      <button 
        id="file-manager-toggle-btn"
        onClick={toggleOpen}
        className="flex items-center px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title={`Archivo activo: ${activeFile ? getFileFriendlyName(activeFile) : 'Ninguno'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 sm:mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
          <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
        </svg>
        {displayedActiveFile ? (
          <span className="truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px] inline-block">
            {displayedActiveFile}
            {files.find(f => f.name === activeFile)?.isLocal && (
              <span className="ml-1 text-xs bg-green-500 text-white px-1 py-0.5 rounded">Local</span>
            )}
          </span>
        ) : (
          <span>
            Archivo
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="fixed sm:absolute sm:top-full sm:right-0 bg-white rounded-md shadow-lg z-50 border border-gray-200 max-h-[80vh] overflow-y-auto sm:mt-2"
          style={{
            // Mobile positioning
            top: window.innerWidth < 640 ? (modalPosition.top !== 'auto' ? `${modalPosition.top}px` : 'auto') : '',
            bottom: window.innerWidth < 640 ? (modalPosition.bottom !== 'auto' ? `${modalPosition.bottom}px` : 'auto') : '',
            left: window.innerWidth < 640 ? '8px' : '',
            right: window.innerWidth < 640 ? '8px' : '',
            // Width adjustments
            width: window.innerWidth < 640 ? 'calc(100% - 16px)' : 'min(500px, 90vw)',
            // Always ensure it fits on screen horizontally
            maxWidth: 'calc(100vw - 16px)',
          }}
        >
          <div className="p-3 sm:p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Gestión de archivos</h3>
              <button 
                onClick={toggleOpen}
                className="text-gray-400 hover:text-gray-500 p-1"
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
                Archivo activo actual: <strong>{activeFile ? getFileFriendlyName(activeFile) : 'Ninguno'}</strong>
                {activeFile && (
                  <span className="text-xs text-gray-500 ml-1">({activeFile})</span>
                )}
                {activeFile && files.find(f => f.name === activeFile)?.isLocal && (
                  <span className="ml-1 text-xs bg-green-500 text-white px-1 py-0.5 rounded">Local</span>
                )}
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
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[65%] sm:w-3/5">
                        ARCHIVO
                      </th>
                      <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                        TAMAÑO
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%] sm:w-1/5">
                        ACCIONES
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-3 sm:px-4 py-3 text-center text-sm text-gray-500">
                          No hay archivos disponibles
                        </td>
                      </tr>
                    ) : (
                      files.map((file) => (
                        <tr key={file.name} className={activeFile === file.name ? 'bg-blue-50' : ''}>
                          <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                {file.friendly_name && file.friendly_name !== file.name ? (
                                  <>
                                    <span className="font-medium break-words line-clamp-2">{file.friendly_name}</span>
                                    <span className="ml-1 text-xs text-gray-500 hidden sm:inline">({file.name})</span>
                                  </>
                                ) : (
                                  <span className="break-words line-clamp-2">{file.name}</span>
                                )}
                                {activeFile === file.name && (
                                  <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                    Activo
                                  </span>
                                )}
                                {file.isLocal && (
                                  <span className="ml-2 text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                    Local
                                  </span>
                                )}
                              </div>
                              {file.description && (
                                <span className="text-xs text-gray-500 mt-1 break-words line-clamp-2 max-w-[180px] sm:max-w-[300px]">
                                  {file.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatSize(file.size_kb)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-gray-500">
                            <div className="flex justify-end space-x-1 sm:space-x-2">
                              {/* Mobile dropdown menu with improved positioning */}
                              <div className="relative sm:hidden">
                                <button 
                                  className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const dropdown = e.currentTarget.nextElementSibling;
                                    dropdown.classList.toggle('hidden');
                                    
                                    // Close any other open dropdowns
                                    document.querySelectorAll('.file-action-dropdown').forEach(el => {
                                      if (el !== dropdown) {
                                        el.classList.add('hidden');
                                      }
                                    });
                                    
                                    // Adjust dropdown position to ensure it's visible
                                    setTimeout(() => {
                                      const rect = dropdown.getBoundingClientRect();
                                      const viewportWidth = window.innerWidth;
                                      const viewportHeight = window.innerHeight;
                                      const buttonRect = e.currentTarget.getBoundingClientRect();
                                      
                                      // Position dropdown directly underneath the button in mobile view
                                      if (window.innerWidth < 640) {
                                        // Position on left side of the viewport
                                        dropdown.style.left = Math.max(5, buttonRect.left - 100) + 'px';
                                        dropdown.style.right = 'auto';
                                        dropdown.style.top = (buttonRect.bottom + 5) + 'px';
                                        dropdown.style.bottom = 'auto';
                                      } else {
                                        // Desktop positioning logic
                                        // Check if dropdown would go off-screen to the right
                                        if (rect.right > viewportWidth - 10) {
                                          dropdown.style.right = '0';
                                          dropdown.style.left = 'auto';
                                        } else {
                                          dropdown.style.right = 'auto';
                                          dropdown.style.left = '0';
                                        }
                                        
                                        // Check if dropdown would go off-screen at the bottom
                                        if (rect.bottom > viewportHeight - 10) {
                                          // Position above the button if it would go off-screen at the bottom
                                          dropdown.style.bottom = `${buttonRect.height}px`;
                                          dropdown.style.top = 'auto';
                                        } else {
                                          dropdown.style.top = '100%';
                                          dropdown.style.bottom = 'auto';
                                          dropdown.style.marginRight = '0';
                                        }
                                      }
                                    }, 10);
                                  }}
                                  aria-label="Menú de acciones para archivo"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                                {/* Fixed position dropdown with improved mobile styling */}
                                <div className="hidden fixed sm:absolute z-50 bg-white border border-gray-200 rounded shadow-lg file-action-dropdown" style={{ width: '110px' }}>
                                  <div className="py-1">
                                    <button
                                      onClick={() => viewFileInfo(file.name)}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>Ver</span>
                                    </button>
                                    <button
                                      onClick={() => startEditingFriendlyName(file.name)}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      <span>Editar</span>
                                    </button>
                                    {activeFile !== file.name && (
                                      <>
                                        <button
                                          onClick={() => handleActivateFile(file.name)}
                                          disabled={processingFile === file.name}
                                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center"
                                        >
                                          {processingFile === file.name ? (
                                            <>
                                              <svg className="animate-spin h-4 w-4 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              <span>Activando</span>
                                            </>
                                          ) : (
                                            <>
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                              <span>Activar</span>
                                            </>
                                          )}
                                        </button>
                                      </>
                                    )}
                                    
                                    {/* Agregar botón eliminar solo para archivos locales */}
                                    {file.isLocal && activeFile !== file.name && (
                                      <button
                                        onClick={() => handleDeleteFile(file.name)}
                                        disabled={processingFile === file.name}
                                        className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 flex items-center"
                                      >
                                        {processingFile === file.name ? (
                                          <>
                                            <svg className="animate-spin h-4 w-4 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Eliminando</span>
                                          </>
                                        ) : (
                                          <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>Eliminar</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Desktop actions - compact icons with tooltips */}
                              <div className="hidden sm:flex sm:items-center sm:space-x-1">
                              <button
                                onClick={() => viewFileInfo(file.name)}
                                  className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                                title="Ver información"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => startEditingFriendlyName(file.name)}
                                  className="p-1 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-50"
                                title="Editar nombre"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              {activeFile !== file.name ? (
                                <>
                                  <button
                                    onClick={() => handleActivateFile(file.name)}
                                    disabled={processingFile === file.name}
                                      className={`p-1 text-green-600 hover:text-green-900 rounded-full hover:bg-green-50 ${
                                      processingFile === file.name ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    title="Activar archivo"
                                  >
                                    {processingFile === file.name ? (
                                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </>
                              ) : (
                                <span className="text-gray-400 px-2">Activo</span>
                              )}
                              
                              {/* Botón para eliminar archivos locales en versión desktop */}
                              {file.isLocal && activeFile !== file.name && (
                                <button
                                  onClick={() => handleDeleteFile(file.name)}
                                  disabled={processingFile === file.name}
                                  className={`p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50 ${
                                    processingFile === file.name ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Eliminar archivo local"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                              </div>
                            </div>
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
      
      {/* Renderizar ventanas modales */}
      {editingFile && renderModals()}
    </div>
  );
} 