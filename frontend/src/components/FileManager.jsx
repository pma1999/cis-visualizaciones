import { useState, useEffect } from 'react';
import { uploadFile, deleteLocalFile } from '../api/cisApi';
import { fileChangeEvent } from './VariablesList';
import { useFiles } from '../contexts/FileContext';
import { showTemporaryNotification } from '../utils/fileUtils';
import FileInfoModal from './FileInfoModal';
import EditFileModal from './EditFileModal';
import FileUploader from './FileUploader';
import FilesList from './FilesList';

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
      
      showTemporaryNotification(setNotification, 'Archivo eliminado correctamente');
    } catch (error) {
      setError(`Error al eliminar el archivo: ${error.message}`);
    } finally {
      setProcessingFile(null);
    }
  };

  const handleUploadFile = async (file) => {
    if (!file) return;

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
      showTemporaryNotification(setNotification, 'Archivo subido correctamente (almacenado localmente)');
      
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
    setShowInfoModal(false);
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
      showTemporaryNotification(setNotification, 'Nombre y descripción actualizados');
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
            
            {/* File uploader component */}
            <FileUploader 
              onUpload={handleUploadFile} 
              isUploading={isUploading} 
              uploadProgress={uploadProgress} 
            />
            
            {/* Files list component */}
            <FilesList 
              files={files}
              activeFile={activeFile}
              isContextLoading={isContextLoading}
              isUploading={isUploading}
              processingFile={processingFile}
              onActivateFile={handleActivateFile}
              onDeleteFile={handleDeleteFile}
              onViewInfo={viewFileInfo}
              onEditName={startEditingFriendlyName}
            />
          </div>
        </div>
      )}
      
      {/* Render modals */}
      {editingFile && showInfoModal && (
        <FileInfoModal 
          file={files.find(f => f.name === editingFile)}
          friendlyName={editFriendlyName}
          description={editDescription}
          onClose={cancelEditing}
          onEditName={() => {
            setShowInfoModal(false);
            startEditingFriendlyName(editingFile);
          }}
        />
      )}
      
      {editingFile && !showInfoModal && (
        <EditFileModal 
          filename={editingFile}
          friendlyName={editFriendlyName}
          description={editDescription}
          onSave={saveFriendlyName}
          onCancel={cancelEditing}
          isSaving={isSaving}
          setEditFriendlyName={setEditFriendlyName}
          setEditDescription={setEditDescription}
        />
      )}
    </div>
  );
} 