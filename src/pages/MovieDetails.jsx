import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info } from 'lucide-react';
import CryptoJS from 'crypto-js';

const SECURITY_KEY = "6f1d8a3b9c5e7f2a4d6b8e0f1a3c7d9e2b4f6a8c1d3e5f7a0b2c4d6e8f0a1b3";

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
        // Create minimal download payload with only essential information
        const downloadPayload = {
          m: movie.id || generateUniqueId(movie.title),
          q: size,
          u: generateUserToken(),
          t: Date.now(),
          // Include the actual download link if available
          l: link.link || ""
        };
        
        // Convert payload to JSON string
        const jsonPayload = JSON.stringify(downloadPayload);
        
        // Encrypt the payload using AES with the security key
        const encryptedToken = CryptoJS.AES.encrypt(jsonPayload, SECURITY_KEY).toString();
        
        // URL-safe Base64 encoding
        const safeToken = encryptedToken
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        // Create the secure download URL with just the encrypted token
        const redirectUrl = `https://my-blog-five-amber-64.vercel.app/secure-download?t=${encodeURIComponent(safeToken)}`;
        
        // Open in new tab
        window.open(redirectUrl, '_blank');
        
        // Show toast with minimal information
        showToast(`Starting download for ${size}`);
        
        // Optional: Log download activity (non-identifying)
        logActivity('download_initiated', { quality: size });
      } catch (error) {
        console.error("Download error:", error);
        showToast("Unable to process download request");
      }
    } else {
      showToast(`Download link unavailable for ${size}`);
    }
  };
  
  // Generate a semi-unique user token (not personally identifiable)
  const generateUserToken = () => {
    // Create a fingerprint from browser info without storing personal data
    const browserInfo = 
      navigator.userAgent.substring(0, 10) + 
      window.screen.width + 
      window.screen.height;
    
    return CryptoJS.SHA256(browserInfo).toString().substring(0, 16);
  };
  
  // Generate a unique ID from movie title
  const generateUniqueId = (title) => {
    if (!title) return Math.random().toString(36).substring(2, 10);
    
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
      
    return slug;
  };
  
  // Activity logging (optional)
  const logActivity = (action, data) => {
    try {
      const activityData = {
        action,
        ...data,
        timestamp: new Date().toISOString()
      };
      
      // Send to your analytics endpoint if needed
      // Using a non-blocking approach
      navigator.sendBeacon && 
        navigator.sendBeacon(
          'https://my-blog-five-amber-64.vercel.app/api/log-activity', 
          JSON.stringify(activityData)
        );
    } catch (e) {
      // Silent fail for analytics
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
        
        {/* Mobile layout (remains unchanged) */}
        {isMobile && (
          <>
            {/* Hero section with enhanced backdrop */}
            <div className="relative h-[40vh] w-full overflow-hidden">
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
              
              {/* Movie title and actions positioned for cinematic feel */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex flex-col justify-between gap-4">
                  <div className="flex-1">
                    {/* Movie rating badge */}
                    {movie.rating && (
                      <div className="inline-block mb-2.5 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                        <Star size={12} className="inline mr-1 fill-yellow-400" /> {movie.rating} Rating
                      </div>
                    )}
                    
                    <h2 
                      id="movie-details-title" 
                      className="text-2xl font-bold text-white mb-2 drop-shadow-lg"
                    >
                      {movie.title}
                    </h2>
                    
                    {/* Key info highlights */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
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
                </div>
              </div>
            </div>

            {/* IMPROVED DOWNLOAD SECTION - Always visible with clear icons */}
            {movie.final_links && movie.final_links.length > 0 && (
              <div className="relative z-20 bg-gradient-to-r from-red-900/40 via-purple-900/30 to-red-900/40 border-y border-red-500/30 py-3 px-4 overflow-visible">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="text-sm text-white font-medium flex items-center">
                    <Download size={18} className="mr-2 text-red-400" />
                    <span>Download:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {movie.final_links.map((link, index) => (
                      <button
                        key={index}
                        onClick={() => handleDownload(link.size)}
                        className="relative overflow-hidden group transform transition-all duration-300 hover:scale-105 focus:scale-105 focus:outline-none"
                      >
                        <div className="bg-gradient-to-br from-red-600 to-purple-600 rounded-md px-3 py-1.5 text-white font-medium flex items-center gap-2 shadow-lg shadow-red-900/20">
                          <Download size={14} className="text-white" />
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
          </>
        )}
        
        {/* NEW DESKTOP LAYOUT: Image left, details right */}
        {!isMobile && (
          <div className="flex flex-col h-full md:flex-row">
            {/* Left side - Image */}
            <div className="w-full md:w-2/5 lg:w-1/3 h-[40vh] md:h-full relative">
              {/* Background shimmer loading effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse"></div>
              
              {/* Main backdrop image with enhanced animation */}
              <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
                <img 
                  src={movie.featured_image || movie.image} 
                  alt={movie.title} 
                  className="w-full h-full object-cover md:object-contain transition-opacity duration-700 opacity-0 onload-visible"
                  onLoad={(e) => {
                    e.target.classList.add('opacity-100');
                    e.target.classList.remove('onload-visible');
                  }}
                />
              </div>

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/70"></div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent"></div>
              
              {/* Buttons overlay */}
              <div className="absolute bottom-4 left-4 flex space-x-2">
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <Bookmark size={18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <ThumbsUp size={18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <Share2 size={18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
              </div>
              
              {/* Screenshots preview */}
              {movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
                <div className="absolute left-4 right-4 bottom-16 hidden md:block">
                  <div className="grid grid-cols-5 gap-1.5">
                    {movie.movie_screenshots.slice(0, 5).map((screenshot, index) => (
                      <button
                        key={index}
                        className={`rounded overflow-hidden transition-all duration-200 ${
                          activeScreenshot === index ? 'ring-2 ring-red-600 scale-105' : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        onClick={() => setActiveScreenshot(index)}
                      >
                        <img 
                          src={screenshot}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-12 object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right side - Details and download */}
            <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col overflow-hidden">
              {/* Movie title and downloads */}
              <div className="p-4 md:p-6 bg-gradient-to-r from-[#0a0a0a] to-[#111] border-b border-gray-800/50">
                <div className="flex flex-col space-y-3">
                  {/* Title and metadata */}
                  <div>
                    {/* Movie rating badge */}
                    {movie.rating && (
                      <div className="inline-block mb-2 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                        <Star size={12} className="inline mr-1 fill-yellow-400" /> {movie.rating} Rating
                      </div>
                    )}
                    
                    <h2 
                      id="movie-details-title" 
                      className="text-2xl md:text-3xl font-bold text-white mb-2"
                    >
                      {movie.title}
                    </h2>
                    
                    {/* Key info highlights */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-300">
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
                      {movie.language && movie.language.length > 0 && (
                        <span className="flex items-center">
                          <Globe size={14} className="mr-1 text-gray-400" />
                          {movie.language.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Download buttons */}
                  {movie.final_links && movie.final_links.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-white font-medium flex items-center mr-1">
                          <Download size={16} className="mr-1.5 text-red-400" />
                          Download:
                        </span>
                        {movie.final_links.map((link, index) => (
                          <button
                            key={index}
                            onClick={() => handleDownload(link.size)}
                            className="relative overflow-hidden group transform transition-all duration-300 hover:scale-105 focus:scale-105 focus:outline-none"
                          >
                            <div className="bg-gradient-to-br from-red-600 to-purple-600 rounded-md px-3 py-1.5 text-white font-medium flex items-center gap-2 shadow-lg shadow-red-900/20">
                              <Download size={14} className="text-white" />
                              <span className="text-sm">{link.size}</span>
                            </div>
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 group-active:opacity-30 transition-opacity duration-300 rounded-md"></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable content area */}
              <div 
                ref={contentRef}
                className="flex-1 overflow-y-auto" 
              >
                <div className="p-4 md:p-6">
                  {/* Movie info */}
                  <div className="mb-6">
                    <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-2"></span>
                      Synopsis
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {movie.description || "No description available."}
                    </p>
                  </div>
                  
                  {/* Genres section */}
                  {movie.category && movie.category.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-2"></span>
                        Genres
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movie.category.slice(0, expandGenres ? movie.category.length : 8).map((genre, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30 transition-colors duration-200"
                          >
                            {genre}
                          </span>
                        ))}
                        {!expandGenres && movie.category.length > 8 && (
                          <button 
                            className="text-xs px-3 py-1.5 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors duration-300"
                            onClick={() => setExpandGenres(true)}
                          >
                            +{movie.category.length - 8} more
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Cast info */}
                  {movie.cast && movie.cast.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                        Cast
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movie.cast.map((actor, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-600/20 to-blue-600/20 text-green-300 border border-green-600/30 hover:bg-green-600/30 transition-colors duration-200"
                          >
                            {actor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full screenshots section */}
                  {movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full mr-2"></span>
                        Screenshots
                      </h3>
                      <div className="relative rounded-lg overflow-hidden shadow-xl">
                        <img 
                          src={movie.movie_screenshots[activeScreenshot]}
                          alt={`Screenshot ${activeScreenshot + 1}`}
                          className="w-full h-auto object-cover transition-opacity duration-500"
                        />
                        
                        <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
                          <button 
                            className="bg-black/50 backdrop-blur-sm text-white rounded-full p-2 transition-transform duration-300 hover:scale-110"
                            onClick={prevScreenshot}
                          >
                            <ChevronLeft size={20} />
                          </button>
                          
                          <button 
                            className="bg-black/50 backdrop-blur-sm text-white rounded-full p-2 transition-transform duration-300 hover:scale-110"
                            onClick={nextScreenshot}
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                        
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full">
                          {activeScreenshot + 1}/{movie.movie_screenshots.length}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Similar movies section */}
                  {movie.similar_movies && movie.similar_movies.length > 0 && (
                    <div className="mt-8 pt-4 border-t border-gray-800">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-red-500 to-red-600 rounded-full mr-2"></span>
                        Similar Movies
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {movie.similar_movies.slice(0, 8).map((similarMovie, idx) => (
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;