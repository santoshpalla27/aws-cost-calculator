import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, FolderOpen, X, Folder } from 'lucide-react';

function FileUpload({ onFilesSelected }) {
  const [files, setFiles] = React.useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    onFilesSelected([...files, ...acceptedFiles]);
  }, [files, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.tf', '.tfvars'],
      'application/zip': ['.zip']
    }
  });

  const handleFolderSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setFiles(prev => [...prev, ...files]);
      onFilesSelected([...files]);
    }
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className="space-y-6">
      {/* Drag and Drop Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className={`w-12 h-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <div className="text-lg text-gray-600">
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <p>
              <span className="font-semibold text-blue-600">
                Drag & drop Terraform files here
              </span>
              <br />
              <span className="text-sm text-gray-500">
                or click to select files (.tf, .tfvars, .zip)
              </span>
            </p>
          )}
          </div>
        </div>
      </div>

      {/* Folder Upload Button */}
      <div className="flex justify-center">
        <input
          type="file"
          directory=""
          webkitdirectory=""
          onChange={handleFolderSelect}
          className="hidden"
          id="folder-upload"
        />
        <label
          htmlFor="folder-upload"
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          <FolderOpen className="w-5 h-5 text-gray-500" />
          <span>Select Terraform Folder</span>
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-700 flex items-center">
          <span className="mr-2">💡</span>
          <strong>Tip:</strong> Upload your entire Terraform project folder for automatic module detection
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h3 className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-200">
            Uploaded Files ({files.length}):
          </h3>
          <div className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-3 overflow-hidden">
                  {file.name.endsWith('.zip') ? (
                    <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.webkitRelativePath || file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;