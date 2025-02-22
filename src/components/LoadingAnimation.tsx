'use client';

interface LoadingAnimationProps {
  message: string;
}

export function LoadingAnimation({ message }: LoadingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-400/30 animate-pulse"></div>
        <div className="absolute inset-0 h-24 w-24 rounded-full border-t-4 border-blue-400 animate-spin"></div>
        
        {/* Glowing dots */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-400 animate-pulse">
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping"></div>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-2 w-2 rounded-full bg-blue-400 animate-pulse">
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping"></div>
        </div>
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-400 animate-pulse">
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping"></div>
        </div>
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-400 animate-pulse">
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping"></div>
        </div>
      </div>
      <p className="mt-6 text-lg font-medium text-blue-100">{message}</p>
      <div className="mt-2 text-sm text-blue-200 animate-pulse">Please wait...</div>
    </div>
  );
} 