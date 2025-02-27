import React, { useEffect } from 'react';
import { formatSize } from '../utils/fileUtils';

/**
 * Component for rendering the file list with actions
 */
const FilesList = ({
  files,
  activeFile,
  isContextLoading,
  isUploading,
  processingFile,
  onActivateFile,
  onDeleteFile,
  onViewInfo,
  onEditName
}) => {
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

  // Handle mobile dropdown toggle
  const toggleMobileDropdown = (e) => {
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
  };

  if (isContextLoading && !isUploading) {
    return (
      <div className="py-4 text-center text-gray-600">
        Cargando archivos...
      </div>
    );
  }

  return (
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
                    {/* Mobile dropdown menu */}
                    <div className="relative sm:hidden">
                      <button 
                        className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                        onClick={toggleMobileDropdown}
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
                            onClick={() => onViewInfo(file.name)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Ver</span>
                          </button>
                          <button
                            onClick={() => onEditName(file.name)}
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
                                onClick={() => onActivateFile(file.name)}
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
                              onClick={() => onDeleteFile(file.name)}
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
                        onClick={() => onViewInfo(file.name)}
                        className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                        title="Ver información"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => onEditName(file.name)}
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
                            onClick={() => onActivateFile(file.name)}
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
                          onClick={() => onDeleteFile(file.name)}
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
  );
};

export default FilesList; 