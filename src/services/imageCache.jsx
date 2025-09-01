// **OPTIMIZED IMAGE CACHE SERVICE**
// Reduces bandwidth by intelligently caching images and using lazy loading

import React from 'react';

class ImageCache {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.observer = null;
    this.maxCacheSize = 200; // Limit cache size to prevent memory issues
    this.compressionQuality = 0.85; // Compression quality for cached images
    
    this.initIntersectionObserver();
  }

  // **INTERSECTION OBSERVER FOR LAZY LOADING**
  initIntersectionObserver() {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const dataSrc = img.dataset.src;
            
            if (dataSrc && (img.dataset.loading === 'lazy' || !img.src || img.src.startsWith('data:'))) {
              this.loadImage(dataSrc).then(cachedSrc => {
                img.src = cachedSrc || dataSrc;
                img.classList.remove('loading');
                img.classList.add('loaded');
                img.removeAttribute('data-loading');
              }).catch(() => {
                // Fallback to original src on error
                img.src = dataSrc;
                img.classList.remove('loading');
                img.classList.add('error');
                img.removeAttribute('data-loading');
              });
              
              this.observer.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px 0px', // Start loading 50px before image enters viewport
        threshold: 0.1
      });
    }
  }

  // **INTELLIGENT IMAGE LOADING WITH CACHING**
  async loadImage(src) {
    if (!src) return null;

    // Return from cache if available
    if (this.cache.has(src)) {
      return this.cache.get(src);
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src);
    }

    // Create new loading promise
    const loadingPromise = this.fetchAndCacheImage(src);
    this.loadingPromises.set(src, loadingPromise);

    try {
      const cachedSrc = await loadingPromise;
      this.loadingPromises.delete(src);
      return cachedSrc;
    } catch (error) {
      this.loadingPromises.delete(src);
      throw error;
    }
  }

  // **FETCH AND CACHE IMAGE WITH COMPRESSION**
  async fetchAndCacheImage(src) {
    try {
      // For external images, try to load and cache
      if (src.startsWith('http')) {
        const response = await fetch(src, {
          mode: 'cors',
          cache: 'force-cache'
        });

        if (!response.ok) throw new Error('Failed to fetch image');

        const blob = await response.blob();
        
        // Create object URL for blob
        const objectUrl = URL.createObjectURL(blob);
        
        // Cache the object URL
        this.addToCache(src, objectUrl);
        return objectUrl;
      }

      // For local images, just cache the src
      this.addToCache(src, src);
      return src;
    } catch (error) {
      console.warn('Failed to cache image:', src, error);
      // Return original src as fallback
      return src;
    }
  }

  // **ADD TO CACHE WITH SIZE MANAGEMENT**
  addToCache(originalSrc, cachedSrc) {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      const firstValue = this.cache.get(firstKey);
      
      // Revoke object URL if it's a blob URL
      if (firstValue && firstValue.startsWith('blob:')) {
        URL.revokeObjectURL(firstValue);
      }
      
      this.cache.delete(firstKey);
    }

    this.cache.set(originalSrc, cachedSrc);
  }

  // **LAZY LOADING SETUP FOR IMAGE ELEMENTS**
  setupLazyLoading(img, src) {
    if (!this.observer || !src || !img) return;

    img.dataset.src = src;
    img.dataset.loading = 'lazy';
    img.classList.add('loading');
    
    // Add loading placeholder if none exists
    if (!img.src || img.src === '') {
      img.src = this.getPlaceholderImage();
    }

    this.observer.observe(img);
  }

  // **GENERATE PLACEHOLDER IMAGE**
  getPlaceholderImage() {
    // Create a simple gray placeholder using data URL
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    
    // Gray gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
    gradient.addColorStop(0, '#374151');
    gradient.addColorStop(1, '#1f2937');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 450);
    
    // Add film icon
    ctx.fillStyle = '#6b7280';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎬', 150, 240);
    
    return canvas.toDataURL('image/jpeg', 0.5);
  }

  // **PRELOAD IMPORTANT IMAGES**
  async preloadImages(imageSrcs, priority = 'low') {
    const promises = imageSrcs.slice(0, 10).map(src => // Limit to first 10 images
      this.loadImage(src).catch(() => null) // Ignore errors for preloading
    );

    if (priority === 'high') {
      return Promise.all(promises);
    } else {
      // Low priority - don't wait for all images
      Promise.all(promises).catch(() => {}); // Fire and forget
      return Promise.resolve();
    }
  }

  // **CLEAR CACHE**
  clearCache() {
    // Revoke all object URLs to prevent memory leaks
    for (const [src, cachedSrc] of this.cache.entries()) {
      if (cachedSrc && cachedSrc.startsWith('blob:')) {
        URL.revokeObjectURL(cachedSrc);
      }
    }
    
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // **GET CACHE STATS**
  getCacheStats() {
    return {
      totalCached: this.cache.size,
      maxSize: this.maxCacheSize,
      currentlyLoading: this.loadingPromises.size,
      memoryUsage: `${this.cache.size}/${this.maxCacheSize}`
    };
  }

  // **OPTIMIZE CACHE (REMOVE OLD ENTRIES)**
  optimizeCache() {
    if (this.cache.size > this.maxCacheSize * 0.8) {
      const keysToRemove = Array.from(this.cache.keys()).slice(0, Math.floor(this.maxCacheSize * 0.3));
      
      keysToRemove.forEach(key => {
        const cachedSrc = this.cache.get(key);
        if (cachedSrc && cachedSrc.startsWith('blob:')) {
          URL.revokeObjectURL(cachedSrc);
        }
        this.cache.delete(key);
      });
    }
  }
}

