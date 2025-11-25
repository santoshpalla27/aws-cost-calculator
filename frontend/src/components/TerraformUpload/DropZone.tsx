import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import {
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  isLoading = false,
  disabled = false,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      accept: {
        'application/zip': ['.zip'],
      },
      maxFiles: 1,
      disabled: disabled || isLoading,
    });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'border-2 border-dashed rounded-xl p-8 text-center transition-all',
        'focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-dark-900',
        isDragActive ? 'border-accent-blue bg-dark-800' : 'border-dark-700',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      )}
    >
      <input {...getInputProps()} />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center text-dark-300">
          <CloudArrowUpIcon className="w-12 h-12 text-accent-blue animate-pulse-slow mb-3" />
          <p className="text-lg font-medium">Scanning Terraform files...</p>
          <p className="text-sm">This may take a few minutes</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            {isDragActive ? (
              <DocumentArrowUpIcon className="w-12 h-12 text-accent-blue" />
            ) : (
              <CloudArrowUpIcon className="w-12 h-12 text-dark-400" />
            )}
          </div>

          <p className="text-lg font-semibold text-dark-100 mb-2">
            {isDragActive ? (
              'Drop the zip file here'
            ) : (
              <>
                Drag & drop your Terraform zip file
                <span className="block text-base font-normal text-dark-300">
                  or click to browse
                </span>
              </>
            )}
          </p>

          <p className="text-sm text-dark-500 mt-4">
            <span className="font-mono text-dark-400">.zip</span> files only
            <span className="mx-2">|</span> Max 50MB
          </p>
        </>
      )}

      {acceptedFiles.length > 0 && !isLoading && (
        <div className="mt-4 text-sm text-dark-300">
          Selected: {acceptedFiles[0].name}
        </div>
      )}
    </div>
  );
};