'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  shouldReset?: boolean;
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

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, shouldReset = false }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to handle resetting the component
  useEffect(() => {
    if (shouldReset) {
      setSelectedFiles([]);
      // Cleanup previews
      Object.values(previews).forEach(URL.revokeObjectURL);
      setPreviews({});
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [shouldReset]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'application/pdf' || 
      file.type === 'text/plain' ||
      file.type === 'application/msword' ||
      file.type.includes('document')
    );

    if (validFiles.length !== newFiles.length) {
      console.warn('Some files were skipped due to unsupported file types');
    }

    const updatedFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(updatedFiles);
    onFilesSelect(updatedFiles);

    // Generate previews for new image files
    const newPreviews: { [key: string]: string } = { ...previews };
    for (const file of validFiles) {
      if (file.type.startsWith('image/')) {
        try {
          const preview = URL.createObjectURL(file);
          newPreviews[`${file.name}-${file.lastModified}`] = preview;
        } catch (error) {
          console.error('Failed to generate preview for:', file.name, error);
        }
      }
    }
    setPreviews(newPreviews);
  }, [selectedFiles, previews, onFilesSelect]);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    console.log('Removing file:', fileToRemove.name);
    console.log('Current files:', selectedFiles.map(f => f.name));
    
    const updatedFiles = selectedFiles.filter(file => 
      `${file.name}-${file.lastModified}` !== `${fileToRemove.name}-${fileToRemove.lastModified}`
    );
    
    console.log('Updated files:', updatedFiles.map(f => f.name));
    setSelectedFiles(updatedFiles);
    onFilesSelect(updatedFiles);

    // Clean up preview if it exists
    const previewKey = `${fileToRemove.name}-${fileToRemove.lastModified}`;
    if (previews[previewKey]) {
      URL.revokeObjectURL(previews[previewKey]);
      const { [previewKey]: removed, ...remainingPreviews } = previews;
      setPreviews(remainingPreviews);
    }
  }, [selectedFiles, previews, onFilesSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      Object.values(previews).forEach(URL.revokeObjectURL);
    };
  }, [previews]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upload Files</h2>
        {selectedFiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedFiles([]);
              setPreviews({});
              onFilesSelect([]);
            }}
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
            'border-2 border-dashed rounded-lg',
            'transition-colors duration-200',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50',
            selectedFiles.length === 0 ? 'cursor-pointer' : 'cursor-default'
          )}
          onClick={selectedFiles.length === 0 ? handleClick : undefined}
        >
          {selectedFiles.length > 0 ? (
            <div className="w-full p-4 space-y-3 overflow-y-auto max-h-full">
              {selectedFiles.map((file) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    {previews[`${file.name}-${file.lastModified}`] ? (
                      <img
                        src={previews[`${file.name}-${file.lastModified}`]}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-gray-500">{file.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveFile(file);
                    }}
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
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleInputChange}
          />
        </label>
      </div>
    </div>
  );
};
