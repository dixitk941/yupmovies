import React, { useState, useEffect, useRef, memo } from 'react';
import SimpleOptimizedImage from '../components/SimpleOptimizedImage';
import { formatDateString, debugDate } from '../services/utils.js';

// Cache for loaded images to prevent re-loading after modal close
const loadedImagesCache = new Set();

const MovieCard = memo(({ movie, onClick, index, showNumber, useOptimizedImage = false }) => {
  const imageSrc = 
    movie?.featuredImage || 
    movie?.featured_image ||
    movie?.poster || 
    movie?.posterUrl || 
    movie?.image;

  // Use cache to determine if image was already loaded
  const wasImageLoaded = imageSrc ? loadedImagesCache.has(imageSrc) : false;
  
  const [isLoaded, setIsLoaded] = useState(wasImageLoaded);
  const [isMobile, setIsMobile] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  // Ref to prevent state updates if component unmounts
  const mountedRef = useRef(true);

  useEffect(() => {
    // If image was already cached, ensure we're in loaded state
    if (wasImageLoaded && !isLoaded) {
      setIsLoaded(true);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [wasImageLoaded, isLoaded]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!movie || !movie.title) return null;

  // Clean title processing
  const yearMatch = movie.title.match(/\((\d{4})\)/);
  const year = movie.releaseYear || (yearMatch ? yearMatch[1] : '');
  let cleanTitle = movie.title;
  if (yearMatch) {
    cleanTitle = movie.title.replace(yearMatch[0], '').trim();
  }

  // Enhanced logic to check for download availability
  const hasDownloads = !!(
    // 1. Check for download links array
    (movie.downloadLinks && movie.downloadLinks.length > 0) || 
    // 2. Check for raw links string
    (movie.links && typeof movie.links === 'string' && movie.links.trim().length > 0 && 
     (movie.links.includes('?download') || movie.links.includes('download'))) ||
    // 3. Check for available qualities array
    (movie.availableQualities && movie.availableQualities.length > 0) ||
    // 4. Check for download field in content object
    (movie.content?.download && movie.content.download.length > 0)
  );

  // Date formatting - now using the centralized utility function
  const getDisplayDate = () => {
    // First priority is modified_date from database
    if (movie.modified_date) return formatDateString(movie.modified_date);
    // Second priority is modifiedDate (transformed property)
    if (movie.modifiedDate) return formatDateString(movie.modifiedDate);
    // Third priority is date
    if (movie.date) return formatDateString(movie.date);
    // Fourth priority is publishDate
    if (movie.publishDate) return formatDateString(movie.publishDate);
    // No date available
    return '';
  };

  const displayDate = getDisplayDate();

  // CRITICAL FIX: Proper click handler that prevents page reload
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Enhanced debugging using our utility
    console.log('📅 DATE DEBUG - Movie details:', debugDate(movie));
    
    onClick(movie);
  };

  // Handle image error
  const handleImageError = (e) => {
    if (mountedRef.current) {
      setImgError(true);
      setIsLoaded(true);
    }
  };

  // Enhanced image load handler with caching
  const handleImageLoad = (e) => {
    if (mountedRef.current) {
      setIsLoaded(true);
      // Add to cache to prevent re-loading
      if (imageSrc) {
        loadedImagesCache.add(imageSrc);
      }
    }
  };

  // Default Placeholder Component
  const DefaultPlaceholder = ({ title }) => (
    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-gray-400 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px'
        }} />
      </div>
      
      <div className="text-3xl mb-2 opacity-60">🎬</div>
      <div className="text-center px-2">
        <div className="text-xs font-medium mb-1 line-clamp-2 leading-tight">
          {title.length > 12 ? title.substring(0, 12) + '...' : title}
        </div>
        <div className="text-[9px] opacity-60">No Image</div>
      </div>
      <div className="absolute inset-0 border-2 border-dashed border-gray-700 opacity-30 rounded-lg"></div>
    </div>
  );

  return (
    <div className={`group relative ${showNumber ? 'pl-6' : ''}`}>
      {/* Trending Number */}
      {showNumber && (
        <div className="absolute -left-1 top-0 bottom-0 flex items-center z-10">
          <span className="text-2xl font-black text-gray-800/30 leading-none">
            {index + 1}
          </span>
        </div>
      )}

      {/* Main Card */}
      <div
        className={`
          relative cursor-pointer rounded-lg overflow-hidden bg-black/80 backdrop-blur-sm
          transition-all duration-300 ease-out
          w-[112px] flex-shrink-0
          ${isMobile ? 'active:scale-95' : ''}
        `}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${cleanTitle}`}
      >
        {/* FIXED ASPECT RATIO CONTAINER */}
        <div 
          className="relative w-full"
          style={{ aspectRatio: '2/3' }}
        >
          {/* Loading State */}
          {!isLoaded && !imgError && imageSrc && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center z-10">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
            </div>
          )}

          {/* Image or Default Placeholder */}
          {imgError || !imageSrc ? (
            <DefaultPlaceholder title={cleanTitle} />
          ) : useOptimizedImage ? (
            <SimpleOptimizedImage
              src={imageSrc}
              alt={cleanTitle}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              width={112}
              height={168}
              priority={index < 6} // Only prioritize first 6 images
              lazy={index >= 6} // Lazy load images after first 6
            />
          ) : (
            <img
              src={imageSrc}
              alt={cleanTitle}
              width={112}
              height={168}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading={index >= 6 ? "lazy" : "eager"}
              decoding="async"
              draggable="false"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          )}

          {/* Download Indicator removed */}

          {/* Excerpt badge at the bottom center of the image */}
          {movie.excerpt && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600/90 backdrop-blur-sm text-white text-[8px] px-1.5 py-0.5 rounded font-medium max-w-[80px] text-center whitespace-nowrap overflow-hidden">
              {movie.excerpt.length > 15 ? movie.excerpt.substring(0, 15) + '...' : movie.excerpt}
            </div>
          )}

          {/* Watch Now badge below the excerpt badge */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm text-black text-[8px] px-2 py-0.5 rounded font-medium text-center whitespace-nowrap">
            Watch Now
          </div>

          {/* Gradient Overlay removed for cleaner image */}
        </div>

        {/* Title and Date Section - Below Image */}
        <div className="p-2 bg-black/90">
          {/* Date display - above title */}
          <div className="text-gray-400 text-[8px] mb-1">
            {displayDate ? displayDate : 'Unknown Date'}
          </div>

          <h3 className="text-white font-bold text-[12px] line-clamp-2 leading-tight">
            {cleanTitle.length > 15 ? cleanTitle.substring(0, 15) + '...' : cleanTitle}
          </h3>
        </div>
      </div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;
