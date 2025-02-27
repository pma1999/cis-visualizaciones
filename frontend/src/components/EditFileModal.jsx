import React, { useEffect, useRef } from 'react';

/**
 * Modal component for editing file name and description
 */
const EditFileModal = ({ 
  filename, 
  friendlyName, 
  description, 
  onSave, 
  onCancel,
  isSaving,
  setEditFriendlyName,
  setEditDescription
}) => {
  const editNameInputRef = useRef(null);
  
  // Focus input when component mounts
  useEffect(() => {
    if (editNameInputRef.current) {
      editNameInputRef.current.focus();
    }
  }, []);
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Editar nombre del archivo</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre original
          </label>
          <div className="text-sm bg-gray-100 p-2 rounded">
            {filename}
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
            value={friendlyName}
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
            rows="3"
            value={description}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Añade una descripción para este archivo"
          />
        </div>
        
        <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
          <p>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Estos cambios son personales y solo serán visibles para ti. Otros usuarios seguirán viendo el nombre original o sus propias personalizaciones.
          </p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditFileModal; 