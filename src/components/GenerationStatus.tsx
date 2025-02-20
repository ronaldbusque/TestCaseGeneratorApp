'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface GenerationStatusProps {
  isGenerating: boolean;
  isComplete: boolean;
}

export function GenerationStatus({ isGenerating, isComplete }: GenerationStatusProps) {
  return (
    <AnimatePresence>
      {(isGenerating || isComplete) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-end space-x-2 text-sm"
        >
          {isGenerating && (
            <>
              <motion.div
                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
              <span className="text-gray-600">Analyzing requirements...</span>
            </>
          )}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center text-green-600"
            >
              <CheckCircleIcon className="h-5 w-5 mr-1.5" />
              <span>Generation Complete</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
} 