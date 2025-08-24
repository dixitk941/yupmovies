import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info, Play, Film, Tv, HardDrive } from 'lucide-react';

const MovieDetails = ({ movie, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hoveredQuality, setHoveredQuality] = useState(null);
  const [expandGenres, setExpandGenres] = useState(false);
  const [expandLanguages, setExpandLanguages] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [downloadingLinks, setDownloadingLinks] = useState(new Set());
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const screenshotTimerRef = useRef(null);
  const backdropRef = useRef(null);
  
  // FIXED: Parse download links from your specific database format
  const parseDownloadLinks = useCallback((linksString) => {
    if (!linksString || typeof linksString !== 'string') return [];
    
    console.log('Raw links string:', linksString);
    
    try {
      const links = [];
      
      // Your format: "url,description,sizeurl,description,size..."
      // Use regex to match the pattern: https://...?download,description,size
      const linkPattern = /(https:\/\/[^,]+\?download),([^,]+),(\d+(?:\.\d+)?[MG]B)/g;
      let match;
      
      while ((match = linkPattern.exec(linksString)) !== null) {
        const [, url, description, size] = match;
        
        console.log('Found match:', { url, description, size });
        
        // Extract quality from description
        let quality = 'HD';
        const qualityMatch = description.match(/(480p|720p|1080p|4K|2160p)/i);
        if (qualityMatch) {
          quality = qualityMatch[1].toUpperCase();
          if (quality === '2160P') quality = '4K';
        }
        
        // Fallback quality detection from size if not found in description
        if (quality === 'HD') {
          const sizeMatch = size.match(/(\d+(?:\.\d+)?)([MG]B)/i);
          if (sizeMatch) {
            const sizeNum = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toLowerCase();
            
            if (unit === 'gb') {
              if (sizeNum >= 2.5) quality = '1080P';
              else if (sizeNum >= 1.2) quality = '720P';
              else quality = '480P';
            } else if (unit === 'mb') {
              if (sizeNum >= 1500) quality = '1080P';
              else if (sizeNum >= 800) quality = '720P';
              else quality = '480P';
            }
          }
        }
        
        links.push({
          url: url.trim(),
          quality: quality,
          size: size.trim(),
          description: description.trim()
        });
      }
      
      console.log('Final parsed links:', links);
      
      // Sort by quality
      const qualityOrder = { '480P': 1, '720P': 2, '1080P': 3, '4K': 4, 'HD': 2.5 };
      return links.sort((a, b) => (qualityOrder[a.quality] || 5) - (qualityOrder[b.quality] || 5));
      
    } catch (error) {
      console.error('Error parsing download links:', error);
      return [];
    }
  }, []);
  
  // Enhanced data extraction with fallbacks
  const extractMovieData = useCallback(() => {
    if (!movie) return {};
    
    console.log('Raw movie object:', movie);
    
    // Extract screenshots from poster if it's an HTML string
    let screenshots = [];
    if (movie.poster && typeof movie.poster === 'string' && movie.poster.includes('<img')) {
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      let match;
      while ((match = imgRegex.exec(movie.poster)) !== null) {
        screenshots.push(match[1]);
      }
    }
    
    // Parse download links using our new parser
    let downloadLinks = [];
    if (movie.downloadLinks && Array.isArray(movie.downloadLinks)) {
      downloadLinks = movie.downloadLinks;
    } else if (movie.links && typeof movie.links === 'string') {
      downloadLinks = parseDownloadLinks(movie.links);
    }
    
    console.log('Final downloadLinks:', downloadLinks);
    
    // Extract content metadata
    let metadata = {};
    if (movie.content) {
      if (typeof movie.content === 'object') {
        metadata = movie.content;
      } else if (typeof movie.content === 'string') {
        try {
          const parsed = JSON.parse(movie.content);
          if (Array.isArray(parsed) && parsed.length >= 3) {
            metadata = {
              description: parsed[0],
              duration: parsed[1],
              rating: parsed[2]
            };
          }
        } catch (error) {
          metadata = { description: movie.content };
        }
      }
    }
    
    // Extract year from title or releaseYear
    const yearMatch = movie.title?.match(/\((\d{4})\)/);
    const year = movie.releaseYear || (yearMatch ? yearMatch[1] : '');
    
    // Parse categories safely - handle both string and array formats
    let genres = [];
    let languages = [];
    let qualities = [];
    
    // Handle categories field from your database
    if (movie.categories && typeof movie.categories === 'string') {
      const categoryArray = movie.categories.split(',').map(c => c.trim());
      
      // Filter out technical terms to get actual genres
      const technicalTerms = ['480p', '720p', '1080p', '4K', 'HD', 'Full HD', 'WEB-DL', 'BluRay', 'Blu-Ray'];
      const languageTerms = ['Hindi', 'English', 'Telugu', 'Tamil', 'Malayalam', 'Punjabi'];
      
      genres = categoryArray.filter(cat => 
        !technicalTerms.some(term => cat.includes(term)) &&
        !languageTerms.some(lang => cat.includes(lang)) &&
        !cat.match(/^\d{4}$/) // Not a year
      );
      
      languages = categoryArray.filter(cat => 
        languageTerms.some(lang => cat.includes(lang))
      );
      
      qualities = categoryArray.filter(cat => 
        technicalTerms.some(term => cat.includes(term))
      );
    }
    
    // Handle seasons for series
    let seasons = null;
    if (movie.season_1 || movie.season_2 || movie.season_3) {
      seasons = {};
      for (let i = 1; i <= 10; i++) {
        const seasonKey = `season_${i}`;
        if (movie[seasonKey]) {
          seasons[seasonKey] = movie[seasonKey];
        }
      }
    }
    
    return {
      title: movie.title || 'Unknown Title',
      year,
      image: movie.featured_image || movie.featuredImage || movie.image,
      genres,
      languages,
      qualities,
      isSeries: !!seasons,
      seasons,
      description: metadata.description || movie.excerpt || "No description available.",
      duration: metadata.duration || movie.duration,
      rating: metadata.rating || movie.rating,
      downloadLinks,
      screenshots: screenshots.length > 0 ? screenshots : [],
      cast: movie.cast || [],
      director: movie.director,
      status: movie.status,
      publishDate: movie.date,
      modifiedDate: movie.modified_date
    };
  }, [movie, parseDownloadLinks]);
  
  const movieData = extractMovieData();
  
  // Screen size detection
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
  
  // Track scroll position
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
  
  // Component initialization
  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 50);
    
    if (backdropRef.current) {
      setTimeout(() => {
        backdropRef.current.classList.add('animate-ken-burns');
      }, 200);
    }
  }, []);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  // Handle escape key
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Auto-rotate screenshots
  useEffect(() => {
    clearTimeout(screenshotTimerRef.current);
    
    if (movieData.screenshots?.length > 1 && 
        ((isMobile && activeTab === 'screenshots') || !isMobile)) {
      screenshotTimerRef.current = setTimeout(() => {
        nextScreenshot();
      }, 5000);
    }
    
    return () => clearTimeout(screenshotTimerRef.current);
  }, [activeTab, activeScreenshot, movieData.screenshots, isMobile]);
  
  // Direct download handler - No redirects, direct file download
  const handleDirectDownload = async (linkData, index) => {
    if (!linkData || !linkData.url) {
      showToast("Download link not available", 'error');
      return;
    }

    // Add to downloading state
    setDownloadingLinks(prev => new Set([...prev, index]));

    try {
      showToast(`Starting download: ${linkData.quality} (${linkData.size})`, 'info');
      
      // Create a temporary anchor element for direct download
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = linkData.url;
      downloadAnchor.download = `${movieData.title}_${linkData.quality}.${getFileExtension(linkData.url)}`;
      downloadAnchor.target = '_blank';
      downloadAnchor.rel = 'noopener noreferrer';
      
      // Add to DOM temporarily
      document.body.appendChild(downloadAnchor);
      
      // Trigger download
      downloadAnchor.click();
      
      // Remove from DOM
      document.body.removeChild(downloadAnchor);
      
      // Log download activity
      logActivity('direct_download_initiated', { 
        quality: linkData.quality,
        size: linkData.size,
        movieTitle: movieData.title,
        isSeries: movieData.isSeries,
        timestamp: new Date().toISOString()
      });
      
      // Show success message
      setTimeout(() => {
        showToast(`Download started successfully: ${linkData.quality}`, 'success');
      }, 1000);
      
    } catch (error) {
      console.error("Direct download error:", error);
      showToast("Download failed. Please try again.", 'error');
    } finally {
      // Remove from downloading state after 3 seconds
      setTimeout(() => {
        setDownloadingLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 3000);
    }
  };
  
  // Helper function to get file extension from URL
  const getFileExtension = (url) => {
    if (!url) return 'mp4'; // Default extension
    
    // Check for common video extensions in URL
    const extensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    for (const ext of extensions) {
      if (url.toLowerCase().includes(`.${ext}`)) {
        return ext;
      }
    }
    
    // Default to mp4 if no extension found
    return 'mp4';
  };
  
  // Enhanced quality badge component
  const QualityBadge = ({ quality, size, isDownloading, index }) => {
    // Ensure we always have a quality value
    const displayQuality = quality || 'HD';
    const displaySize = size || 'Unknown';
    
    const getQualityColor = (qual) => {
      switch (qual) {
        case '480P': return 'from-yellow-600 to-orange-600 border-yellow-500/30 text-yellow-300';
        case '720P': return 'from-blue-600 to-cyan-600 border-blue-500/30 text-blue-300';
        case '1080P': return 'from-green-600 to-emerald-600 border-green-500/30 text-green-300';
        case '4K': return 'from-purple-600 to-pink-600 border-purple-500/30 text-purple-300';
        case 'HD': return 'from-blue-600 to-cyan-600 border-blue-500/30 text-blue-300';
        default: return 'from-gray-600 to-gray-700 border-gray-500/30 text-gray-300';
      }
    };
    
    const getQualityIcon = (qual) => {
      switch (qual) {
        case '4K': return '4K';
        case '1080P': return 'FHD';
        case '720P': return 'HD';
        case '480P': return 'SD';
        case 'HD': return 'HD';
        default: return 'HD';
      }
    };
    
    // Extract just the size number and unit for cleaner display
    const cleanSize = (sizeStr) => {
      if (!sizeStr || sizeStr === 'Unknown') return '?';
      
      // Extract size with unit
      const match = sizeStr.match(/(\d+(?:\.\d+)?)(MB|GB)/i);
      if (match) {
        return `${match[1]}${match[2].toUpperCase()}`;
      }
      
      // If it's already clean, return as is
      if (sizeStr.length <= 8) return sizeStr;
      
      // Truncate if too long
      return sizeStr.substring(0, 8) + '...';
    };
    
    return (
      <div className="flex flex-col items-center text-center min-w-0">
        {/* Quality Badge */}
        <div className={`bg-gradient-to-br ${getQualityColor(displayQuality)} rounded-md px-2 py-1 text-xs font-bold mb-1 border backdrop-blur-sm min-w-[40px]`}>
          {getQualityIcon(displayQuality)}
        </div>
        
        {/* File Size */}
        <div className="text-xs text-gray-300 font-medium truncate max-w-[70px]">
          {cleanSize(displaySize)}
        </div>
        
        {/* Download Status */}
        {isDownloading && (
          <div className="text-xs text-green-400 animate-pulse mt-1">
            Starting...
          </div>
        )}
      </div>
    );
  };
  
  const logActivity = (action, data) => {
    try {
      const activityData = {
        action,
        ...data,
        userAgent: navigator.userAgent.substring(0, 50), // Limited user agent info
        timestamp: new Date().toISOString()
      };
      
      // Send to your analytics endpoint if needed (optional)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          'https://my-blog-five-amber-64.vercel.app/api/log-activity', 
          JSON.stringify(activityData)
        );
      }
    } catch (e) {
      // Silent fail for analytics
    }
  };
  
  // Enhanced toast notification with types
  const showToast = (message, type = 'info') => {
    const existingToast = document.querySelector('.download-toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }
    
    const toast = document.createElement('div');
    toast.className = 'download-toast fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-[100] animate-fadeIn max-w-sm';
    
    // Style based on type
    switch (type) {
      case 'success':
        toast.classList.add('bg-green-800', 'text-green-100', 'border', 'border-green-600');
        break;
      case 'error':
        toast.classList.add('bg-red-800', 'text-red-100', 'border', 'border-red-600');
        break;
      case 'info':
      default:
        toast.classList.add('bg-gray-800', 'text-white', 'border', 'border-gray-600');
        break;
    }
    
    // Add icon based on type
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    toast.innerHTML = `<div class="flex items-center gap-2"><span class="text-lg">${icon}</span><span class="text-sm">${message}</span></div>`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-fadeOut');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 4000);
  };
  
  const nextScreenshot = useCallback(() => {
    if (movieData.screenshots && movieData.screenshots.length > 0) {
      setActiveScreenshot((prev) => (prev + 1) % movieData.screenshots.length);
    }
  }, [movieData.screenshots]);
  
  const prevScreenshot = useCallback(() => {
    if (movieData.screenshots && movieData.screenshots.length > 0) {
      setActiveScreenshot((prev) => (prev - 1 + movieData.screenshots.length) % movieData.screenshots.length);
    }
  }, [movieData.screenshots]);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    showToast(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks', 'success');
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    showToast(isLiked ? 'Like removed' : 'Liked!', 'success');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: movieData.title,
          text: `Check out ${movieData.title}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-0 overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="movie-details-title"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-[#100818]/30 to-black/40 animate-gradient-shift"></div>
      
      {/* Particles effect */}
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
        {/* Dynamic header */}
        <div className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrollPosition > 100 ? 'bg-black/90 backdrop-blur-md shadow-xl' : 'bg-transparent'
        }`}>
          <div className="flex items-center justify-between p-3 md:p-4">
            <div className={`flex items-center transition-all duration-300 ${
              scrollPosition > 100 ? 'opacity-100' : 'opacity-0'
            }`}>
              {movieData.isSeries ? <Tv size={20} className="text-blue-400 mr-2" /> : <Film size={20} className="text-red-400 mr-2" />}
              <h3 className="text-white font-medium truncate max-w-[200px] md:max-w-md">
                {movieData.title}
              </h3>
              {movieData.year && (
                <span className="text-gray-400 text-sm ml-2">({movieData.year})</span>
              )}
            </div>
            
            <button 
              className="bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-colors duration-200"
              onClick={onClose}
              aria-label="Close details"
            >
              <X size={isMobile ? 18 : 22} />
            </button>
          </div>
        </div>
        
        {/* Mobile layout */}
        {isMobile && (
          <>
            {/* Hero section */}
            <div className="relative h-[40vh] w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse"></div>
              
              <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
                <img 
                  src={movieData.image} 
                  alt={movieData.title} 
                  className="w-full h-full object-cover transition-opacity duration-700 opacity-0"
                  onLoad={(e) => {
                    e.target.classList.add('opacity-100');
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x600/1a1a1a/666?text=No+Image';
                  }}
                />
              </div>

              {/* Overlays */}
              <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black via-black/90 to-transparent"></div>
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/90 to-transparent"></div>
              <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-black/70 to-transparent"></div>
              <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-black/70 to-transparent"></div>
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    {/* Content type and rating */}
                    <div className="flex items-center gap-2 mb-2.5">
                      {movieData.isSeries ? (
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium backdrop-blur-sm">
                          <Tv size={12} className="mr-1" /> Series
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium backdrop-blur-sm">
                          <Film size={12} className="mr-1" /> Movie
                        </div>
                      )}
                      
                      {movieData.rating && (
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                          <Star size={12} className="mr-1 fill-yellow-400" /> {movieData.rating}
                        </div>
                      )}
                    </div>
                    
                    <h2 id="movie-details-title" className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                      {movieData.title}
                    </h2>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
                      {movieData.year && (
                        <span className="flex items-center">
                          <Calendar size={14} className="mr-1 text-gray-400" />
                          {movieData.year}
                        </span>
                      )}
                      {movieData.duration && (
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1 text-gray-400" />
                          {movieData.duration}
                        </span>
                      )}
                      {movieData.languages.length > 0 && (
                        <span className="flex items-center">
                          <Globe size={14} className="mr-1 text-gray-400" />
                          {movieData.languages[0]}
                        </span>
                      )}
                      {movieData.qualities.length > 0 && (
                        <span className="text-xs border border-gray-600 px-1 rounded">
                          {movieData.qualities[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DOWNLOAD SECTION - Shows when links are available */}
            {movieData.downloadLinks && movieData.downloadLinks.length > 0 && (
              <div className="relative z-20 bg-gradient-to-r from-red-900/40 via-purple-900/30 to-red-900/40 border-y border-red-500/30 py-4 px-4">
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-white font-medium flex items-center">
                    <Download size={18} className="mr-2 text-red-400" />
                    <span>Direct Download Available:</span>
                    <span className="text-xs text-gray-400 ml-2">({movieData.downloadLinks.length} options)</span>
                  </div>
                  
                  {/* Download buttons with quality info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {movieData.downloadLinks.map((link, index) => {
                      return (
                        <button
                          key={index}
                          onClick={() => handleDirectDownload(link, index)}
                          disabled={downloadingLinks.has(index)}
                          className={`relative overflow-hidden group transform transition-all duration-300 hover:scale-105 focus:scale-105 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                            downloadingLinks.has(index) ? 'animate-pulse' : ''
                          }`}
                        >
                          <div className="bg-gradient-to-br from-red-600 to-purple-600 rounded-lg px-3 py-3 text-white shadow-lg shadow-red-900/30 border border-red-500/30">
                            <div className="flex flex-col items-center text-center gap-2">
                              <QualityBadge 
                                quality={link.quality} 
                                size={link.size} 
                                isDownloading={downloadingLinks.has(index)}
                                index={index}
                              />
                              <div className="flex items-center gap-1">
                                <Download size={12} className="text-white" />
                                <span className="text-xs font-medium">
                                  {downloadingLinks.has(index) ? 'Starting...' : 'Download'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 group-active:opacity-20 transition-opacity duration-300 rounded-lg"></div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Additional info */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-2">
                    <HardDrive size={12} />
                    <span>Direct download - No redirects</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation tabs */}
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
              
              {movieData.isSeries && movieData.seasons && (
                <button 
                  className={`flex-1 py-3.5 text-sm font-medium relative overflow-hidden ${activeTab === 'seasons' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('seasons')}
                >
                  Seasons
                  {activeTab === 'seasons' && (
                    <>
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-red-400"></span>
                      <span className="absolute bottom-0 left-0 w-16 h-0.5 bg-white/30 animate-slide-right"></span>
                    </>
                  )}
                </button>
              )}
              
              {movieData.screenshots && movieData.screenshots.length > 0 && (
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
        
        {/* Desktop layout */}
        {!isMobile && (
          <div className="flex flex-col h-full md:flex-row">
            {/* Left side - Image */}
            <div className="w-full md:w-2/5 lg:w-1/3 h-[40vh] md:h-full relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse"></div>
              
              <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
                <img 
                  src={movieData.image} 
                  alt={movieData.title} 
                  className="w-full h-full object-cover md:object-contain transition-opacity duration-700 opacity-0"
                  onLoad={(e) => {
                    e.target.classList.add('opacity-100');
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x600/1a1a1a/666?text=No+Image';
                  }}
                />
              </div>

              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/70"></div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent"></div>
              
              {/* Action buttons */}
              <div className="absolute bottom-4 left-4 flex space-x-2">
                <button 
                  onClick={handleBookmark}
                  className={`relative flex items-center justify-center p-2.5 rounded-full transition-all duration-200 overflow-hidden group ${
                    isBookmarked ? 'bg-red-600/80 hover:bg-red-600' : 'bg-white/15 hover:bg-white/25'
                  }`}
                >
                  <Bookmark size={18} className={`relative z-10 ${isBookmarked ? 'text-white fill-white' : 'text-white'}`} />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                <button 
                  onClick={handleLike}
                  className={`relative flex items-center justify-center p-2.5 rounded-full transition-all duration-200 overflow-hidden group ${
                    isLiked ? 'bg-blue-600/80 hover:bg-blue-600' : 'bg-white/15 hover:bg-white/25'
                  }`}
                >
                  <ThumbsUp size={18} className={`relative z-10 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                <button 
                  onClick={handleShare}
                  className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group"
                >
                  <Share2 size={18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
              </div>
              
              {/* Screenshots preview */}
              {movieData.screenshots && movieData.screenshots.length > 0 && (
                <div className="absolute left-4 right-4 bottom-16 hidden md:block">
                  <div className="grid grid-cols-5 gap-1.5">
                    {movieData.screenshots.slice(0, 5).map((screenshot, index) => (
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

            {/* Right side - Details */}
            <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col overflow-hidden">
              {/* Header section with download buttons */}
              <div className="p-4 md:p-6 bg-gradient-to-r from-[#0a0a0a] to-[#111] border-b border-gray-800/50">
                <div className="flex flex-col space-y-4">
                  <div>
                    {/* Content type and rating */}
                    <div className="flex items-center gap-2 mb-2">
                      {movieData.isSeries ? (
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium backdrop-blur-sm">
                          <Tv size={12} className="mr-1" /> Series
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium backdrop-blur-sm">
                          <Film size={12} className="mr-1" /> Movie
                        </div>
                      )}
                      
                      {movieData.rating && (
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                          <Star size={12} className="mr-1 fill-yellow-400" /> {movieData.rating}
                        </div>
                      )}
                    </div>
                    
                    <h2 id="movie-details-title" className="text-2xl md:text-3xl font-bold text-white mb-2">
                      {movieData.title}
                    </h2>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-300">
                      {movieData.year && (
                        <span className="flex items-center">
                          <Calendar size={14} className="mr-1 text-gray-400" />
                          {movieData.year}
                        </span>
                      )}
                      {movieData.duration && (
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1 text-gray-400" />
                          {movieData.duration}
                        </span>
                      )}
                      {movieData.languages.length > 0 && (
                        <span className="flex items-center">
                          <Globe size={14} className="mr-1 text-gray-400" />
                          {movieData.languages.slice(0, 2).join(', ')}
                          {movieData.languages.length > 2 && ` +${movieData.languages.length - 2}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DESKTOP DOWNLOAD BUTTONS */}
                  {movieData.downloadLinks && movieData.downloadLinks.length > 0 && (
                    <div className="bg-gradient-to-r from-red-900/20 via-purple-900/15 to-red-900/20 border border-red-500/20 rounded-xl p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium flex items-center">
                            <Download size={16} className="mr-2 text-red-400" />
                            Direct Download Available:
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <HardDrive size={12} />
                            <span>No redirects</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {movieData.downloadLinks.map((link, index) => (
                            <button
                              key={index}
                              onClick={() => handleDirectDownload(link, index)}
                              disabled={downloadingLinks.has(index)}
                              className={`relative overflow-hidden group transform transition-all duration-300 hover:scale-105 focus:scale-105 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                                downloadingLinks.has(index) ? 'animate-pulse' : ''
                              }`}
                            >
                              <div className="bg-gradient-to-br from-red-600 to-purple-600 rounded-lg px-4 py-3 text-white shadow-lg shadow-red-900/30 border border-red-500/30">
                                <div className="flex flex-col items-center text-center gap-2">
                                  <QualityBadge 
                                    quality={link.quality} 
                                    size={link.size} 
                                    isDownloading={downloadingLinks.has(index)}
                                    index={index}
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <Download size={14} className="text-white" />
                                    <span className="text-sm font-medium">
                                      {downloadingLinks.has(index) ? 'Starting...' : 'Download'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-15 group-active:opacity-25 transition-opacity duration-300 rounded-lg"></div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable content area */}
              <div ref={contentRef} className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6">
                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-2"></span>
                      Synopsis
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {movieData.description}
                    </p>
                  </div>
                  
                  {/* Genres */}
                  {movieData.genres && movieData.genres.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-2"></span>
                        Genres
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.genres.slice(0, expandGenres ? movieData.genres.length : 8).map((genre, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30 transition-colors duration-200"
                          >
                            {genre}
                          </span>
                        ))}
                        {!expandGenres && movieData.genres.length > 8 && (
                          <button 
                            className="text-xs px-3 py-1.5 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors duration-300"
                            onClick={() => setExpandGenres(true)}
                          >
                            +{movieData.genres.length - 8} more
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {movieData.languages && movieData.languages.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.languages.slice(0, expandLanguages ? movieData.languages.length : 4).map((language, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-600/20 to-blue-600/20 text-green-300 border border-green-600/30 hover:bg-green-600/30 transition-colors duration-200"
                          >
                            {language}
                          </span>
                        ))}
                        {!expandLanguages && movieData.languages.length > 4 && (
                          <button 
                            className="text-xs px-3 py-1.5 rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors duration-300"
                            onClick={() => setExpandLanguages(true)}
                          >
                            +{movieData.languages.length - 4} more
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Series seasons */}
                  {movieData.isSeries && movieData.seasons && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-2"></span>
                        Seasons Available
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {Object.entries(movieData.seasons)
                          .filter(([key, value]) => value && value.trim() !== '')
                          .map(([seasonKey, seasonValue], idx) => (
                          <div 
                            key={idx}
                            className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/30 rounded-lg p-3 text-center hover:bg-blue-600/30 transition-colors duration-200"
                          >
                            <div className="text-blue-300 text-xs font-medium mb-1">
                              {seasonKey.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-gray-400 text-xs truncate">
                              {seasonValue.length > 20 ? `${seasonValue.substring(0, 20)}...` : seasonValue}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Screenshots */}
                  {movieData.screenshots && movieData.screenshots.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full mr-2"></span>
                        Screenshots
                      </h3>
                      <div className="relative rounded-lg overflow-hidden shadow-xl">
                        <img 
                          src={movieData.screenshots[activeScreenshot]}
                          alt={`Screenshot ${activeScreenshot + 1}`}
                          className="w-full h-auto object-cover transition-opacity duration-500"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/800x450/1a1a1a/666?text=Screenshot+Not+Available';
                          }}
                        />
                        
                        {movieData.screenshots.length > 1 && (
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
                        )}
                        
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full">
                          {activeScreenshot + 1}/{movieData.screenshots.length}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile content based on active tab */}
        {isMobile && (
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto bg-black"
          >
            <div className="p-4">
              {activeTab === 'details' && (
                <>
                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-2"></span>
                      Synopsis
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {movieData.description}
                    </p>
                  </div>
                  
                  {/* Genres */}
                  {movieData.genres && movieData.genres.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-2"></span>
                        Genres
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.genres.map((genre, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-300 border border-red-600/30"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {movieData.languages && movieData.languages.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.languages.map((language, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-600/20 to-blue-600/20 text-green-300 border border-green-600/30"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'seasons' && movieData.isSeries && movieData.seasons && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Available Seasons</h3>
                  <div className="space-y-3">
                    {Object.entries(movieData.seasons)
                      .filter(([key, value]) => value && value.trim() !== '')
                      .map(([seasonKey, seasonValue], idx) => (
                      <div 
                        key={idx}
                        className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/30 rounded-lg p-4 hover:bg-blue-600/30 transition-colors duration-200"
                      >
                        <div className="text-blue-300 text-sm font-medium mb-2">
                          {seasonKey.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-gray-300 text-sm">
                          {seasonValue}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'screenshots' && movieData.screenshots && movieData.screenshots.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Screenshots</h3>
                  <div className="relative rounded-lg overflow-hidden shadow-xl mb-4">
                    <img 
                      src={movieData.screenshots[activeScreenshot]}
                      alt={`Screenshot ${activeScreenshot + 1}`}
                      className="w-full h-auto object-cover transition-opacity duration-500"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/800x450/1a1a1a/666?text=Screenshot+Not+Available';
                      }}
                    />
                    
                    {movieData.screenshots.length > 1 && (
                      <div className="absolute inset-0 flex items-center justify-between px-3">
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
                    )}
                    
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full">
                      {activeScreenshot + 1}/{movieData.screenshots.length}
                    </div>
                  </div>
                  
                  {/* Thumbnail grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {movieData.screenshots.map((screenshot, index) => (
                      <button
                        key={index}
                        className={`rounded overflow-hidden transition-all duration-200 ${
                          activeScreenshot === index ? 'ring-2 ring-red-600 scale-105' : 'opacity-60 hover:opacity-100'
                        }`}
                        onClick={() => setActiveScreenshot(index)}
                      >
                        <img 
                          src={screenshot}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-16 object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MovieDetails);
