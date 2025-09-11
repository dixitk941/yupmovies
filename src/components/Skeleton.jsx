import React from 'react';

// Base shimmer animation for Netflix/YouTube style loading
const shimmerAnimation = `
  relative overflow-hidden
  before:absolute before:inset-0
  before:-translate-x-full
  before:animate-[shimmer_2s_infinite]
  before:bg-gradient-to-r
  before:from-transparent before:via-white/10 before:to-transparent
`;

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
        bg-gray-800/60
        ${animation ? shimmerAnimation : ''}
        ${className}
      `}
    />
  );
};

// Netflix/YouTube style card skeleton
export const CardSkeleton = ({ className = '', aspectRatio = '2/3' }) => (
  <div 
    className={`bg-gray-800/60 rounded-lg overflow-hidden ${shimmerAnimation} ${className}`}
    style={{ aspectRatio }}
  >
    <div className="w-full h-full flex flex-col">
      {/* Main image area */}
      <div className="flex-1 bg-gray-700/60"></div>
      
      {/* Content area */}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-700/60 rounded w-full"></div>
        <div className="h-3 bg-gray-700/60 rounded w-3/4"></div>
        <div className="h-3 bg-gray-700/60 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

export const ImageSkeleton = ({ className = '', aspectRatio = '2/3' }) => (
  <div 
    className={`bg-gray-800/60 rounded-lg ${shimmerAnimation} ${className}`}
    style={{ aspectRatio }}
  />
);

// YouTube style text skeleton with multiple lines
export const TextSkeleton = ({ lines = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i}
        className={`
          h-4 bg-gray-800/60 rounded
          ${shimmerAnimation}
          ${i === 0 ? 'w-full' : i === lines - 1 ? 'w-2/3' : 'w-5/6'}
        `}
      />
    ))}
  </div>
);

// Netflix style button skeleton
export const ButtonSkeleton = ({ className = '', width = 'w-24', height = 'h-10' }) => (
  <div className={`${width} ${height} bg-gray-800/60 rounded-md ${shimmerAnimation} ${className}`} />
);

// YouTube style search result skeleton
export const SearchSkeleton = ({ className = '' }) => (
  <div className={`flex items-start space-x-4 p-4 ${className}`}>
    {/* Thumbnail */}
    <div className={`w-40 h-24 bg-gray-800/60 rounded-lg flex-shrink-0 ${shimmerAnimation}`} />
    
    {/* Content */}
    <div className="flex-1 space-y-3">
      <div className={`h-5 bg-gray-800/60 rounded w-4/5 ${shimmerAnimation}`} />
      <div className={`h-4 bg-gray-800/60 rounded w-3/5 ${shimmerAnimation}`} />
      <div className={`h-3 bg-gray-800/60 rounded w-2/5 ${shimmerAnimation}`} />
    </div>
  </div>
);

// YouTube style grid skeleton
export const GridSkeleton = ({ count = 12, className = '' }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Netflix style row skeleton
export const RowSkeleton = ({ title, count = 6, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {title && (
      <div className="flex items-center space-x-3">
        <div className={`h-7 bg-gray-800/60 rounded w-48 ${shimmerAnimation}`} />
      </div>
    )}
    <div className="flex space-x-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-48">
          <CardSkeleton aspectRatio="16/9" />
        </div>
      ))}
    </div>
  </div>
);

// YouTube style loading dots component
export const LoadingDots = ({ 
  size = 'sm', 
  color = 'white', 
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-0.5 h-3',
    sm: 'w-1 h-4', 
    md: 'w-1.5 h-5',
    lg: 'w-2 h-6'
  };
  
  const colorClasses = {
    white: 'bg-white/60',
    gray: 'bg-gray-400/60',
    yellow: 'bg-yellow-400/60',
    red: 'bg-red-400/60',
    purple: 'bg-purple-400/60'
  };

  return (
    <div className={`flex space-x-1 items-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
        style={{ animation: 'loading-dots 1.4s infinite', animationDelay: '0ms' }}
      ></div>
      <div 
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
        style={{ animation: 'loading-dots 1.4s infinite', animationDelay: '0.2s' }}
      ></div>
      <div 
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
        style={{ animation: 'loading-dots 1.4s infinite', animationDelay: '0.4s' }}
      ></div>
    </div>
  );
};

export default Skeleton;
