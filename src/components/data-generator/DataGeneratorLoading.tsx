'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DataGeneratorLoadingProps {
  message: string;
}

export function DataGeneratorLoading({ message }: DataGeneratorLoadingProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <motion.div 
          className="h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-400/30 animate-pulse"
        />
        <motion.div 
          className="absolute inset-0 h-24 w-24 rounded-full border-t-4 border-blue-400 animate-spin"
        />
        
        {/* Animated dots at cardinal points */}
        {['top', 'right', 'bottom', 'left'].map((position, index) => (
          <motion.div
            key={position}
            className={cn(
              "absolute h-2 w-2 rounded-full bg-blue-400",
              position === 'top' && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
              position === 'right' && "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
              position === 'bottom' && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
              position === 'left' && "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
            )}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          </motion.div>
        ))}

        {/* Data icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-2xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          📊
        </motion.div>
      </div>

      <motion.p 
        className="mt-6 text-lg font-medium text-white"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>

      <motion.div 
        className="mt-2 text-sm text-white/80 animate-pulse"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Processing your request{dots}
      </motion.div>
    </motion.div>
  );
} 