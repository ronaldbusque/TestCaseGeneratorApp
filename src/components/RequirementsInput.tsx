'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

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
  placeholder = '',
  isEnabled = true,
  hasUploadedFiles = false
}: RequirementsInputProps) {
  const [requirements, setRequirements] = useState(initialValue);

  useEffect(() => {
    setRequirements(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(requirements.trim());
  };

  const canSubmit = () => {
    return isEnabled && (hasUploadedFiles || requirements.trim() !== '');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="requirements" className="block text-sm font-medium text-blue-200">
          Additional Requirements
        </label>
        {hasUploadedFiles && (
          <p className="text-sm text-blue-200">
            Add any additional requirements not covered in the uploaded files.
          </p>
        )}
      </div>
      
      <textarea
        id="requirements"
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder={placeholder || "Enter additional requirements or specifications here..."}
        disabled={!isEnabled}
        className={`
          w-full min-h-[200px] p-4 rounded-xl
          bg-white/5 backdrop-blur-sm
          border border-white/20
          text-blue-100 placeholder-blue-300
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        `}
      />
      
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!canSubmit()}
          className={`
            group bg-blue-500/20 hover:bg-blue-500/30
            border border-blue-400/20 hover:border-blue-400/30
            text-blue-100
            backdrop-blur-sm
            transition-all duration-200
            ${!canSubmit() ? 'opacity-50 cursor-not-allowed' : ''}
            px-6 py-2.5 text-base
          `}
        >
          <span>Generate Test Cases</span>
          <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </form>
  );
} 