// **SIMPLE OPTIMIZED IMAGE COMPONENT**
// Focuses on reducing requests while maintaining good performance

import React, { useState, useCallback } from 'react';

export const SimpleOptimizedImage = React.memo(({ 
  src, 
  alt, 
  className = '', 
  lazy = true,
  onError,
  onLoad,
  priority = false,
  fallbackSrc,
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback((e) => {
    setIsLoaded(true);
    onLoad?.(e);
  }, [onLoad]);

  const handleError = useCallback((e) => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      // Try fallback image
      setCurrentSrc(fallbackSrc);
      setHasError(false);
    } else {
      // Final error state
      setHasError(true);
      onError?.(e);
    }
  }, [onError, hasError, fallbackSrc, currentSrc]);

  // Don't render if no src
  if (!currentSrc) {
    return null;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-70'
      } ${hasError ? 'opacity-30' : ''} ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      loading={lazy && !priority ? "lazy" : "eager"}
      decoding="async"
      {...props}
    />
  );
});

SimpleOptimizedImage.displayName = 'SimpleOptimizedImage';

export default SimpleOptimizedImage;
