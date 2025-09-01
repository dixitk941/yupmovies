import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info, Play, Film, Tv, HardDrive } from 'lucide-react';
import { getMovieDetailsById, getSeriesDetailsById } from '../services/directMovieService';
import { formatDateString, debugDate } from '../services/utils.js';

const MovieDetails = ({ movie, onClose }) => {
  const [directDetails, setDirectDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
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
                      {/* DATE ADDED DISPLAY - HIGH VISIBILITY */}
                      {(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date) && (
                        <span className="flex items-center bg-red-600/90 text-white px-2 py-0.5 rounded shadow-sm">
                          <Calendar size={12} className="mr-1" />
                          Added: {formatDateString(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date)}
                        </span>
                      )}
                      {movieData.qualities.length > 0 && (
                        <span className="text-xs border border-gray-600 px-1 rounded">
                          {movieData.qualities[0]}
                        </span>
                      )}
                      {/* DATE ADDED DISPLAY - HIGH VISIBILITY (MOBILE) */}
                      {(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date) && (
                        <span className="flex items-center bg-red-600/90 text-white px-2 py-0.5 rounded shadow-sm">
                          <Calendar size={12} className="mr-1" />
                          Added: {formatDateString(movieData.modifiedDate || movieData.modified_date || movieData.publishDate || movieData.date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* REDESIGNED MOBILE DOWNLOAD SECTION WITH PROPER SCROLLING */}
            {movieData.downloadLinks && movieData.downloadLinks.length > 0 && (
              <div className="relative z-20 bg-gradient-to-r from-gray-900/60 via-slate-900/40 to-gray-900/60 border-y border-gray-700/50 py-4 px-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium flex items-center">
                      <Download size={16} className="mr-2 text-red-400" />
                      <span>Download Options ({movieData.downloadLinks.length})</span>
                    </span>
                    <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-800/80 border border-gray-700/50">
                      <HardDrive size={12} className={directDetails ? "text-green-400" : "text-yellow-400"} />
                      <span className={directDetails ? "text-green-400" : "text-yellow-400"}>
                        {directDetails ? 'Live Database' : 'Cached Data'}
                      </span>
                    </div>
                  </div>                  {/* Scrollable Download List */}
                  <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {movieData.downloadLinks.map((link, index) => (
                      <button
                        key={index}
                        onClick={() => handleDirectDownload(link, index)}
                        disabled={downloadingLinks.has(index)}
                        className={`w-full text-left bg-gradient-to-r from-gray-800/80 to-gray-900/80 hover:from-red-600/20 hover:to-purple-600/20 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden ${
                          downloadingLinks.has(index) ? 'animate-pulse' : ''
                        }`}
                      >
                        <div className="p-3">
                          <DownloadInfoCard 
                            quality={link.quality} 
                            size={link.size}
                            description={link.description}
                            isDownloading={downloadingLinks.has(index)}
                            index={index}
                            movieData={movieData}
                            rawDatabaseDetails={link.rawDatabaseDetails || link.description}
                          />
                        </div>
                      </button>
                    ))}
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

                  {/* REDESIGNED DESKTOP DOWNLOAD SECTION WITH PROPER SCROLLING */}
                  {movieData.downloadLinks && movieData.downloadLinks.length > 0 && (
                    <div className="bg-gradient-to-r from-gray-900/30 via-slate-900/20 to-gray-900/30 border border-gray-700/30 rounded-xl p-4">
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium flex items-center">
                            <Download size={16} className="mr-2 text-red-400" />
                            Download Options ({movieData.downloadLinks.length})
                          </span>
                          <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-800/80 border border-gray-700/50">
                            <HardDrive size={12} className={directDetails ? "text-green-400" : "text-yellow-400"} />
                            <span className={directDetails ? "text-green-400" : "text-yellow-400"}>
                              {directDetails ? 'Live Database' : 'Cached Data'}
                            </span>
                          </div>
                        </div>                        {/* Scrollable Download List */}
                        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
                          {movieData.downloadLinks.map((link, index) => (
                            <button
                              key={index}
                              onClick={() => handleDirectDownload(link, index)}
                              disabled={downloadingLinks.has(index)}
                              className={`w-full text-left bg-gradient-to-r from-gray-800/40 to-gray-900/40 hover:from-red-600/20 hover:to-purple-600/20 rounded-lg border border-gray-700/40 hover:border-red-500/50 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden ${
                                downloadingLinks.has(index) ? 'animate-pulse' : ''
                              }`}
                            >
                              <div className="p-3">
                                <DownloadInfoCard 
                                  quality={link.quality} 
                                  size={link.size}
                                  description={link.description}
                                  isDownloading={downloadingLinks.has(index)}
                                  index={index}
                                  movieData={movieData}
                                  rawDatabaseDetails={link.rawDatabaseDetails || link.description}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable content area with improved scrolling */}
              <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                <div className="p-4 md:p-6 pb-24 space-y-6"> {/* Added space-y-6 for consistent spacing */}
                  {/* Description */}
                  <div>
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
                    <div>
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
                    <div>
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
                    <div>
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile content based on active tab with improved scrolling */}
        {isMobile && (
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto bg-black scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
          >
            <div className="p-4 pb-28 space-y-6"> {/* Added space-y-6 for consistent spacing and increased bottom padding */}
              {activeTab === 'details' && (
                <>
                  {/* Description */}
                  <div>
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
                    <div>
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-2"></span>
                        Genres
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.genres.map((genre, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30 transition-colors duration-200"
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
                      <h3 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movieData.languages.map((language, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-600/20 to-blue-600/20 text-green-300 border border-green-600/30 hover:bg-green-600/30 transition-colors duration-200"
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
                <div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MovieDetails);
