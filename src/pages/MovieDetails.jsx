import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info } from 'lucide-react';
import { generateSecureToken } from '../utils/secureTokens.js'; // Adjust the path as needed


const MovieDetails = ({ movie, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'cast', 'screenshots'
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hoveredQuality, setHoveredQuality] = useState(null);
  const [expandGenres, setExpandGenres] = useState(false);
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const screenshotTimerRef = useRef(null);
  const backdropRef = useRef(null);
  
  // Extract year from title if available
  const yearMatch = movie.title.match(/\((\d{4})\)/);
  const year = yearMatch ? yearMatch[1] : '';
  
  // Handle screen size detection with breakpoint system
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Track scroll position for dynamic header
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setScrollPosition(contentRef.current.scrollTop);
      }
    };
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // Add entrance animation after component mounts
  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 50);
    
    // Add fancy backdrop animation
    if (backdropRef.current) {
      setTimeout(() => {
        backdropRef.current.classList.add('animate-ken-burns');
      }, 200);
    }
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Auto-rotate screenshots every 5 seconds if they're visible
  useEffect(() => {
    clearTimeout(screenshotTimerRef.current);
    
    if (movie.movie_screenshots?.length > 1 && 
        ((isMobile && activeTab === 'screenshots') || !isMobile)) {
      screenshotTimerRef.current = setTimeout(() => {
        nextScreenshot();
      }, 5000);
    }
    
    return () => clearTimeout(screenshotTimerRef.current);
  }, [activeTab, activeScreenshot, movie.movie_screenshots, isMobile]);
  
  const handleDownload = (size) => {
    if (!movie || !movie.final_links || !Array.isArray(movie.final_links)) {
      showToast("No download links available");
      return;
    }
  
    // Find a link that matches the selected size
    const link = movie.final_links.find(link => {
      const linkSize = link.size || "";
      return linkSize.toLowerCase() === size.toLowerCase();
    });
  
    if (link) {
      try {
        // Get movie ID or generate one if not available
        const movieId = movie.id || generateUniqueId(movie.title);
        
        // Use the secure token generation function from secureTokens.js
        const token = generateSecureToken(movieId, size);
        
        // Use a secure redirect URL with the token
        const redirectUrl = `https://my-blog-five-amber-64.vercel.app/secure-download?token=${encodeURIComponent(token)}`;
        
        // Open the redirect URL in a new tab
        window.open(redirectUrl, '_blank');
        
        // Show toast with less specific information
        showToast(`Starting download in ${size}`);
        
        // Optional: Track download for analytics
        trackDownload(movieId, size);
      } catch (error) {
        console.error("Download error:", error);
        showToast("Download failed. Please try again.");
      }
    } else {
      showToast(`Download link unavailable for ${size}`);
    }
  };
  
  // Helper function to generate a unique ID from the title (keep your existing function)
  const generateUniqueId = (title) => {
    if (!title) return Math.random().toString(36).substring(2, 15);
    
    // Create a slug from title and add timestamp for uniqueness
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
      
    return `${slug}-${Date.now().toString(36)}`;
  };
  
  // Update the tracking function to be more secure
  const trackDownload = (movieId, quality) => {
    try {
      // Use a secure token here too for tracking
      const trackToken = generateSecureToken(movieId.substring(0, 10), "track");
      
      // Example - using a more secure tracking approach
      const trackingPixel = new Image();
      trackingPixel.src = `https://my-blog-five-amber-64.vercel.app/track?e=d&t=${encodeURIComponent(trackToken)}`;
    } catch (e) {
      // Silent fail for tracking
    }
  };
  
  // Simple toast notification function
  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg z-[100] animate-fadeIn';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-fadeOut');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };
  
  const nextScreenshot = useCallback(() => {
    if (movie.movie_screenshots && movie.movie_screenshots.length > 0) {
      setActiveScreenshot((prev) => (prev + 1) % movie.movie_screenshots.length);
    }
  }, [movie.movie_screenshots]);
  
  const prevScreenshot = useCallback(() => {
    if (movie.movie_screenshots && movie.movie_screenshots.length > 0) {
      setActiveScreenshot((prev) => (prev - 1 + movie.movie_screenshots.length) % movie.movie_screenshots.length);
    }
  }, [movie.movie_screenshots]);

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-0 overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="movie-details-title"
    >
      {/* Subtle background animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-[#100818]/30 to-black/40 animate-gradient-shift"></div>
      
      {/* Shimmering particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white opacity-30 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Main modal container */}
      <div 
        ref={modalRef}
        className={`relative w-full h-full md:h-[95%] md:w-[94%] lg:h-[90%] xl:max-w-7xl bg-gradient-to-b from-[#0a0a0a] to-black rounded-none md:rounded-2xl overflow-hidden shadow-2xl border border-gray-800/30
          ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-500`}
        onClick={e => e.stopPropagation()}
      >
        {/* Dynamic header that changes on scroll */}
        <div className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrollPosition > 100 ? 'bg-black/90 backdrop-blur-md shadow-xl' : 'bg-transparent'
        }`}>
          <div className="flex items-center justify-between p-3 md:p-4">
            {/* Movie title in header (only visible on scroll) */}
            <h3 className={`transition-all duration-300 truncate ${
              scrollPosition > 100 ? 'opacity-100 max-w-[200px] md:max-w-md' : 'opacity-0 max-w-0'
            } text-white font-medium`}>
              {movie.title}
            </h3>
            
            {/* Close button */}
            <button 
              className="bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-colors duration-200 ml-auto"
              onClick={onClose}
              aria-label="Close details"
            >
              <X size={isMobile ? 18 : 22} />
            </button>
          </div>
        </div>
        
        {/* Hero section with enhanced backdrop */}
        <div className="relative h-[40vh] sm:h-[45vh] md:h-[55vh] lg:h-[60vh] w-full overflow-hidden">
          {/* Background shimmer loading effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse"></div>
          
          {/* Main backdrop image with enhanced animation */}
          <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
            <img 
              src={movie.featured_image || movie.image} 
              alt={movie.title} 
              className="w-full h-full object-cover transition-opacity duration-700 opacity-0 onload-visible"
              onLoad={(e) => {
                e.target.classList.add('opacity-100');
                e.target.classList.remove('onload-visible');
              }}
            />
          </div>

          {/* Enhanced gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black via-black/90 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/90 to-transparent"></div>
          
          {/* Side gradients for more dimension */}
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-black/70 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-black/70 to-transparent"></div>
          
          {/* Movie title and actions - positioned for cinematic feel */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
              <div className="flex-1">
                {/* Movie rating badge */}
                {movie.rating && (
                  <div className="inline-block mb-2.5 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                    <Star size={12} className="inline mr-1 fill-yellow-400" /> {movie.rating} Rating
                  </div>
                )}
                
                <h2 
                  id="movie-details-title" 
                  className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-2 md:mb-3 drop-shadow-lg"
                >
                  {movie.title}
                </h2>
                
                {/* Key info highlights */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs md:text-sm text-gray-300 md:mb-2">
                  {year && (
                    <span className="flex items-center">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {year}
                    </span>
                  )}
                  {movie.duration && (
                    <span className="flex items-center">
                      <Clock size={14} className="mr-1 text-gray-400" />
                      {movie.duration}
                    </span>
                  )}
                  {movie.category && movie.category[0] && (
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
                      {movie.category[0]}
                    </span>
                  )}
                  <span className="text-xs border border-gray-600 px-1 rounded">HD</span>
                </div>
              </div>
              
              {/* Action buttons - now with ripple effects */}
              <div className="flex items-center gap-2.5 md:gap-3">
                {/* Save button */}
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <Bookmark size={isMobile ? 16 : 18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                {/* Like button */}
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <ThumbsUp size={isMobile ? 16 : 18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                {/* Share button */}
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <Share2 size={isMobile ? 16 : 18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* IMPROVED DOWNLOAD SECTION - Always visible with clear icons */}
        {movie.final_links && movie.final_links.length > 0 && (
          <div className="relative z-50 bg-gradient-to-r from-red-900/40 via-purple-900/30 to-red-900/40 border-y border-red-500/30 py-3 px-4 md:px-8 overflow-visible">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="text-sm md:text-base text-white font-medium flex items-center">
                <Download size={18} className="mr-2 text-red-400" />
                <span>Download {movie.title.split('(')[0].trim()}:</span>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {movie.final_links.map((link, index) => (
                  <button
                    key={index}
                    onClick={() => handleDownload(link.size)}
                    className="relative overflow-hidden group transform transition-all duration-300 hover:scale-105 focus:scale-105 focus:outline-none"
                  >
                    <div className="bg-gradient-to-br from-red-600 to-purple-600 rounded-md px-3 md:px-4 py-1.5 md:py-2 text-white font-medium flex items-center gap-2 shadow-lg shadow-red-900/20">
                      <Download size={isMobile ? 14 : 16} className="text-white" />
                      <span className="text-sm">{link.size}</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 group-active:opacity-30 transition-opacity duration-300 rounded-md"></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation tabs for mobile */}
        {isMobile && (
          <div className="flex items-center justify-around border-b border-gray-800 bg-black/90 backdrop-blur-sm sticky top-0 z-10">
            <button 
              className={`flex-1 py-3.5 text-sm font-medium relative overflow-hidden ${activeTab === 'details' ? 'text-red-500' : 'text-gray-400'}`}
              onClick={() => setActiveTab('details')}
            >
              Details
              {activeTab === 'details' && (
                <>
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-red-400"></span>
                  <span className="absolute bottom-0 left-0 w-16 h-0.5 bg-white/30 animate-slide-right"></span>
                </>
              )}
            </button>
            {movie.cast && movie.cast.length > 0 && (
              <button 
                className={`flex-1 py-3.5 text-sm font-medium relative overflow-hidden ${activeTab === 'cast' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('cast')}
              >
                Cast
                {activeTab === 'cast' && (
                  <>
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-red-400"></span>
                    <span className="absolute bottom-0 left-0 w-16 h-0.5 bg-white/30 animate-slide-right"></span>
                  </>
                )}
              </button>
            )}
            {movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
              <button 
                className={`flex-1 py-3.5 text-sm font-medium relative overflow-hidden ${activeTab === 'screenshots' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('screenshots')}
              >
                Photos
                {activeTab === 'screenshots' && (
                  <>
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-red-400"></span>
                    <span className="absolute bottom-0 left-0 w-16 h-0.5 bg-white/30 animate-slide-right"></span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Scrollable content area */}
        <div 
          ref={contentRef}
          className="overflow-y-auto h-[calc(60vh-56px)] md:h-[calc(50vh-56px)] lg:h-[calc(40vh-56px)] overscroll-contain" 
        >
          <div className="p-4 md:p-6 lg:p-8">
            {/* Mobile view - tab based content */}
            {isMobile && (
              <>
                {activeTab === 'details' && (
                  <div className="animate-fadeIn">
                    <p className="text-gray-300 text-sm leading-relaxed mb-6">
                      {movie.description || "No description available."}
                    </p>
                    
                    {/* Movie details tags */}
                    <div className="mb-6 space-y-6">
                      {movie.category && movie.category.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-xs mb-2 block flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                            Genres
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {movie.category.slice(0, expandGenres ? movie.category.length : 4).map((genre, idx) => (
                              <span 
                                key={idx}
                                className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-300 border border-red-600/30"
                              >
                                {genre}
                              </span>
                            ))}
                            {!expandGenres && movie.category.length > 4 && (
                              <button 
                                className="text-xs text-red-500 underline"
                                onClick={() => setExpandGenres(true)}
                              >
                                +{movie.category.length - 4} more
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Languages */}
                      {movie.language && movie.language.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-xs mb-2 block flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                            Languages
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {movie.language.map((lang, idx) => (
                              <span 
                                key={idx}
                                className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 border border-blue-600/30"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* More films like this */}
                    {movie.similar_movies && movie.similar_movies.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-base font-semibold mb-3 flex items-center">
                          <span className="h-4 w-1.5 bg-gradient-to-b from-red-500 to-purple-600 mr-2 rounded-full"></span>
                          More Like This
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {movie.similar_movies.slice(0, 6).map((similarMovie, idx) => (
                            <div 
                              key={idx} 
                              className="rounded-lg overflow-hidden relative group cursor-pointer shadow-lg transform transition-transform duration-300 hover:scale-105"
                            >
                              <img 
                                src={similarMovie.image} 
                                alt={similarMovie.title} 
                                className="w-full h-28 object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                                <span className="text-xs text-white line-clamp-2">{similarMovie.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'cast' && movie.cast && movie.cast.length > 0 && (
                  <div className="animate-fadeIn">
                    <div className="grid grid-cols-2 gap-3">
                      {movie.cast.map((actor, idx) => (
                        <div 
                          key={idx} 
                          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-3 rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-[1.02]"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full mb-2 flex items-center justify-center text-white">
                            {actor.charAt(0)}
                          </div>
                          <p className="text-white text-sm font-medium">{actor}</p>
                          <p className="text-gray-400 text-xs">Character</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {activeTab === 'screenshots' && movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
                  <div className="animate-fadeIn">
                    <div className="relative rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={movie.movie_screenshots[activeScreenshot]}
                        alt={`Screenshot ${activeScreenshot + 1}`}
                        className="w-full h-auto object-cover"
                      />
                      
                      {/* Navigation arrows - more visually appealing */}
                      <div className="absolute inset-0 flex items-center justify-between px-2">
                        <button 
                          className="bg-black/50 backdrop-blur-sm rounded-full p-2 transition-transform duration-300 hover:scale-110"
                          onClick={(e) => {
                            e.stopPropagation();
                            prevScreenshot();
                          }}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        
                        <button 
                          className="bg-black/50 backdrop-blur-sm rounded-full p-2 transition-transform duration-300 hover:scale-110"
                          onClick={(e) => {
                            e.stopPropagation();
                            nextScreenshot();
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      
                      {/* Improved screenshot counter */}
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full">
                        {activeScreenshot + 1}/{movie.movie_screenshots.length}
                      </div>
                    </div>
                    
                    {/* Improved dot indicators */}
                    <div className="flex justify-center gap-1.5 mt-4">
                      {movie.movie_screenshots.map((_, index) => (
                        <button
                          key={index}
                          className={`transition-all duration-300 ${
                            activeScreenshot === index 
                              ? 'w-6 h-1.5 bg-gradient-to-r from-red-600 to-red-500 rounded-full' 
                              : 'w-1.5 h-1.5 bg-gray-600 rounded-full hover:bg-gray-500'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScreenshot(index);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Desktop view - all content visible */}
            {!isMobile && (
              <>
                {/* Movie info grid layout - responsive for tablet/desktop */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left column - description and genres */}
                  <div className="md:col-span-2">
                    {/* Description with highlight */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-900/30 p-5 rounded-lg mb-6 shadow-lg">
                      <h3 className="font-medium text-lg mb-3 flex items-center">
                        <Info size={16} className="mr-2 text-red-500" />
                        Overview
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {movie.description || "No description available."}
                      </p>
                    </div>
                    
                    {/* Movie metadata - improved layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                      {/* Cast info */}
                      {movie.cast && movie.cast.length > 0 && (
                        <div className="bg-gradient-to-br from-gray-900/70 to-gray-900/30 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-800/30 hover:border-blue-600/30 transition-colors duration-300">
                          <h4 className="text-sm uppercase text-gray-400 mb-2.5 flex items-center">
                            <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-2"></span>
                            Cast
                          </h4>
                          <p className="text-white text-sm">{movie.cast.join(', ')}</p>
                        </div>
                      )}
                      
                      {/* Languages */}
                      {movie.language && movie.language.length > 0 && (
                        <div className="bg-gradient-to-br from-gray-900/70 to-gray-900/30 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-800/30 hover:border-green-600/30 transition-colors duration-300">
                          <h4 className="text-sm uppercase text-gray-400 mb-2.5 flex items-center">
                            <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                            Available in
                          </h4>
                          <p className="text-white text-sm">{movie.language.join(', ')}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Genres/Categories */}
                    {movie.category && movie.category.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                          <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-2"></span>
                          Genres
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {movie.category.map((genre, idx) => (
                            <span 
                              key={idx}
                              className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30 transition-colors duration-200 cursor-pointer"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right column - screenshots - OPTIMIZED */}
                  <div className="md:col-span-1">
                    {movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm uppercase text-gray-400 flex items-center">
                            <span className="w-1 h-4 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full mr-2"></span>
                            Screenshots
                            <span className="text-xs ml-2 text-gray-500">({movie.movie_screenshots.length})</span>
                          </h3>
                          <div className="flex gap-1">
                            <button 
                              className="bg-gray-800/80 hover:bg-gray-700/80 p-1 rounded text-xs"
                              onClick={() => setActiveScreenshot(Math.max(0, activeScreenshot - 1))}
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button 
                              className="bg-gray-800/80 hover:bg-gray-700/80 p-1 rounded text-xs"
                              onClick={() => setActiveScreenshot(Math.min(movie.movie_screenshots.length - 1, activeScreenshot + 1))}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Main screenshot with enhanced interactive features */}
                        <div className="relative rounded-lg overflow-hidden shadow-xl group">
                          <img 
                            src={movie.movie_screenshots[activeScreenshot]}
                            alt={`Screenshot ${activeScreenshot + 1}`}
                            className="w-full h-auto object-cover rounded-lg transition-all duration-500"
                          />
                          
                          {/* Always visible navigation controls on hover */}
                          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button 
                              className="bg-black/50 backdrop-blur-sm rounded-full p-2 transform transition-all duration-200 hover:scale-110 hover:bg-black/70"
                              onClick={(e) => {
                                e.stopPropagation();
                                prevScreenshot();
                              }}
                            >
                              <ChevronLeft size={20} />
                            </button>
                            
                            <button 
                              className="bg-black/50 backdrop-blur-sm rounded-full p-2 transform transition-all duration-200 hover:scale-110 hover:bg-black/70"
                              onClick={(e) => {
                                e.stopPropagation();
                                nextScreenshot();
                              }}
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                          
                          {/* Enhanced counter with blurred background */}
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-xs px-2.5 py-1 rounded-md">
                            {activeScreenshot + 1}/{movie.movie_screenshots.length}
                          </div>
                        </div>
                        
                        {/* Improved thumbnail navigation with scrolling support */}
                        <div className="relative mt-3">
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {movie.movie_screenshots.map((screenshot, index) => (
                              <button
                                key={index}
                                className={`flex-shrink-0 rounded-md overflow-hidden transition-all duration-200 ${
                                  activeScreenshot === index 
                                    ? 'ring-2 ring-red-600 scale-[1.03]' 
                                    : 'opacity-60 hover:opacity-100 hover:scale-[1.03]'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveScreenshot(index);
                                }}
                              >
                                <img 
                                  src={screenshot}
                                  alt={`Thumbnail ${index + 1}`}
                                  className="w-16 h-12 object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                          
                          {/* Show all screenshots button if there are many */}
                          {movie.movie_screenshots.length > 5 && (
                            <button 
                              className="mt-2 w-full py-1.5 bg-gray-800/60 hover:bg-gray-700/80 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors duration-200 flex items-center justify-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Implementation for showing all screenshots in a grid/gallery view
                                // You could expand this into a modal or toggle to show all
                                setActiveTab && setActiveTab('screenshots');
                              }}
                            >
                              View All Screenshots
                            </button>
                          )}
                        </div>
                        
                        {/* Add a full-width screenshots grid view that shows when user wants to see all */}
                        {isTablet && !isMobile && (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {movie.movie_screenshots.map((screenshot, index) => (
                              <button
                                key={index}
                                className={`relative rounded-md overflow-hidden transition-all duration-200 ${
                                  activeScreenshot === index ? 'ring-2 ring-red-600' : 'opacity-80 hover:opacity-100'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveScreenshot(index);
                                }}
                              >
                                <img 
                                  src={screenshot}
                                  alt={`Screenshot ${index + 1}`}
                                  className="w-full aspect-video object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute bottom-1 right-1 bg-black/70 text-[10px] px-1.5 py-0.5 rounded-sm">
                                  {index + 1}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Keep the awards section or other content */}
                  </div>
                </div>
                
                {/* Similar movies section */}
                {movie.similar_movies && movie.similar_movies.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-800">
                    <h3 className="text-lg font-semibold mb-4">More Like This</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {movie.similar_movies.slice(0, 6).map((similarMovie, idx) => (
                        <div 
                          key={idx} 
                          className="rounded-lg overflow-hidden relative group cursor-pointer shadow-lg transform transition-transform duration-300 hover:scale-105"
                        >
                          <img 
                            src={similarMovie.image} 
                            alt={similarMovie.title} 
                            className="w-full h-28 object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                            <span className="text-xs text-white line-clamp-2">{similarMovie.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;