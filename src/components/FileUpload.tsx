'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
}

const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUpload({ onFilesSelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>('');
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  const validateFiles = (files: File[]): { valid: File[], errors: string[] } => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 10MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    return { valid: validFiles, errors };
  };

  const generatePreview = async (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [file.name]: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setError('');
    valid.forEach(generatePreview);
    setSelectedFiles(prev => [...prev, ...valid]);
    onFilesSelect([...selectedFiles, ...valid]);
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fileToRemove.name];
      return newPreviews;
    });
    onFilesSelect(selectedFiles.filter(file => file !== fileToRemove));
  };

  const handleRemoveAllFiles = () => {
    setSelectedFiles([]);
    setPreviews({});
    setError('');
    onFilesSelect([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upload Files</h2>
        {selectedFiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveAllFiles}
            className="text-red-500"
          >
            <XMarkIcon className="h-4 w-4" />
            <span className="ml-2">Remove All</span>
          </Button>
        )}
      </div>

      <div className="w-full">
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center w-full h-64',
            'border-2 border-dashed rounded-lg cursor-pointer',
            'transition-colors duration-200',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
          )}
        >
          {selectedFiles.length > 0 ? (
            <div className="w-full p-4 space-y-3 overflow-y-auto max-h-full">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    {previews[file.name] ? (
                      <img src={previews[file.name]} alt={file.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xs font-medium">{SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]}</span>
                      </div>
                    )}
                    <span className="text-sm text-gray-500">{file.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveFile(file)}
                    className="text-red-500"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <svg
                className="w-10 h-10 mb-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: PDF, DOC, DOCX, TXT, PNG, JPEG, JPG, GIF, WEBP (Max 10MB)
              </p>
            </>
          )}
          
          <input
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-500 whitespace-pre-line">{error}</div>
      )}
    </div>
  );
} 