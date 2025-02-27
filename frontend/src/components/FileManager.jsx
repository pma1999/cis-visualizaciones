import { useState, useEffect, useRef } from 'react';
import { getAvailableFiles, activateFile, uploadFile } from '../api/cisApi';
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
        fileChangeEvent(filename);
      } else {
        setError(result.error || 'Error al activar el archivo');
      }
    } catch (error) {
      setError(`Error al activar el archivo: ${error.message}`);
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

  return (
    <div className="relative">
      <button
        className="text-white hover:text-blue-200 focus:outline-none flex items-center justify-center transition-all duration-200"
        onClick={toggleOpen}
        aria-label="Administrar archivos"
        title="Administrar archivos"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        {activeFile && (
          <span className="hidden md:inline ml-2 truncate max-w-xs">
            {displayedActiveFile || activeFile}
            {files.find(f => f.name === activeFile)?.isLocal && (
              <span className="ml-1 text-xs bg-green-500 text-white px-1 py-0.5 rounded">Local</span>
            )}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 bg-white rounded-lg shadow-lg w-80 sm:w-96 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-medium text-lg text-gray-800">Administrador de archivos</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {isContextLoading ? (
              <div className="p-6 text-center">
                <span className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                <p className="mt-2 text-gray-500">Cargando archivos...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No hay archivos disponibles.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {files.map((file) => {
                  const isActive = file.name === activeFile;
                  const friendlyName = getFileFriendlyName(file.name) || file.name;
                  const isProcessing = processingFile === file.name;
                  const isLocalFile = file.isLocal;
                  
                  return (
                    <li key={file.name} className={`relative ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="px-4 py-3 flex items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <button
                              onClick={() => handleActivateFile(file.name)}
                              disabled={isActive || isContextLoading || isUploading}
                              className={`text-left block font-medium text-sm sm:text-base ${isActive ? 'text-blue-600' : 'text-gray-800 hover:text-blue-600'}`}
                            >
                              {friendlyName}
                            </button>
                            {isLocalFile && (
                              <span className="ml-2 text-xs bg-green-500 text-white px-1 py-0.5 rounded">Local</span>
                            )}
                            {isActive && (
                              <span className="ml-2 text-xs bg-blue-500 text-white px-1 py-0.5 rounded">Activo</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{file.description || file.name}</p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {isProcessing ? (
                            <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                          ) : (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  // Toggle dropdown menu for this file
                                  const dropdowns = document.querySelectorAll('.file-action-dropdown');
                                  dropdowns.forEach(dropdown => {
                                    if (dropdown.dataset.filename === file.name) {
                                      dropdown.classList.toggle('hidden');
                                    } else {
                                      dropdown.classList.add('hidden');
                                    }
                                  });
                                }}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                aria-label="Opciones"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                              <div
                                className="file-action-dropdown absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 hidden z-10"
                                data-filename={file.name}
                              >
                                <button
                                  onClick={() => startEditingFriendlyName(file.name)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Editar nombre
                                </button>
                                <button
                                  onClick={() => viewFileInfo(file.name)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Ver información
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex-1">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 