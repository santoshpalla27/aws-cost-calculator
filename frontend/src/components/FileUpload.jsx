import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, FolderOpen, X, Folder, AlertCircle } from 'lucide-react';

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
    const fileList = Array.from(event.target.files);
    if (fileList.length > 0) {
      setFiles(fileList);
      onFilesSelected(fileList);
    }
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const removeAllFiles = () => {
    setFiles([]);
    onFilesSelected([]);
  };

  return (
    <div className="flex flex-col space-y-6 p-4 border rounded-lg shadow-sm">
      {/* Important Notice */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-blue-700 flex items-start space-x-3 rounded-md">
        <AlertCircle className="h-6 w-6 flex-shrink-0 text-blue-500" />
        <div>
          <p className="font-semibold">For best results:</p>
          <ul className="list-disc list-inside text-sm mt-1 space-y-1">
            <li>Use the "Select Terraform Folder" button below</li>
            <li>Select your main Terraform directory (containing main.tf)</li>
            <li>Folder structure will be preserved automatically</li>
            <li>Or upload a .zip file with your complete project</li>
          </ul>
        </div>
      </div>

      {/* Folder Upload Button - Primary */}
      <div className="flex justify-center">
        <input
          type="file"
          directory=""
          webkitdirectory=""
          onChange={handleFolderSelect}
          className="hidden"
          id="folder-upload-primary"
        />
        <label
          htmlFor="folder-upload-primary"
          className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer transition-colors"
        >
          <FolderOpen className="w-6 h-6" />
          <span>Select Terraform Folder</span>
        </label>
      </div>

      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-500">Or</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Drag and Drop Area - Secondary */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className={`w-12 h-12 ${isDragActive ? 'text-purple-500' : 'text-gray-400'}`} />
          <div className="text-lg text-gray-600">
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <p>
              <span className="font-semibold text-purple-600">
                Drag & drop files or .zip
              </span>
              <br />
              <span className="text-sm text-gray-500">
                Supports .tf, .tfvars, and .zip files
              </span>
            </p>
          )}
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">
              Uploaded Files ({files.length}):
            </h3>
            <button
              onClick={removeAllFiles}
              className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
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
                      ({(file.size / 1024).toFixed(1)} KB)
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