// **SINGLETON INSTANCE**
const imageCache = new ImageCache();

// **REACT HOOK FOR IMAGE CACHING**
export const useImageCache = (src) => {
  const [imageSrc, setImageSrc] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    imageCache.loadImage(src)
      .then(cachedSrc => {
        setImageSrc(cachedSrc || src);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
        setImageSrc(src); // Fallback to original src
      });
  }, [src]);

  return { imageSrc, loading, error };
};

// **OPTIMIZED IMAGE COMPONENT**
export const OptimizedImage = React.memo(({ 
  src, 
  alt, 
  className = '', 
  lazy = true,
  placeholder = true,
  onError,
  onLoad,
  priority = false,
  ...props 
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Use browser's native lazy loading instead of custom intersection observer
  // This reduces the number of requests significantly

  const handleLoad = React.useCallback((e) => {
    setIsLoaded(true);
    onLoad?.(e);
  }, [onLoad]);

  const handleError = React.useCallback((e) => {
    setHasError(true);
    onError?.(e);
  }, [onError]);

  // If no src provided, don't render anything
  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-70'
      } ${hasError ? 'opacity-50' : ''} ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      loading={lazy && !priority ? "lazy" : "eager"}
      decoding="async"
      {...props}
    />
  );
});
OptimizedImage.displayName = 'OptimizedImage';

// **BATCH IMAGE PRELOADER**
export const preloadBatchImages = async (imageSrcs, batchSize = 5) => {
  const batches = [];
  
  for (let i = 0; i < imageSrcs.length; i += batchSize) {
    batches.push(imageSrcs.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await imageCache.preloadImages(batch, 'low');
    // Small delay between batches to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

// **EXPORT FUNCTIONS**
export const preloadImages = (srcs, priority = 'low') => imageCache.preloadImages(srcs, priority);
export const clearImageCache = () => imageCache.clearCache();
export const getImageCacheStats = () => imageCache.getCacheStats();
export const optimizeImageCache = () => imageCache.optimizeCache();

// **AUTO CACHE OPTIMIZATION** (Disabled to reduce requests)
// setInterval(() => {
//   imageCache.optimizeCache();
// }, 5 * 60 * 1000); // Every 5 minutes

export default imageCache;
