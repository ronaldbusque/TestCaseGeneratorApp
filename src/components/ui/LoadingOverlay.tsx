import { Spinner } from './Spinner';
import { motion } from 'framer-motion';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = 'Generating test cases...' }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center space-x-4">
          <Spinner className="h-6 w-6 text-blue-600" />
          <p className="text-gray-900">{message}</p>
        </div>
      </div>
    </motion.div>
  );
} 