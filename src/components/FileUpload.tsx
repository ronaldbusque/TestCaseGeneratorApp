'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { XMarkIcon, ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

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
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, shouldReset = false }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shouldReset) {
      setFiles([]);
      setError(null);
    }
  }, [shouldReset]);

  const getTotalSize = (fileList: File[]) => {
    return fileList.reduce((total, file) => total + file.size, 0);
  };

  const validateFiles = (newFiles: File[]): { valid: File[], errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    newFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds the 10MB file size limit`);
      } else {
        const potentialTotalSize = getTotalSize([...files, ...valid, file]);
        if (potentialTotalSize > MAX_TOTAL_SIZE) {
          errors.push(`Adding ${file.name} would exceed the 50MB total size limit`);
        } else {
          valid.push(file);
        }
      }
    });

    return { valid, errors };
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const { valid, errors } = validateFiles(acceptedFiles);

    if (errors.length > 0) {
      setError(errors.join('. '));
    }

    if (valid.length > 0) {
      const updatedFiles = [...files, ...valid];
      setFiles(updatedFiles);
      onFilesSelect(updatedFiles);
    }
  }, [onFilesSelect, files]);

  const removeFile = (fileToRemove: File) => {
    const updatedFiles = files.filter(file => file !== fileToRemove);
    setFiles(updatedFiles);
    onFilesSelect(updatedFiles);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map(rejection => {
        const file = rejection.file;
        const sizeError = rejection.errors.find(error => error.code === 'file-too-large');
        const typeError = rejection.errors.find(error => error.code === 'file-invalid-type');
        
        if (sizeError) {
          return `${file.name} exceeds the 10MB file size limit`;
        }
        if (typeError) {
          return `${file.name} is not a supported file type`;
        }
        return `${file.name} could not be uploaded`;
      });
      setError(errors.join('. '));
    },
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: MAX_FILE_SIZE
  });

  const totalSize = getTotalSize(files);
  const remainingSize = MAX_TOTAL_SIZE - totalSize;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-blue-100 mb-4">System Requirements</h2>
      <div 
        {...getRootProps()} 
        className={`
          p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-400 bg-blue-400/10' 
            : 'border-white/20 hover:border-blue-400/50 hover:bg-white/5'
          }
          ${error ? 'border-red-400/50' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <div className={`p-4 rounded-full bg-white/10 transition-all duration-200 ${isDragActive ? 'bg-blue-400/20' : ''}`}>
            <ArrowUpTrayIcon className={`h-8 w-8 transition-all duration-200 ${isDragActive ? 'text-blue-400' : 'text-blue-200'}`} />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-blue-100">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="mt-1 text-sm text-blue-200">
              or click to select files
            </p>
          </div>
          <div className="text-xs text-blue-300 text-center space-y-1">
            <p>Supported formats: TXT, MD, PDF, DOC, DOCX, PNG, JPG, JPEG, GIF</p>
            <p>Max file size: 10MB | Total size remaining: {(remainingSize / (1024 * 1024)).toFixed(1)}MB</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div 
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 group hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-white/10">
                  <DocumentIcon className="h-5 w-5 text-blue-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-100">{file.name}</p>
                  <p className="text-xs text-blue-300">{(file.size / (1024 * 1024)).toFixed(2)}MB</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(file)}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all duration-200"
              >
                <XMarkIcon className="h-5 w-5 text-blue-200 hover:text-blue-100" />
              </button>
            </div>
          ))}
          <div className="text-xs text-blue-300 pt-2">
            Total size: {(totalSize / (1024 * 1024)).toFixed(2)}MB
          </div>
        </div>
      )}
    </div>
  );
};

