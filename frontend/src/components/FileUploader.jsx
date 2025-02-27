import React from 'react';

/**
 * Component for handling file uploads
 */
const FileUploader = ({ onUpload, isUploading, uploadProgress }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onUpload(file);
      // Reset file input
      event.target.value = null;
    }
  };

  return (
    <div className="mb-4">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".sav"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <label
        htmlFor="file-upload"
        className={`flex justify-center items-center p-4 border-2 border-blue-300 border-dashed rounded-md cursor-pointer bg-blue-50 hover:bg-blue-100 transition ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
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
  );
};

export default FileUploader; 