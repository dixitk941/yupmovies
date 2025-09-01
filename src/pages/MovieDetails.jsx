import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info, Play, Film, Tv, HardDrive, Image } from 'lucide-react';
import { getMovieDetailsById, getSeriesDetailsById } from '../services/directMovieService';
import { formatDateString, debugDate } from '../services/utils.js';

const MovieDetails = ({ movie, onClose }) => {
  const [directDetails, setDirectDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState('download');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hoveredQuality, setHoveredQuality] = useState(null);
  const [expandGenres, setExpandGenres] = useState(false);
  const [expandLanguages, setExpandLanguages] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [downloadingLinks, setDownloadingLinks] = useState(new Set());
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const backdropRef = useRef(null);
  
  // Fetch direct details from database on mount
  useEffect(() => {
    const fetchDirectDetails = async () => {
      if (!movie || !movie.id) return;
      
      setIsLoadingDetails(true);
      setDetailsError(null);
      
      try {
        // Use the appropriate fetch function based on content type
        let details;
        if (movie.isSeries) {
          details = await getSeriesDetailsById(movie.id);
        } else {
          details = await getMovieDetailsById(movie.id);
        }
        
        if (details) {
          setDirectDetails(details);
          console.log('✅ Direct details loaded:', details.title);
        } else {
          // If direct fetch fails, use cached data
          console.log('⚠️ Using cached data as fallback');
          setDetailsError('Could not fetch latest details');
        }
      } catch (error) {
        console.error('❌ Error fetching direct details:', error);
        setDetailsError('Error loading details');
      } finally {
        setIsLoadingDetails(false);
      }
    };
    
    fetchDirectDetails();
  }, [movie]);
  
  // Enhanced parseDownloadLinks function to handle your specific data format
  const parseDownloadLinks = useCallback((linksString) => {
    if (!linksString || typeof linksString !== 'string') return [];
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Raw links string:', linksString.substring(0, 200) + '...');
    }
    
    try {
      const links = [];
      
      // Your format: "url,title,sizeurl,title,size..." (concatenated without separators)
      // Use regex to find all patterns: https://...?download,title,size
      const linkPattern = /(https:\/\/[^,]+\?download),([^,]+),(\d+(?:\.\d+)?(?:MB|GB|TB))/gi;
      
      let match;
      while ((match = linkPattern.exec(linksString)) !== null) {
        const [, url, title, size] = match;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🎬 Found match:', { 
            url: url.substring(0, 50) + '...', 
            title: title.substring(0, 50) + '...', 
            size 
          });
        }
        
        // Extract quality from title
        let quality = 'HD';
        const qualityMatch = title.match(/(480p|720p|1080p|4K|2160p)/i);
        if (qualityMatch) {
          quality = qualityMatch[1].toUpperCase();
          if (quality === '2160P') quality = '4K';
        }
        
        // Fallback quality detection from size if not found in title
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
          description: title.trim(),
          rawDatabaseDetails: title.trim() // Store complete database details
        });
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Final parsed links:', links.map(l => ({ 
          quality: l.quality, 
          size: l.size, 
          description: l.description.substring(0, 50) + '...' 
        })));
      }
      
      // Sort by quality order
      const qualityOrder = { '480P': 1, '720P': 2, '1080P': 3, '4K': 4, 'HD': 2.5 };
      return links.sort((a, b) => (qualityOrder[a.quality] || 5) - (qualityOrder[b.quality] || 5));
      
    } catch (error) {
      console.error('Error parsing download links:', error);
      return [];
    }
  }, []);

  // Keep your original extractMovieData function
  const extractMovieData = useCallback(() => {
    // Priority: direct database details > cached movie data
    const sourceData = directDetails || movie;
    
    if (!sourceData) return {};
    
    // Use details directly if they're already properly formatted (from direct fetch)
    if (directDetails) {
      return {
        ...directDetails,
        // Ensure we always have these fields properly set
        title: directDetails.title || 'Unknown Title',
        year: directDetails.releaseYear,
        image: directDetails.featuredImage || directDetails.poster || directDetails.image,
        genres: directDetails.genres || [],
        languages: directDetails.languages || [],
        qualities: directDetails.qualities || [],
        isSeries: directDetails.isSeries,
        seasons: directDetails.seasons,
        description: directDetails.content?.description || directDetails.excerpt || "No description available.",
        duration: directDetails.content?.duration,
        rating: directDetails.content?.rating,
        downloadLinks: directDetails.downloadLinks || [],
        screenshots: [],
        cast: directDetails.cast || [],
        director: directDetails.director,
        status: directDetails.status,
        publishDate: directDetails.date,
        modifiedDate: directDetails.modified_date
      };
    }
    
    // Console log to indicate we're using cached data
    console.log('🔄 Using cached movie data for details');
    
    // Screenshots disabled - no longer extracting screenshots
    let screenshots = [];
    
    // Parse download links using our new parser
    let downloadLinks = [];
    if (sourceData.downloadLinks && Array.isArray(sourceData.downloadLinks)) {
      downloadLinks = sourceData.downloadLinks;
    } else if (sourceData.links && typeof sourceData.links === 'string') {
      downloadLinks = parseDownloadLinks(sourceData.links);
    }
    
    // Extract content metadata
    let metadata = {};
    if (sourceData.content) {
      if (typeof sourceData.content === 'object') {
        metadata = sourceData.content;
      } else if (typeof sourceData.content === 'string') {
        try {
          const parsed = JSON.parse(sourceData.content);
          if (Array.isArray(parsed) && parsed.length >= 3) {
            metadata = {
              description: parsed[0],
              duration: parsed[1],
              rating: parsed[2]
            };
          }
        } catch (error) {
          metadata = { description: sourceData.content };
        }
      }
    }
    
    // Extract year from title or releaseYear
    const yearMatch = sourceData.title?.match(/\((\d{4})\)/);
    const year = sourceData.releaseYear || (yearMatch ? yearMatch[1] : '');
    
    // Parse categories safely - handle both string and array formats
    let genres = [];
    let languages = [];
    let qualities = [];
    
    // Handle categories field from your database
    if (sourceData.categories && typeof sourceData.categories === 'string') {
      const categoryArray = sourceData.categories.split(',').map(c => c.trim());
      
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
    } else if (sourceData.categories && Array.isArray(sourceData.categories)) {
      // Categories already as array
      genres = sourceData.genres || [];
      languages = sourceData.languages || [];
      qualities = sourceData.qualities || [];
    }
    
    // Handle seasons for series
    let seasons = sourceData.seasons || null;
    if (!seasons && (sourceData.season_1 || sourceData.season_2 || sourceData.season_3)) {
      seasons = {};
      for (let i = 1; i <= 10; i++) {
        const seasonKey = `season_${i}`;
        if (sourceData[seasonKey]) {
          seasons[seasonKey] = sourceData[seasonKey];
        }
      }
    }
    
    return {
      title: sourceData.title || 'Unknown Title',
      year,
      image: sourceData.featured_image || sourceData.featuredImage || sourceData.image,
      genres,
      languages,
      qualities,
      isSeries: !!seasons,
      seasons,
      description: metadata.description || sourceData.excerpt || "No description available.",
      duration: metadata.duration || sourceData.duration,
      rating: metadata.rating || sourceData.rating,
      downloadLinks,
      screenshots: screenshots.length > 0 ? screenshots : [],
      cast: sourceData.cast || [],
      director: sourceData.director,
      status: sourceData.status,
      publishDate: sourceData.date,
      modifiedDate: sourceData.modified_date
    };
  }, [movie, directDetails]);

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

  // Handle escape key and browser back button
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleBackButton = (e) => {
      // Prevent the browser from actually navigating back
      e.preventDefault();
      // Close the modal instead
      onClose();
    };

    window.addEventListener('keydown', handleEscKey);
    window.addEventListener('popstate', handleBackButton);

    // Add a history state when modal opens so back button can be intercepted
    window.history.pushState({ modalOpen: true }, '');

    return () => {
      window.removeEventListener('keydown', handleEscKey);
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onClose]);

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
      // console.error("Direct download error:", error);
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

  // Clean Download Info Display Component - Redesigned
  const DownloadInfoCard = ({ quality, size, description, isDownloading, index, movieData, rawDatabaseDetails }) => {
    const displayQuality = quality || 'HD';
    const displaySize = size || 'Unknown';
    // Use rawDatabaseDetails instead of description for display
    const databaseDetails = rawDatabaseDetails || description || '';
    const isLiveData = !!directDetails;
    
    const getQualityColor = (qual) => {
      switch (qual) {
        case '480P': return 'text-yellow-400';
        case '720P': return 'text-blue-400';
        case '1080P': return 'text-green-400';
        case '4K': return 'text-purple-400';
        case 'HD': return 'text-blue-400';
        default: return 'text-gray-400';
      }
    };

    // Parse and extract meaningful info from database details
    const parseDetailsInfo = (rawDetails) => {
      if (!rawDetails) return [];
      
      const info = [];
      const text = rawDetails.toUpperCase();
      
      // File Type
      if (/WEB-DL|WEBDL/.test(text)) info.push('WEB-DL');
      else if (/BLURAY|BLU-RAY|BRRIP/.test(text)) info.push('BluRay');
      else if (/WEBRIP|WEB-RIP/.test(text)) info.push('WEBRip');
      else if (/HDRIP|HD-RIP/.test(text)) info.push('HDRip');
      else if (/DVDRIP|DVD-RIP/.test(text)) info.push('DVDRip');
      else if (/HDTV|HD-TV/.test(text)) info.push('HDTV');
      else if (/CAMRIP|CAM-RIP|HDCAM/.test(text)) info.push('CAMRip');
      
      // Audio
      if (/DUAL AUDIO|MULTI AUDIO/.test(text)) info.push('Dual Audio');
      else if (/HINDI.*ENGLISH|ENGLISH.*HINDI/.test(text)) info.push('Hindi + English');
      else if (/5\.1|DTS|AC3/.test(text)) info.push('5.1 Surround');
      else if (/ATMOS/.test(text)) info.push('Dolby Atmos');
      else if (/HINDI/.test(text)) info.push('Hindi');
      else if (/ENGLISH/.test(text)) info.push('English');
      
      // Video Codec
      if (/H\.?265|X265|HEVC/.test(text)) info.push('HEVC');
      else if (/H\.?264|X264|AVC/.test(text)) info.push('H.264');
      
      // Special features
      if (/10BIT|10 BIT/.test(text)) info.push('10-bit');
      if (/HDR/.test(text)) info.push('HDR');
      if (/IMAX/.test(text)) info.push('IMAX');
      if (/60FPS|60 FPS/.test(text)) info.push('60fps');
      
      return info.slice(0, 4); // Limit to 4 most important items
    };

    const parsedInfo = parseDetailsInfo(databaseDetails);

    return (
      <div className="w-full space-y-3">
        {/* Live Data Badge */}
        {isLiveData && (
          <div className="flex justify-end">
            <span className="inline-flex items-center text-[10px] bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-600/30">
              <span className="mr-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live Data
            </span>
          </div>
        )}
        
        {/* Database Details Line - Only show if we have actual details */}
        {databaseDetails && databaseDetails.trim() && databaseDetails !== 'No additional details available' && (
          <div className="bg-gray-900/30 border-l-2 border-gray-600/50 pl-3 py-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Database Details:</span>
            </div>
            <div className="text-xs text-gray-300 font-mono leading-relaxed break-words">
              {databaseDetails}
            </div>
          </div>
        )}

        {/* Parsed Info Tags */}
        {parsedInfo.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedInfo.map((info, idx) => (
              <span 
                key={idx} 
                className="inline-block text-xs px-2 py-1 bg-gray-800/60 text-gray-300 rounded border border-gray-700/50"
              >
                {info}
              </span>
            ))}
          </div>
        )}

        {/* Download Button */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/40 to-gray-900/40 rounded-lg border border-gray-700/30 hover:border-red-500/50 transition-all duration-200">
          {/* Quality and Size */}
          <div className="flex items-center space-x-3">
            <div className={`text-sm font-bold ${getQualityColor(displayQuality)}`}>
              {displayQuality}
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <div className="text-sm text-gray-300">
              {displaySize}
            </div>
          </div>

          {/* Download Action */}
          <div className="flex items-center space-x-2">
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-green-400">Starting...</span>
              </>
            ) : (
              <>
                <Download size={16} className="text-gray-400" />
                <span className="text-sm text-white font-medium">Download</span>
              </>
            )}
          </div>
        </div>
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
        // console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    }
  };

  // Debugging effect for date fields
  useEffect(() => {
    if (movie) {
      // Debug dates
      console.log('📅 DATE DEBUG - MovieDetails received:', debugDate(movie));
    }
  }, [movie]);

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

        {/* Mobile layout - REDESIGNED with better proportions */}
        {isMobile && (
          <>
            {/* Hero section with image - reduced height to allow more room for content */}
            <div className="relative h-[30vh] w-full overflow-hidden bg-black">
              <div className="absolute inset-0 bg-gradient-to-r from-black to-gray-900 animate-pulse"></div>
              
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
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex flex-col gap-2">
                  {/* Content type and rating */}
                  <div className="flex items-center gap-2">
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
                  
                  <h2 id="movie-details-title" className="text-2xl font-bold text-white drop-shadow-lg">
                    {movieData.title}
                  </h2>
                  
                  {/* Basic metadata */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-300">
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
                  </div>
                  
                  {/* Date badge */}
                  {(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date) && (
                    <span className="flex items-center bg-red-600 text-white px-2 py-0.5 rounded text-xs shadow-sm self-start">
                      <Calendar size={10} className="mr-1" />
                      Added: {formatDateString(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation tabs - REDESIGNED */}
            <div className="flex items-center justify-around bg-black border-b border-gray-800 sticky top-0 z-20">
              <button 
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'download' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('download')}
              >
                <div className="flex flex-col items-center">
                  <Download size={16} className={activeTab === 'download' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Download</span>
                </div>
                {activeTab === 'download' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                )}
              </button>
              
              <button 
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'details' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('details')}
              >
                <div className="flex flex-col items-center">
                  <Info size={16} className={activeTab === 'details' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Details</span>
                </div>
                {activeTab === 'details' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                )}
              </button>
              
              <button 
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'preview' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('preview')}
              >
                <div className="flex flex-col items-center">
                  <Image size={16} className={activeTab === 'preview' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Preview</span>
                </div>
                {activeTab === 'preview' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                )}
              </button>
            </div>

            {/* Tab content container with better overflow handling */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto bg-black scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-black"
              style={{WebkitOverflowScrolling: 'touch'}}
            >
              {/* DOWNLOAD TAB */}
              {activeTab === 'download' && (
                <div className="p-4 pb-12">
                  {/* Live data indicator */}
                  <div className="flex justify-end mb-3">
                    <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-black border border-red-700/50">
                      <HardDrive size={12} className={directDetails ? "text-red-400" : "text-yellow-400"} />
                      <span className={directDetails ? "text-red-400" : "text-yellow-400"}>
                        {directDetails ? 'Live Database' : 'Cached Data'}
                      </span>
                    </div>
                  </div>
                  
                  {movieData.downloadLinks && movieData.downloadLinks.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-white mb-2 sticky top-0 bg-black z-10 py-2">
                        Download Links ({movieData.downloadLinks.length})
                      </h3>
                      
                      {/* Scrollable download links container with smaller fixed height for mobile */}
                      <div className="h-[45vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-black rounded-lg relative">
                        {/* Fade indicator at the bottom to hint scrollable content */}
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black to-transparent pointer-events-none z-10"></div>
                        {/* Fixed position indicator that shows there's more content */}
                        <div className="fixed bottom-24 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg shadow-red-600/30 z-20 animate-pulse">
                          <Download size={16} />
                        </div>
                        <div className="space-y-3 pb-12 relative">
                          {movieData.downloadLinks.length > 2 && (
                            <div className="absolute top-2 right-2 animate-bounce flex flex-col items-center z-10 opacity-80">
                              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
                              <span className="text-xs text-red-500 mt-1">Scroll</span>
                            </div>
                          )}
                          {movieData.downloadLinks.map((link, index) => (
                            <button
                              key={index}
                              onClick={() => handleDirectDownload(link, index)}
                              disabled={downloadingLinks.has(index)}
                              className={`w-full text-left bg-black rounded-lg border border-gray-800 hover:border-red-500 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden ${
                                downloadingLinks.has(index) ? 'animate-pulse' : ''
                              }`}
                            >
                              <div className="p-3">
                                {/* Database Details Line - More compact for mobile */}
                                {(link.rawDatabaseDetails || link.description) && (
                                  <div className="bg-black border-l-2 border-gray-700 pl-2 py-1 mb-2">
                                    <div className="text-xs text-gray-300 font-mono leading-normal break-words">
                                      {link.rawDatabaseDetails || link.description}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Quality and Size - More compact for mobile */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <div className={`text-sm font-bold ${
                                      link.quality === '4K' ? 'text-purple-400' :
                                      link.quality === '1080P' ? 'text-green-400' :
                                      link.quality === '720P' ? 'text-blue-400' :
                                      'text-yellow-400'
                                    }`}>
                                      {link.quality}
                                    </div>
                                    <div className="w-px h-3 bg-gray-700"></div>
                                    <div className="text-sm text-gray-300">
                                      {link.size}
                                    </div>
                                  </div>
                                  
                                  {/* Download Button - Larger and more noticeable */}
                                  <div className="bg-red-600 hover:bg-red-700 rounded-full p-3 transition-colors shadow-lg shadow-red-600/20">
                                    {downloadingLinks.has(index) ? (
                                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <Download size={20} className="text-white" />
                                    )}
                                  </div>
                                </div>
                                
                                {/* File info tags - More compact for mobile */}
                                {link.rawDatabaseDetails && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {link.rawDatabaseDetails.includes('WEB-DL') && (
                                      <span className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                        WEB-DL
                                      </span>
                                    )}
                                    {link.rawDatabaseDetails.includes('HEVC') && (
                                      <span className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                        HEVC
                                      </span>
                                    )}
                                    {link.rawDatabaseDetails.includes('Dual Audio') && (
                                      <span className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                        Dual Audio
                                      </span>
                                    )}
                                    {link.rawDatabaseDetails.includes('ESub') && (
                                      <span className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                        Subtitles
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-10 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                        <Download size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-400 mb-2">No download links available</p>
                      <p className="text-xs text-gray-500">Check back later for updates</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div className="p-4 pb-20 space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">
                      Synopsis
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {movieData.description}
                    </p>
                  </div>
                  
                  {/* Genres */}
                  {movieData.genres && movieData.genres.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Genres
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.genres.map((genre, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-black text-white border border-gray-700"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {movieData.languages && movieData.languages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.languages.map((language, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-black text-white border border-gray-700"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Series seasons */}
                  {movieData.isSeries && movieData.seasons && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Seasons Available
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(movieData.seasons)
                          .filter(([key, value]) => value && value.trim() !== '')
                          .map(([seasonKey, seasonValue], idx) => (
                          <div 
                            key={idx}
                            className="bg-black border border-gray-800 rounded-lg p-4"
                          >
                            <div className="text-white text-sm font-bold mb-2">
                              {seasonKey.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {seasonValue}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* PREVIEW TAB */}
              {activeTab === 'preview' && (
                <div className="flex flex-col items-center justify-center p-10 h-[50vh] text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <Image size={40} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
                  <p className="text-gray-400 mb-6">Screenshots will be available soon</p>
                  
                  <div className="w-full max-w-md p-6 bg-black border border-gray-800 rounded-lg">
                    <div className="flex items-center mb-4">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      <p className="text-gray-300 text-sm">Preview feature under development</p>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full w-full mb-2.5"></div>
                    <div className="h-2 bg-gray-800 rounded-full w-3/4"></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Desktop layout - REDESIGNED to match mobile tabs */}
        {!isMobile && (
          <div className="flex h-full">
            {/* Left side - Image */}
            <div className="w-1/3 h-full relative">
              <div className="absolute inset-0 bg-black animate-pulse"></div>
              
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
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/70"></div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent"></div>
              
              {/* Title and basic info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex flex-col gap-2">
                  {/* Content type and rating */}
                  <div className="flex items-center gap-2">
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
                  
                  <h2 id="movie-details-title" className="text-xl font-bold text-white drop-shadow-lg">
                    {movieData.title}
                  </h2>
                  
                  {/* Basic metadata */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-300">
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
                  </div>
                  
                  {/* Date badge */}
                  {(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date) && (
                    <span className="flex items-center bg-red-600 text-white px-2 py-0.5 rounded text-xs shadow-sm self-start">
                      <Calendar size={10} className="mr-1" />
                      Added: {formatDateString(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="absolute bottom-16 left-4 flex space-x-2">
                <button 
                  onClick={handleBookmark}
                  className={`relative flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                    isBookmarked ? 'bg-red-600' : 'bg-black border border-gray-700'
                  }`}
                >
                  <Bookmark size={16} className={`${isBookmarked ? 'text-white fill-white' : 'text-white'}`} />
                </button>
                
                <button 
                  onClick={handleLike}
                  className={`relative flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                    isLiked ? 'bg-red-600' : 'bg-black border border-gray-700'
                  }`}
                >
                  <ThumbsUp size={16} className={`${isLiked ? 'text-white fill-white' : 'text-white'}`} />
                </button>
                
                <button 
                  onClick={handleShare}
                  className="relative flex items-center justify-center bg-black border border-gray-700 p-2 rounded-full transition-all duration-200"
                >
                  <Share2 size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* Right side - Content with tabs */}
            <div className="w-2/3 flex flex-col h-full overflow-hidden bg-black">
              {/* Tabs navigation */}
              <div className="flex items-center justify-around border-b border-gray-800 bg-black sticky top-0 z-20">
                <button 
                  className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'download' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('download')}
                >
                  <div className="flex flex-col items-center">
                    <Download size={16} className={activeTab === 'download' ? 'text-red-500' : 'text-gray-400'} />
                    <span className="mt-1">Download</span>
                  </div>
                  {activeTab === 'download' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                  )}
                </button>
                
                <button 
                  className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'details' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('details')}
                >
                  <div className="flex flex-col items-center">
                    <Info size={16} className={activeTab === 'details' ? 'text-red-500' : 'text-gray-400'} />
                    <span className="mt-1">Details</span>
                  </div>
                  {activeTab === 'details' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                  )}
                </button>
                
                <button 
                  className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'preview' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <div className="flex flex-col items-center">
                    <Image size={16} className={activeTab === 'preview' ? 'text-red-500' : 'text-gray-400'} />
                    <span className="mt-1">Preview</span>
                  </div>
                  {activeTab === 'preview' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                  )}
                </button>
              </div>
              
              {/* Content area */}
              <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-black">
                {/* DOWNLOAD TAB */}
                {activeTab === 'download' && (
                  <div className="p-6 pb-20">
                    {/* Live data indicator */}
                    <div className="flex justify-end mb-4">
                      <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-black border border-gray-700">
                        <HardDrive size={12} className={directDetails ? "text-red-400" : "text-yellow-400"} />
                        <span className={directDetails ? "text-red-400" : "text-yellow-400"}>
                          {directDetails ? 'Live Database' : 'Cached Data'}
                        </span>
                      </div>
                    </div>
                    
                    {movieData.downloadLinks && movieData.downloadLinks.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white mb-4 sticky top-0 bg-black z-10 py-2">
                          Download Links ({movieData.downloadLinks.length})
                        </h3>
                        
                        {/* Scrollable download links container */}
                        <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-black rounded-lg">
                          <div className="space-y-4 pb-4">
                            {movieData.downloadLinks.map((link, index) => (
                              <button
                                key={index}
                                onClick={() => handleDirectDownload(link, index)}
                                disabled={downloadingLinks.has(index)}
                                className={`w-full text-left bg-black rounded-lg border border-gray-800 hover:border-red-500 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden ${
                                  downloadingLinks.has(index) ? 'animate-pulse' : ''
                                }`}
                              >
                                <div className="p-4">
                                  {/* Database Details Line */}
                                  {(link.rawDatabaseDetails || link.description) && (
                                    <div className="bg-black border-l-2 border-gray-700 pl-2 py-2 mb-3">
                                      <div className="text-xs text-gray-300 font-mono leading-relaxed break-words">
                                        {link.rawDatabaseDetails || link.description}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Quality and Size */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className={`text-sm font-bold ${
                                        link.quality === '4K' ? 'text-purple-400' :
                                        link.quality === '1080P' ? 'text-green-400' :
                                        link.quality === '720P' ? 'text-blue-400' :
                                        'text-yellow-400'
                                      }`}>
                                        {link.quality}
                                      </div>
                                      <div className="w-px h-4 bg-gray-700"></div>
                                      <div className="text-sm text-gray-300">
                                        {link.size}
                                      </div>
                                    </div>
                                    
                                    {/* Download Button */}
                                    <div className="bg-red-600 hover:bg-red-700 rounded-full p-2 transition-colors">
                                      {downloadingLinks.has(index) ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      ) : (
                                        <Download size={20} className="text-white" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* File info tags */}
                                  {link.rawDatabaseDetails && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {link.rawDatabaseDetails.includes('WEB-DL') && (
                                        <span className="inline-block text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                          WEB-DL
                                        </span>
                                      )}
                                      {link.rawDatabaseDetails.includes('HEVC') && (
                                        <span className="inline-block text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                          HEVC
                                        </span>
                                      )}
                                      {link.rawDatabaseDetails.includes('Dual Audio') && (
                                        <span className="inline-block text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                          Dual Audio
                                        </span>
                                      )}
                                      {link.rawDatabaseDetails.includes('ESub') && (
                                        <span className="inline-block text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                          Subtitles
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                          <Download size={32} className="text-gray-400" />
                        </div>
                        <p className="text-gray-400 mb-2">No download links available</p>
                        <p className="text-xs text-gray-500">Check back later for updates</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* DETAILS TAB */}
                {activeTab === 'details' && (
                  <div className="p-6 pb-20 space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Synopsis
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {movieData.description}
                      </p>
                    </div>
                    
                    {/* Genres */}
                    {movieData.genres && movieData.genres.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-3">
                          Genres
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {movieData.genres.map((genre, idx) => (
                            <span 
                              key={idx}
                              className="inline-block text-xs px-3 py-1.5 rounded-full bg-black text-white border border-gray-700"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {movieData.languages && movieData.languages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-3">
                          Languages
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {movieData.languages.map((language, idx) => (
                            <span 
                              key={idx}
                              className="inline-block text-xs px-3 py-1.5 rounded-full bg-black text-white border border-gray-700"
                            >
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Series seasons */}
                    {movieData.isSeries && movieData.seasons && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-3">
                          Seasons Available
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(movieData.seasons)
                            .filter(([key, value]) => value && value.trim() !== '')
                            .map(([seasonKey, seasonValue], idx) => (
                            <div 
                              key={idx}
                              className="bg-black border border-gray-800 rounded-lg p-4"
                            >
                              <div className="text-white text-sm font-bold mb-2">
                                {seasonKey.replace('_', ' ').toUpperCase()}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {seasonValue}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* PREVIEW TAB */}
                {activeTab === 'preview' && (
                  <div className="flex flex-col items-center justify-center p-10 h-[50vh] text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                      <Image size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
                    <p className="text-gray-400 mb-6">Screenshots will be available soon</p>
                    
                    <div className="w-full max-w-md p-6 bg-black border border-gray-800 rounded-lg">
                      <div className="flex items-center mb-4">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-2"></div>
                        <p className="text-gray-300 text-sm">Preview feature under development</p>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full w-full mb-2.5"></div>
                      <div className="h-2 bg-gray-800 rounded-full w-3/4"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile content based on active tab is now handled in the tab layout above */}
      </div>
    </div>
  );
};

export default React.memo(MovieDetails);
