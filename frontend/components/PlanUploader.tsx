import React, { useState, useRef } from 'react';
import { Upload, Folder, AlertCircle } from 'lucide-react';

interface PlanUploaderProps {
    onUpload: (files: File[]) => void;
    label: string;
    allowMultiple?: boolean;
}

export const PlanUploader: React.FC<PlanUploaderProps> = ({ onUpload, label, allowMultiple = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Recursively traverse directory entries to find files
    const traverseFileTree = async (entry: any, path: string = ''): Promise<File[]> => {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file((file: File) => {
                    // Manually attach the relative path for DnD files
                    // We use a custom property or override webkitRelativePath if possible
                    // But since webkitRelativePath is read-only, we might need to rely on a custom way or just use the path we built
                    // For now, let's try to define it if it's empty (which it is for DnD)
                    if (!file.webkitRelativePath) {
                        Object.defineProperty(file, 'webkitRelativePath', {
                            value: path + entry.name,
                            writable: true,
                            configurable: true
                        });
                    }
                    resolve([file]);
                });
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            return new Promise((resolve) => {
                dirReader.readEntries(async (entries: any[]) => {
                    const promises = entries.map((e) => traverseFileTree(e, path + entry.name + "/"));
                    const results = await Promise.all(promises);
                    resolve(results.flat());
                });
            });
        }
        return [];
    };

    const processDroppedItems = async (items: DataTransferItemList) => {
        setIsProcessing(true);
        const files: File[] = [];
        const promises: Promise<File[]>[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
            if (entry) {
                promises.push(traverseFileTree(entry));
            } else if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }

        const nestedFiles = await Promise.all(promises);
        const allFiles = [...files, ...nestedFiles.flat()];
        handleFiles(allFiles);
        setIsProcessing(false);
    };

    const handleFiles = (input: FileList | File[] | null) => {
        if (!input) return;

        const files = input instanceof FileList ? Array.from(input) : input;

        if (files.length === 0) return;

        // Filter valid files (.json or .tf)
        const validFiles = files.filter(f =>
            f.name.endsWith('.json') || f.name.endsWith('.tf')
        );

        if (validFiles.length === 0) {
            setError('No valid files found. Please upload .json plans or .tf configuration files.');
            return;
        }

        setError(null);
        onUpload(validFiles);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.items) {
            processDroppedItems(e.dataTransfer.items);
        } else if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-slate-400 mb-2">{label}</label>
            <div
                className={`border-2 border-dashed rounded-lg p-8 transition-colors text-center cursor-pointer relative ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-sm text-slate-400">Scanning files...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-slate-700 rounded-full flex gap-2">
                            <Upload className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-200">
                                Drop <strong>Plan JSON</strong> or <strong>Terraform Folder</strong>
                            </p>
                            <p className="text-xs text-slate-500">
                                Automatically scans for .tf files in folders
                            </p>
                        </div>
                    </div>
                )}

                {/* Standard File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".json,.tf"
                    multiple={allowMultiple}
                    onChange={(e) => handleFiles(e.target.files)}
                />

                {/* Directory Input */}
                <input
                    ref={folderInputRef}
                    type="file"
                    className="hidden"
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            <div className="mt-2 flex justify-between items-start">
                <div className="text-xs text-slate-500">
                    <button
                        onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                        className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                    >
                        <Folder className="w-3 h-3" />
                        Select Folder
                    </button>
                </div>
                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};