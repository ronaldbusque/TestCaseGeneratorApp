'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';

interface RequirementsInputProps {
  onSubmit: (requirements: string) => void;
  initialValue?: string;
  placeholder?: string;
  isEnabled?: boolean;
}

export function RequirementsInput({ 
  onSubmit, 
  initialValue = '', 
  placeholder = 'Enter your requirements here...',
  isEnabled = false
}: RequirementsInputProps) {
  const [requirements, setRequirements] = useState(initialValue);

  // Add effect to update requirements when initialValue changes
  useEffect(() => {
    setRequirements(initialValue);
  }, [initialValue]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!isEnabled && !requirements.trim()) return;
    
    setIsLoading(true);
    try {
      await onSubmit(requirements);
    } finally {
      setIsLoading(false);
    }
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
        className={`w-full rounded-lg border border-gray-300 p-4 text-gray-900 
          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
          transition-colors duration-200`}
        rows={8}
      />
      <motion.div 
        className="flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: isEnabled || requirements.trim() ? 1 : 0.5 }}
      >
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!isEnabled && !requirements.trim()}
        >
          Generate Test Cases
        </Button>
      </motion.div>
    </motion.div>
  );
} 