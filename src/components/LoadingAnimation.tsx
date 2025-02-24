'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LoadingAnimationProps {
  message: string;
}

const stepDetails = {
  preprocessing: {
    color: 'blue',
    icon: '🔄',
    subMessage: 'Preparing your requirements...'
  },
  analyzing: {
    color: 'purple',
    icon: '🔍',
    subMessage: 'Analyzing requirements and context...'
  },
  parsing: {
    color: 'green',
    icon: '📝',
    subMessage: 'Processing input data...'
  },
  generating: {
    color: 'yellow',
    icon: '⚡',
    subMessage: 'Creating test cases...'
  },
  formatting: {
    color: 'orange',
    icon: '✨',
    subMessage: 'Polishing the output...'
  }
} as const;

export function LoadingAnimation({ message }: LoadingAnimationProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Extract the step from the message if it matches our known steps
  const step = Object.keys(stepDetails).find(key => message.toLowerCase().includes(key)) as keyof typeof stepDetails;
  const details = step ? stepDetails[step] : null;

  return (
    <motion.div 
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <motion.div 
          className={cn(
            "h-24 w-24 rounded-full border-t-4 border-b-4",
            details ? `border-${details.color}-400/30` : "border-blue-400/30",
            "animate-pulse"
          )}
        />
        <motion.div 
          className={cn(
            "absolute inset-0 h-24 w-24 rounded-full border-t-4",
            details ? `border-${details.color}-400` : "border-blue-400",
            "animate-spin"
          )}
        />
        
        {/* Animated dots at cardinal points */}
        {['top', 'right', 'bottom', 'left'].map((position, index) => (
          <motion.div
            key={position}
            className={cn(
              "absolute h-2 w-2 rounded-full",
              details ? `bg-${details.color}-400` : "bg-blue-400",
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
              className={cn(
                "absolute inset-0 rounded-full",
                details ? `bg-${details.color}-400` : "bg-blue-400"
              )}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          </motion.div>
        ))}

        {/* Step icon */}
        {details && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center text-2xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {details.icon}
          </motion.div>
        )}
      </div>

      <motion.p 
        className="mt-6 text-lg font-medium text-white"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>

      {details && (
        <motion.div 
          className="mt-2 text-sm text-white/80 animate-pulse"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {details.subMessage}{dots}
        </motion.div>
      )}
    </motion.div>
  );
} 