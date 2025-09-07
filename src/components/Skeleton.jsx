import React from 'react';

const Skeleton = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '',
  rounded = 'rounded',
  animation = true 
}) => {
  return (
    <div 
      className={`
        ${width} 
        ${height} 
        ${rounded}
        bg-gray-800 
        ${animation ? 'animate-pulse' : ''}
        ${className}
      `}
    />
  );
};

// Specific skeleton components for different use cases
export const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-gray-800 rounded-lg overflow-hidden shadow-sm ${className}`} 
       style={{ aspectRatio: '2/3' }}>
    <div className="w-full h-full bg-gray-700"></div>
  </div>
);

export const ImageSkeleton = ({ className = '', aspectRatio = '2/3' }) => (
  <div 
    className={`bg-gray-800 animate-pulse rounded-lg overflow-hidden ${className}`}
    style={{ aspectRatio }}
  >
    <div className="w-full h-full bg-gray-700"></div>
  </div>
);

export const TextSkeleton = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i}
        width={i === lines - 1 ? 'w-3/4' : 'w-full'} 
        height="h-3"
        className="bg-gray-800"
      />
    ))}
  </div>
);

export const ButtonSkeleton = ({ className = '' }) => (
  <Skeleton 
    width="w-24" 
    height="h-10" 
    rounded="rounded-md" 
    className={`bg-gray-800 ${className}`}
  />
);

export const SearchSkeleton = ({ className = '' }) => (
  <div className={`p-4 space-y-4 ${className}`}>
    <div className="flex items-center space-x-4">
      <Skeleton width="w-12" height="h-12" rounded="rounded-full" className="bg-gray-800" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-3/4" height="h-4" className="bg-gray-800" />
        <Skeleton width="w-1/2" height="h-3" className="bg-gray-800" />
      </div>
    </div>
  </div>
);

export default Skeleton;
