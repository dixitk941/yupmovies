import React from 'react';

const Spinner = ({ 
  size = 'md', 
  color = 'red', 
  className = '',
  text = '',
  centered = false 
}) => {
  // Size variants
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-5 h-5 border-2', 
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-4'
  };

  // Color variants
  const colorClasses = {
    red: 'border-red-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-500 border-t-transparent',
    primary: 'border-[#ff0000] border-t-transparent'
  };

  const spinnerElement = (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        rounded-full 
        spinner-custom
        ${className}
      `}
    />
  );

  if (centered) {
    return (
      <div className="flex flex-col items-center justify-center spinner-container">
        {spinnerElement}
        {text && (
          <p className="text-gray-400 text-sm mt-2">{text}</p>
        )}
      </div>
    );
  }

  return (
    <div className="spinner-container">
      {spinnerElement}
      {text && (
        <p className="text-gray-400 text-sm mt-2">{text}</p>
      )}
    </div>
  );
};

export default Spinner;
