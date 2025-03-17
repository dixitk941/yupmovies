import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Plus, ThumbsUp, Volume2, VolumeX, ChevronLeft, ChevronRight, Star, Calendar, Clock, Globe, Play, Info, Bookmark, Share2, Award } from 'lucide-react';

const MovieDetails = ({ movie, onClose }) => {
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'cast', 'screenshots'
  const [scrollPosition, setScrollPosition] = useState(0);
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  
  // Handle screen size detection with breakpoint system
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
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
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showQualityOptions && !event.target.closest('.quality-dropdown')) {
        setShowQualityOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQualityOptions]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Extract year from title if available
  const yearMatch = movie.title.match(/\((\d{4})\)/);
  const year = yearMatch ? yearMatch[1] : '';
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Auto-rotate screenshots every 5 seconds
  useEffect(() => {
    let interval;
    
    if (movie.movie_screenshots?.length > 1 && activeTab === 'screenshots') {
      interval = setInterval(() => {
        nextScreenshot();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, activeScreenshot, movie.movie_screenshots]);

  const handleDownload = (size) => {
    // Check if movie has final_links
    if (!movie || !movie.final_links || !Array.isArray(movie.final_links)) {
      console.error("No download links available for this movie");
      // Use toast notification instead of alert for better UX
      showToast("No download links available for this movie");
      return;
    }

    // Find a link that matches the selected size
    const link = movie.final_links.find(link => {
      const linkSize = link.size || "";
      return linkSize.toLowerCase() === size.toLowerCase();
    });

    if (link) {
      // Create a sanitized movie name for the URL
      const movieName = movie.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
      
      // Build the redirect URL with parameters
      const redirectUrl = `https://my-blog-five-amber-64.vercel.app/redirect?` +
        `title=${encodeURIComponent(movie.title)}` +
        `&quality=${encodeURIComponent(size)}` +
        `&id=${encodeURIComponent(movie.id || movieName)}`;
      
      // Open the redirect URL in a new tab
      window.open(redirectUrl, '_blank');
      
      // Close the quality options dropdown
      setShowQualityOptions(false);
    } else {
      console.error(`No download link found for size ${size}`);
      showToast(`No download link found for size ${size}`);
    }
  };
  
  // Simple toast notification function
  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-[100] animate-fadeIn';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-fadeOut');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };
  
  const nextScreenshot = () => {
    if (movie.movie_screenshots && movie.movie_screenshots.length > 0) {
      setActiveScreenshot((prev) => (prev + 1) % movie.movie_screenshots.length);
    }
  };
  
  const prevScreenshot = () => {
    if (movie.movie_screenshots && movie.movie_screenshots.length > 0) {
      setActiveScreenshot((prev) => (prev - 1 + movie.movie_screenshots.length) % movie.movie_screenshots.length);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-0 overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="movie-details-title"
    >
      {/* Main modal container */}
      <div 
        ref={modalRef}
        className={`relative w-full h-full lg:h-auto lg:w-[94%] lg:max-w-6xl bg-gradient-to-b from-[#131313] to-black rounded-none lg:rounded-xl overflow-hidden shadow-2xl border border-gray-800/30
          ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-300`}
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
        
        {/* Hero section with background image/video and gradient overlay */}
        <div className="relative h-[40vh] sm:h-[45vh] md:h-[60vh] w-full overflow-hidden">
          {/* Main backdrop image with shimmer loading effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-shimmer"></div>
          <img 
            src={movie.featured_image || movie.image} 
            alt={movie.title} 
            className="w-full h-full object-cover transition-opacity duration-500"
            onLoad={(e) => e.target.classList.add('opacity-100')}
            style={{opacity: 0}}
          />
                    
          {/* Video layer for trailers */}
          {movie.trailer_link && (
            <div className="absolute inset-0 bg-black/30">
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group transition-transform duration-300 hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Play trailer logic here
                  }}
                >
                  <Play size={isMobile ? 32 : 40} className="text-white ml-1 group-hover:text-red-500 transition-colors duration-200" fill="currentColor" />
                </button>
              </div>
              
              <button 
                className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-white/20"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX size={18} className="text-white" />
                ) : (
                  <Volume2 size={18} className="text-white" />
                )}
              </button>
            </div>
          )}

          {/* Advanced gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black via-black/80 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent"></div>
          
          {/* Movie title and actions - positioned for cinematic feel */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
              <div className="flex-1">
                {/* Movie rating badge - positioned above title */}
                {movie.rating && (
                  <div className="inline-block mb-2 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium">
                    <Star size={12} className="inline mr-1 fill-yellow-400" /> {movie.rating} Rating
                  </div>
                )}
                
                <h2 
                  id="movie-details-title" 
                  className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-1 md:mb-2 drop-shadow-lg"
                >
                  {movie.title}
                </h2>
                
                {/* Key info highlights */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-gray-300 md:mb-2">
                  {year && <span>{year}</span>}
                  {movie.duration && <span>{movie.duration}</span>}
                  {movie.category && movie.category[0] && <span>{movie.category[0]}</span>}
                  <span className="text-xs border border-gray-600 px-1 rounded">HD</span>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Download button with quality dropdown */}
                {movie.final_links && movie.final_links.length > 0 && (
                  <div className="relative quality-dropdown">
                    <button 
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold px-3 md:px-4 py-1.5 md:py-2 rounded transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQualityOptions(!showQualityOptions);
                      }}
                      aria-haspopup="true"
                      aria-expanded={showQualityOptions}
                    >
                      <Download size={isMobile ? 16 : 18} />
                      <span className={isMobile ? 'hidden' : ''}>Download</span>
                    </button>
                    
                    {/* Animated quality options dropdown */}
                    {showQualityOptions && (
                      <div className="absolute top-full right-0 mt-2 bg-[#212121] rounded-lg shadow-2xl border border-gray-700 w-48 z-50 overflow-hidden">
                        <div className="py-1">
                          {movie.final_links.map((link, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-4 py-3 hover:bg-red-600 text-white flex justify-between items-center group transition-colors duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(link.size);
                              }}
                            >
                              <span>{link.size || `Option ${index + 1}`}</span>
                              <Download size={16} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* My List button */}
                <button className="flex items-center justify-center bg-white/20 backdrop-blur-sm hover:bg-white/30 p-2.5 rounded-full transition-all duration-200">
                  <Bookmark size={isMobile ? 16 : 18} className="text-white" />
                </button>
                
                {/* Like button */}
                <button className="flex items-center justify-center bg-white/20 backdrop-blur-sm hover:bg-white/30 p-2.5 rounded-full transition-all duration-200">
                  <ThumbsUp size={isMobile ? 16 : 18} className="text-white" />
                </button>
                
                {/* Share button */}
                <button className="flex items-center justify-center bg-white/20 backdrop-blur-sm hover:bg-white/30 p-2.5 rounded-full transition-all duration-200">
                  <Share2 size={isMobile ? 16 : 18} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation tabs for mobile */}
        {isMobile && (
          <div className="flex items-center justify-around border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-20">
            <button 
              className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'details' ? 'text-red-500' : 'text-gray-400'}`}
              onClick={() => setActiveTab('details')}
            >
              Details
              {activeTab === 'details' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></span>}
            </button>
            {movie.cast && movie.cast.length > 0 && (
              <button 
                className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'cast' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('cast')}
              >
                Cast
                {activeTab === 'cast' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></span>}
              </button>
            )}
            {movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
              <button 
                className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'screenshots' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('screenshots')}
              >
                Photos
                {activeTab === 'screenshots' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></span>}
              </button>
            )}
          </div>
        )}

        {/* Scrollable content area */}
        <div 
          ref={contentRef}
          className="overflow-y-auto h-[60vh] md:max-h-[50vh] lg:max-h-[65vh] overscroll-contain"
        >
          <div className="p-4 md:p-6 lg:p-8">
            {/* Mobile view - tab based content */}
            {isMobile && (
              <>
                {activeTab === 'details' && (
                  <>
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                      {movie.description || "No description available."}
                    </p>
                    
                    {/* Movie details tags */}
                    <div className="mb-6">
                      {movie.category && movie.category.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-400 text-xs mb-2 block">Genres</span>
                          <div className="flex flex-wrap gap-1.5">
                            {movie.category.map((genre, idx) => (
                              <span 
                                key={idx}
                                className="inline-block text-xs px-2 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-600/30"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Languages */}
                      {movie.language && movie.language.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-400 text-xs mb-2 block">Languages</span>
                          <p className="text-white text-sm">{movie.language.join(', ')}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* More films like this */}
                    {movie.similar_movies && movie.similar_movies.length > 0 && (
                      <div>
                        <h3 className="text-base font-semibold mb-2 flex items-center">
                          <span className="h-4 w-1 bg-red-600 mr-2 rounded-full"></span>
                          More Like This
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {movie.similar_movies.slice(0, 3).map((similarMovie, idx) => (
                            <div key={idx} className="rounded overflow-hidden">
                              <img 
                                src={similarMovie.image} 
                                alt={similarMovie.title} 
                                className="w-full h-28 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {activeTab === 'cast' && movie.cast && movie.cast.length > 0 && (
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-3">
                      {movie.cast.map((actor, idx) => (
                        <div key={idx} className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-lg">
                          <div className="w-12 h-12 bg-gray-700 rounded-full mb-2 flex items-center justify-center text-gray-500">
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
                  <div className="mb-6">
                    <div className="relative rounded-lg overflow-hidden">
                      <img 
                        src={movie.movie_screenshots[activeScreenshot]}
                        alt={`Screenshot ${activeScreenshot + 1}`}
                        className="w-full h-auto object-cover"
                      />
                      
                      {/* Navigation arrows */}
                      <div className="absolute inset-0 flex items-center justify-between px-2">
                        <button 
                          className="bg-black/70 backdrop-blur-sm rounded-full p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            prevScreenshot();
                          }}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        
                        <button 
                          className="bg-black/70 backdrop-blur-sm rounded-full p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            nextScreenshot();
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      
                      {/* Screenshot counter */}
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-xs px-2 py-1 rounded-full">
                        {activeScreenshot + 1}/{movie.movie_screenshots.length}
                      </div>
                    </div>
                    
                    {/* Dot indicators */}
                    <div className="flex justify-center gap-1.5 mt-3">
                      {movie.movie_screenshots.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            activeScreenshot === index ? 'bg-red-600 w-4' : 'bg-gray-600'
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
                {/* Movie info grid layout */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Left column - description and genres */}
                  <div className="col-span-2">
                    {/* Description with highlight */}
                    <div className="bg-gradient-to-r from-gray-900 to-transparent p-5 rounded-lg mb-6">
                      <h3 className="font-medium text-lg mb-2 flex items-center">
                        <Info size={16} className="mr-2 text-red-500" />
                        Overview
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {movie.description || "No description available."}
                      </p>
                    </div>
                    
                    {/* Movie metadata */}
                    <div className="grid grid-cols-2 gap-5 mb-6">
                      {/* Cast info */}
                      {movie.cast && movie.cast.length > 0 && (
                        <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg">
                          <h4 className="text-sm uppercase text-gray-400 mb-2 flex items-center">
                            <span className="w-1 h-4 bg-blue-500 rounded-full mr-2"></span>
                            Cast
                          </h4>
                          <p className="text-white text-sm">{movie.cast.join(', ')}</p>
                        </div>
                      )}
                      
                      {/* Languages */}
                      {movie.language && movie.language.length > 0 && (
                        <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg">
                          <h4 className="text-sm uppercase text-gray-400 mb-2 flex items-center">
                            <span className="w-1 h-4 bg-green-500 rounded-full mr-2"></span>
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
                          <span className="w-1 h-4 bg-purple-500 rounded-full mr-2"></span>
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
                  
                  {/* Right column - screenshots */}
                  <div className="col-span-1">
                    {movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
                      <div>
                        <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                          <span className="w-1 h-4 bg-yellow-500 rounded-full mr-2"></span>
                          Screenshots
                        </h3>
                        
                        <div className="relative rounded-lg overflow-hidden shadow-xl">
                          <img 
                            src={movie.movie_screenshots[activeScreenshot]}
                            alt={`Screenshot ${activeScreenshot + 1}`}
                            className="w-full h-auto object-cover transition-opacity duration-500 opacity-100"
                          />
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-3">
                            <div className="flex gap-2">
                              <button 
                                className="bg-black/70 backdrop-blur-sm rounded-full p-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  prevScreenshot();
                                }}
                              >
                                <ChevronLeft size={18} />
                              </button>
                              
                              <span className="bg-black/70 backdrop-blur-sm text-xs px-2 py-1 rounded-full flex items-center">
                                {activeScreenshot + 1}/{movie.movie_screenshots.length}
                              </span>
                              
                              <button 
                                className="bg-black/70 backdrop-blur-sm rounded-full p-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  nextScreenshot();
                                }}
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Thumbnail navigation */}
                        <div className="grid grid-cols-5 gap-2 mt-3">
                          {movie.movie_screenshots.slice(0, 5).map((screenshot, index) => (
                            <button
                              key={index}
                              className={`rounded-md overflow-hidden transition-all duration-200 ${
                                activeScreenshot === index ? 'ring-2 ring-red-600 scale-105' : 'opacity-60 hover:opacity-100 hover:scale-105'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveScreenshot(index);
                              }}
                            >
                              <img 
                                src={screenshot}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-14 object-cover"
                                loading="lazy"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Awards section (placeholder) */}
                    {movie.awards && (
                      <div className="mt-6 bg-gradient-to-r from-yellow-900/20 to-transparent p-4 rounded-lg">
                        <h3 className="font-medium text-sm mb-2 flex items-center">
                          <Award size={16} className="mr-2 text-yellow-500" />
                          Awards
                        </h3>
                        <p className="text-gray-300 text-xs">
                          {movie.awards}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Similar movies section */}
                {movie.similar_movies && movie.similar_movies.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-800">
                    <h3 className="text-lg font-semibold mb-4">More Like This</h3>
                    <div className="grid grid-cols-6 gap-3">
                      {movie.similar_movies.slice(0, 6).map((similarMovie, idx) => (
                        <div key={idx} className="rounded overflow-hidden">
                          <img 
                            src={similarMovie.image} 
                            alt={similarMovie.title} 
                            className="w-full h-28 object-cover"
                          />
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