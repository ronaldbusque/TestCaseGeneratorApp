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

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, shouldReset = false }) => {
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (shouldReset) {
      setFiles([]);
    }
  }, [shouldReset]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const updatedFiles = [...files, ...acceptedFiles];
    setFiles(updatedFiles);
    onFilesSelect(updatedFiles);
  }, [onFilesSelect, files]);

  const removeFile = (fileToRemove: File) => {
    const updatedFiles = files.filter(file => file !== fileToRemove);
    setFiles(updatedFiles);
    onFilesSelect(updatedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    }
  });

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
          <div className="text-xs text-blue-300 text-center">
            Supported formats: TXT, MD, PDF, DOC, DOCX, PNG, JPG, JPEG, GIF
          </div>
        </div>
      </div>

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
                  <p className="text-xs text-blue-300">{(file.size / 1024).toFixed(1)} KB</p>
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
        </div>
      )}
    </div>
  );
};
