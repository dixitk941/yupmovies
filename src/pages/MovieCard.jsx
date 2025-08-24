import React, { useState, useEffect } from 'react';
import { Play, Info, Plus, Heart } from 'lucide-react';

const MovieCard = ({ movie, onClick, index, showNumber }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Image selection with fallback
  const imageSrc = 
    movie?.featured_image || 
    movie?.featuredImage ||
    movie?.poster || 
    movie?.posterUrl || 
    movie?.image;

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

  const hasDownloads = !!(movie.links && typeof movie.links === 'string' && movie.links.trim() !== '');

  // Handle image error
  const handleImageError = (e) => {
    if (!imgError) {
      setImgError(true);
      setIsLoaded(true);
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

      {/* Main Card - 30% SMALLER SIZE (112px width) */}
      <div
        className={`
          relative cursor-pointer rounded-lg overflow-hidden bg-black/80 backdrop-blur-sm
          transition-all duration-300 ease-out
          w-[112px] flex-shrink-0
          ${isMobile 
            ? 'active:scale-95' 
            : `transform ${isHovered ? 'scale-110 z-40 shadow-2xl shadow-black/60' : 'hover:scale-105'}`
          }
        `}
        onClick={() => onClick(movie)}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
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
          ) : (
            <img
              src={imageSrc}
              alt={cleanTitle}
              width={112}
              height={168}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setIsLoaded(true)}
              onError={handleImageError}
              loading="lazy"
              draggable="false"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          )}

          {/* Download Indicator */}
          {hasDownloads && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full ring-1 ring-black/50 z-20"></div>
          )}

          {/* Gradient Overlay - only for real images */}
          {!imgError && imageSrc && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
          )}

          {/* Mobile Always-On Content */}
          {isMobile && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
              <h3 className="text-white font-bold text-xs mb-1 line-clamp-2 leading-tight">
                {cleanTitle.length > 15 ? cleanTitle.substring(0, 15) + '...' : cleanTitle}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-[10px]">{year}</span>
                {movie.rating && (
                  <span className="text-yellow-400 text-[10px] font-medium">
                    ★ {movie.rating}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Desktop Hover Content */}
          {!isMobile && (
            <>
              {/* Play Button Overlay */}
              <div 
                className={`
                  absolute inset-0 flex items-center justify-center z-10
                  transition-all duration-300
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}
              >
                <button className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors duration-200">
                  <Play className="w-3 h-3 text-black ml-0.5" fill="currentColor" />
                </button>
              </div>

              {/* Bottom Info Overlay */}
              <div 
                className={`
                  absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent z-10
                  transition-all duration-300
                  ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                `}
              >
                <h3 className="text-white font-bold text-xs mb-1 line-clamp-2 leading-tight">
                  {cleanTitle.length > 15 ? cleanTitle.substring(0, 15) + '...' : cleanTitle}
                </h3>
                
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300 text-[10px]">{year}</span>
                  {movie.rating && (
                    <span className="text-yellow-400 text-[10px] font-medium">
                      ★ {movie.rating}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1">
                  <button className="w-4 h-4 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <Play className="w-2 h-2 text-black ml-0.5" fill="currentColor" />
                  </button>
                  <button className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center hover:border-white transition-colors">
                    <Plus className="w-2 h-2 text-gray-400 group-hover:text-white" />
                  </button>
                  <button className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center hover:border-white transition-colors">
                    <Info className="w-2 h-2 text-gray-400 group-hover:text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
