import React from 'react';

export const LoadingAnimation = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute w-full h-full border-4 border-neutral-200 rounded-full"></div>
        <div className="absolute w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <p className="text-lg font-medium text-neutral-700">{message}</p>
        <div className="flex space-x-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>
  );
}; 