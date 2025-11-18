'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, Download, Eye } from 'lucide-react';

interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'failed';
  url?: string;
}

export default function FileUploadComponent() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      status: 'uploading',
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload process
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: 100, status: 'completed', url: '#' } 
              : f
          ));
        } else {
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: progress } 
              : f
          ));
        }
      }, 200);
    });
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      // Create a new event to simulate input change
      const event = {
        target: { files: droppedFiles }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      // Create a temporary input to trigger the change handler
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.files = droppedFiles;
      
      handleFileChange({ target: tempInput } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(file => file.id !== id));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 font-medium">Drag and drop files here</p>
          <p className="text-sm text-gray-500">or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Supports: JPG, PNG, PDF, DOC, XLS, TXT (Max 10MB)</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-medium">Upload Queue ({files.length})</h3>
            {files.map((file) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center">
                  <File className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="font-medium truncate max-w-xs">{file.name}</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'uploading' && (
                        <Badge variant="secondary" className="ml-2">Uploading</Badge>
                      )}
                      {file.status === 'completed' && (
                        <Badge variant="default" className="ml-2">Completed</Badge>
                      )}
                      {file.status === 'failed' && (
                        <Badge variant="destructive" className="ml-2">Failed</Badge>
                      )}
                    </div>
                    {file.status === 'uploading' && (
                      <Progress value={file.uploadProgress} className="w-32 mt-1" />
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {file.status === 'completed' && (
                    <>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}