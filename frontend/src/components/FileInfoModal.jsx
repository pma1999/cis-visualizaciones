import React from 'react';
import { formatDate, formatSize } from '../utils/fileUtils';

/**
 * Modal component to display file information
 */
const FileInfoModal = ({ file, friendlyName, description, onClose, onEditName }) => {
  // Comprobar si un nombre es personalizado localmente
  const isLocallyCustomized = (filename) => {
    try {
      const stored = localStorage.getItem('cis_user_friendly_names');
      if (!stored) return false;
      
      const customNames = JSON.parse(stored);
      return !!customNames[filename];
    } catch (e) {
      return false;
    }
  };
  
  const hasLocalCustomization = isLocallyCustomized(file.name);
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información del archivo</h3>
        
        <div className="mb-4">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Nombre del archivo:</span>
            <span className="text-sm text-gray-900">{file.name}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Nombre amigable:</span>
            <div className="flex items-center">
              <span className="text-sm text-gray-900">{friendlyName}</span>
              {hasLocalCustomization && (
                <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded" title="Este nombre es personalizado localmente y solo visible para ti">
                  Personalizado
                </span>
              )}
            </div>
          </div>
        </div>
        
        {description && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Descripción:</div>
            <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
              {description}
              {isLocallyCustomized(file.name) && (
                <div className="mt-1 text-xs text-purple-800">
                  <em>Esta descripción es personalizada localmente y solo visible para ti.</em>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Tamaño:</span>
            <span className="text-sm text-gray-900">
              {formatSize(file.size_kb || 0)}
            </span>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Última modificación:</span>
            <span className="text-sm text-gray-900">
              {formatDate(file.last_modified)}
            </span>
          </div>
        </div>
        
        {file.isLocal && (
          <div className="mb-4 p-2 bg-green-50 border border-green-100 rounded-md">
            <p className="text-xs text-green-800">
              <span className="font-medium">Archivo local:</span> Este archivo está guardado localmente en tu navegador.
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onEditName}
            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Editar nombre
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileInfoModal; 