import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, FolderOpen, X } from 'lucide-react';

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

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
      <div {...getRootProps()} className="text-center cursor-pointer hover:bg-gray-50 transition-colors">
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        {isDragActive ? (
          <p className="mt-2 text-sm text-gray-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">Drag & drop</span> Terraform files or folders here
            </p>
            <p className="text-xs text-gray-500">or click to select files (.tf, .tfvars, .zip)</p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-900">Uploaded Files:</h3>
          <div className="mt-2 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  {file.name.endsWith('.zip') ? (
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                  ) : (
                    <File className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
                <button 
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
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