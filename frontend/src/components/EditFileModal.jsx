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
            value={description}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            placeholder="Añade información adicional sobre este archivo..."
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
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
};

export default EditFileModal; 