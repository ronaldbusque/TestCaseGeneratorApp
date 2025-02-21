'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RequirementsInputProps {
  onSubmit: (requirements: string) => void;
  initialValue?: string;
  placeholder?: string;
  isEnabled?: boolean;
  hasUploadedFiles?: boolean;
}

export function RequirementsInput({ 
  onSubmit, 
  initialValue = '', 
  placeholder = 'Enter your requirements here...',
  isEnabled = false,
  hasUploadedFiles = false
}: RequirementsInputProps) {
  const [requirements, setRequirements] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  // Add effect to update requirements when initialValue changes
  useEffect(() => {
    setRequirements(initialValue);
  }, [initialValue]);

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    
    setIsLoading(true);
    try {
      await onSubmit(requirements);
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = () => {
    return hasUploadedFiles || requirements.trim() !== '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold">Enter Requirements</h2>
      <textarea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg border border-gray-300 p-4 text-gray-900',
          'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
          'transition-colors duration-200'
        )}
        rows={8}
      />
      <motion.div 
        className="flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: canSubmit() ? 1 : 0.5 }}
      >
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!canSubmit()}
          className="relative group"
        >
          Generate Test Cases
          {!canSubmit() && (
            <span className="absolute -top-8 right-0 w-48 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Add files or requirements first
            </span>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
} 