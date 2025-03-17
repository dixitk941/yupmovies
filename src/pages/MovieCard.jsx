import React, { useState, useEffect } from 'react';
import { Star, PlayCircle } from 'lucide-react';

const MovieCard = ({ movie, onClick, index, showNumber }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Safety check to prevent errors with incomplete data
  if (!movie || !movie.title || !movie.featured_image) {
    return null;
  }

  // Extract year from title if available
  const yearMatch = movie.title.match(/\((\d{4})\)/);
  const year = yearMatch ? yearMatch[1] : '';
  
  // Shorten title if it's too long
  const shortTitle = movie.title.length > 28 
    ? movie.title.substring(0, 28) + '...' 
    : movie.title;

  return (
    <div 
      className={`group relative overflow-hidden rounded-lg transition-all duration-300 ${
        isHovered ? 'scale-105 z-10 shadow-xl shadow-black/40' : ''
      } ${showNumber ? 'pl-8 md:pl-10' : ''}`}
      onClick={() => onClick(movie)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      // Add touch events for mobile
      onTouchStart={() => setIsHovered(true)}
      role="button"
      aria-label={`View details for ${movie.title}`}
    >
      {/* Trending Number - Optimized for mobile */}
      {showNumber && (
        <div className="absolute -left-1 md:-left-2 top-1/2 transform -translate-y-1/2 z-10">
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10">
            <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent drop-shadow-md">
              {index + 1}
            </span>
          </div>
        </div>
      )}
      
      {/* Image with skeleton loader */}
      <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse" />
        )}
        <img 
          src={movie.featured_image} 
          alt={movie.title} 
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
        
        {/* Overlay - Displayed differently on mobile */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent 
            ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
            transition-opacity duration-300 p-2 md:p-3 flex flex-col justify-end rounded-lg`}
        >
          {!isMobile && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
              <PlayCircle className="w-10 h-10 md:w-12 md:h-12 text-white opacity-80 hover:opacity-100 transition-all duration-300 hover:scale-110" />
            </div>
          )}
          
          <div className={`${isMobile ? '' : 'transform translate-y-4 group-hover:translate-y-0'} transition-transform duration-300`}>
            {/* On mobile, always show title at bottom with gradient background */}
            {isMobile ? (
              <>
                <h3 className="text-xs md:text-sm font-medium md:font-semibold truncate">{shortTitle}</h3>
            
                <div className="flex justify-between items-center text-[10px] md:text-xs mt-1 text-gray-300">
                  <span>{year}</span>
                  {movie.rating && (
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-500 mr-0.5 fill-current" />
                      <span>{movie.rating}</span>
                    </div>
                  )}
                </div>
                
                {/* Only show first genre on mobile to save space */}
                <div className="hidden md:flex flex-wrap gap-1 mt-2">
                  {movie.category && Array.isArray(movie.category) && movie.category.slice(0, 2).map((genre, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-purple-600 text-white uppercase tracking-wider font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                <div className="flex md:hidden mt-1">
                  {movie.category && Array.isArray(movie.category) && movie.category.slice(0, 1).map((genre, idx) => (
                    <span 
                      key={idx} 
                      className="text-[8px] px-1 py-0.5 rounded bg-gradient-to-r from-red-600 to-purple-600 text-white uppercase tracking-wider"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Desktop view */}
                <h3 className="text-sm font-semibold truncate">{shortTitle}</h3>
                
                <div className="flex justify-between items-center text-xs mt-1 text-gray-300">
                  <span>{year}</span>
                  {movie.rating && (
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-500 mr-0.5 fill-current" />
                      <span>{movie.rating}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {movie.category && Array.isArray(movie.category) && movie.category.slice(0, 2).map((genre, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-purple-600 text-white uppercase tracking-wider font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Visual indicator for tappable area on mobile */}
      <div className="md:hidden absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60"></div>
      </div>
    </div>
  );
};

export default MovieCard;