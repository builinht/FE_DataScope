import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  message = 'Loading...', 
  color = 'blue' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600',
    gray: 'border-gray-600'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div 
        className={`animate-spin rounded-full border-4 border-gray-200 ${colorClasses[color]} ${sizeClasses[size]}`}
        style={{ borderTopColor: 'transparent' }}
      />
      {message && (
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;