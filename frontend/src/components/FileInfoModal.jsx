import React from 'react';
import { formatDate, formatSize } from '../utils/fileUtils';

/**
 * Modal component to display file information
 */
const FileInfoModal = ({ file, friendlyName, description, onClose, onEditName }) => {
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
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Nombre amigable:</span>
            <span className="text-sm text-gray-900">{friendlyName}</span>
          </div>
        </div>
        
        {description && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Descripción:</div>
            <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{description}</div>
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
              {formatDate(file.last_modified || 0)}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between gap-2">
          <button
            onClick={onEditName}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Editar nombre
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileInfoModal; 