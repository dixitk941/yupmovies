import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, 
  Clock, Globe, Bookmark, Share2, Award, Info, Play, Film, Tv, 
  HardDrive, Image, Eye, Users, Volume2 
} from 'lucide-react';
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
  
  // Enhanced parseDownloadLinks function
  const parseDownloadLinks = useCallback((linksString) => {
    if (!linksString || typeof linksString !== 'string') return [];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Raw links string:', linksString.substring(0, 200) + '...');
    }
    
    try {
      const links = [];
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
        
        // Fallback quality detection from size
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
          rawDatabaseDetails: title.trim()
        });
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Final parsed links:', links.map(l => ({ 
          quality: l.quality, 
          size: l.size, 
          description: l.description.substring(0, 50) + '...' 
        })));
      }
      
      const qualityOrder = { '480P': 1, '720P': 2, '1080P': 3, '4K': 4, 'HD': 2.5 };
      return links.sort((a, b) => (qualityOrder[a.quality] || 5) - (qualityOrder[b.quality] || 5));
      
    } catch (error) {
      console.error('Error parsing download links:', error);
      return [];
    }
  }, []);

  // Extract movie data
  const extractMovieData = useCallback(() => {
    const sourceData = directDetails || movie;
    
    if (!sourceData) return {};
    
    if (directDetails) {
      return {
        ...directDetails,
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
    
    console.log('🔄 Using cached movie data for details');
    
    let screenshots = [];
    let downloadLinks = [];
    if (sourceData.downloadLinks && Array.isArray(sourceData.downloadLinks)) {
      downloadLinks = sourceData.downloadLinks;
    } else if (sourceData.links && typeof sourceData.links === 'string') {
      downloadLinks = parseDownloadLinks(sourceData.links);
    }
    
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
    
    const yearMatch = sourceData.title?.match(/\((\d{4})\)/);
    const year = sourceData.releaseYear || (yearMatch ? yearMatch[1] : '');
    
    let genres = [];
    let languages = [];
    let qualities = [];
    
    if (sourceData.categories && typeof sourceData.categories === 'string') {
      const categoryArray = sourceData.categories.split(',').map(c => c.trim());
      
      const technicalTerms = ['480p', '720p', '1080p', '4K', 'HD', 'Full HD', 'WEB-DL', 'BluRay', 'Blu-Ray'];
      const languageTerms = ['Hindi', 'English', 'Telugu', 'Tamil', 'Malayalam', 'Punjabi'];
      
      genres = categoryArray.filter(cat => 
        !technicalTerms.some(term => cat.includes(term)) &&
        !languageTerms.some(lang => cat.includes(lang)) &&
        !cat.match(/^\d{4}$/)
      );
      
      languages = categoryArray.filter(cat => 
        languageTerms.some(lang => cat.includes(lang))
      );
      
      qualities = categoryArray.filter(cat => 
        technicalTerms.some(term => cat.includes(term))
      );
    } else if (sourceData.categories && Array.isArray(sourceData.categories)) {
      genres = sourceData.genres || [];
      languages = sourceData.languages || [];
      qualities = sourceData.qualities || [];
    }
    
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
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleEscKey);
    window.addEventListener('popstate', handleBackButton);
    window.history.pushState({ modalOpen: true }, '');

    return () => {
      window.removeEventListener('keydown', handleEscKey);
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onClose]);

  // Direct download handler
  const handleDirectDownload = async (linkData, index) => {
    if (!linkData || !linkData.url) {
      showToast("Download link not available", 'error');
      return;
    }

    setDownloadingLinks(prev => new Set([...prev, index]));

    try {
      showToast(`Starting download: ${linkData.quality} (${linkData.size})`, 'info');
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = linkData.url;
      downloadAnchor.download = `${movieData.title}_${linkData.quality}.${getFileExtension(linkData.url)}`;
      downloadAnchor.target = '_blank';
      downloadAnchor.rel = 'noopener noreferrer';
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      
      logActivity('direct_download_initiated', { 
        quality: linkData.quality,
        size: linkData.size,
        movieTitle: movieData.title,
        isSeries: movieData.isSeries,
        timestamp: new Date().toISOString()
      });
      
      setTimeout(() => {
        showToast(`Download started successfully: ${linkData.quality}`, 'success');
      }, 1000);
      
    } catch (error) {
      showToast("Download failed. Please try again.", 'error');
    } finally {
      setTimeout(() => {
        setDownloadingLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 3000);
    }
  };

  const getFileExtension = (url) => {
    if (!url) return 'mp4';
    
    const extensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    for (const ext of extensions) {
      if (url.toLowerCase().includes(`.${ext}`)) {
        return ext;
      }
    }
    
    return 'mp4';
  };

  const logActivity = (action, data) => {
    try {
      const activityData = {
        action,
        ...data,
        userAgent: navigator.userAgent.substring(0, 50),
        timestamp: new Date().toISOString()
      };
      
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

  const showToast = (message, type = 'info') => {
    const existingToast = document.querySelector('.download-toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }
    
    const toast = document.createElement('div');
    toast.className = 'download-toast fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-[100] animate-fadeIn max-w-sm';
    
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
        // Share cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    }
  };

  // Get quality badge color
  const getQualityBadgeColor = (quality) => {
    switch (quality) {
      case '4K':
        return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
      case '1080P':
        return 'bg-gradient-to-r from-green-600 to-emerald-600 text-white';
      case '720P':
        return 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white';
      case '480P':
        return 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white';
    }
  };

  // Parse technical details from description
  const parseTechnicalInfo = (rawDetails) => {
    if (!rawDetails) return [];
    
    const info = [];
    const text = rawDetails.toUpperCase();
    
    // Format type
    if (/WEB-DL|WEBDL/.test(text)) info.push({ label: 'WEB-DL', icon: Download });
    else if (/BLURAY|BLU-RAY|BRRIP/.test(text)) info.push({ label: 'BluRay', icon: HardDrive });
    else if (/WEBRIP|WEB-RIP/.test(text)) info.push({ label: 'WEBRip', icon: Download });
    
    // Audio info
    if (/DUAL AUDIO|MULTI AUDIO/.test(text)) info.push({ label: 'Dual Audio', icon: Volume2 });
    else if (/5\.1|DTS|AC3/.test(text)) info.push({ label: '5.1 Surround', icon: Volume2 });
    
    // Video codec
    if (/H\.?265|X265|HEVC/.test(text)) info.push({ label: 'HEVC', icon: Film });
    else if (/H\.?264|X264|AVC/.test(text)) info.push({ label: 'H.264', icon: Film });
    
    return info.slice(0, 3);
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="movie-details-title"
    >
      {/* Exact replica following your layout order */}
      <div 
        ref={modalRef}
        className={`relative w-full h-full bg-black overflow-hidden flex flex-col
          ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-500`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="absolute top-4 right-4 z-50">
          <button 
            className="bg-black/70 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black transition-all duration-200"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={24} />
          </button>
        </div>

        {/* 1. Title and Date Section */}
        <div className="bg-black px-8 py-4 border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto">
            {/* Title - dynamic from movie data */}
            <h1 className="text-xl font-bold text-white mb-1 leading-tight truncate">
              {movieData.title || 'Unknown Title'}
            </h1>
            
            {/* Updated date - dynamic from movie data */}
            <div className="text-gray-300 text-xs">
              {(movieData.modifiedDate || movieData.modified_date) ? 
                `Updated on ${formatDateString(movieData.modifiedDate || movieData.modified_date)}` :
                (movieData.publishDate || movieData.date) ? 
                `Published on ${formatDateString(movieData.publishDate || movieData.date)}` :
                'Date not available'
              }
            </div>
          </div>
        </div>

        {/* 2. Image Section with Episode Badge - Series card style */}
        <div className="bg-black px-8 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="w-full max-w-2xl mx-auto relative">
              {/* Series card style image - wider aspect ratio */}
              <div className="w-full h-48 rounded-lg overflow-hidden shadow-xl border border-gray-700/50 relative bg-gray-900">
                <img 
                  src={movieData.image} 
                  alt={movieData.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/640x192/1a1a1a/666?text=No+Image';
                  }}
                />
                
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40"></div>
                
                {/* Episode badge overlay on image - dynamic */}
                <div className="absolute top-3 left-3">
                  {movieData.isSeries ? (
                    <div className="inline-flex items-center bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-medium">
                      Series
                      <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-[10px]">
                        Watch Now
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium">
                      Movie
                      <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-[10px]">
                        Watch Now
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Play button overlay in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="bg-red-600/90 hover:bg-red-600 rounded-full p-3 transition-colors shadow-lg">
                    <Play size={24} className="text-white ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. VLC Media Player Recommendation Line */}
        <div className="bg-black px-8 py-4 border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center space-x-3">
              <div className="bg-orange-600 rounded-full p-2">
                <Info size={16} className="text-white" />
              </div>
              <div className="text-sm text-gray-300 leading-relaxed">
                For immersive experience always use <span className="text-orange-400 font-semibold">VLC Media Player</span>. It supports all the audio codex
              </div>
            </div>
          </div>
        </div>

        {/* 4. Tabs Section */}
        <div className="bg-black border-b border-gray-800">
          <div className="flex max-w-7xl mx-auto">
            {[
              { id: 'download', label: 'Download', active: true },
              { id: 'details', label: 'Details', active: false },
              { id: 'previews', label: 'Previews', active: false }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-4 text-sm font-medium transition-colors relative ${
                  (activeTab === tab.id || (tab.id === 'download' && activeTab === 'download'))
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
                {(activeTab === tab.id || (tab.id === 'download' && activeTab === 'download')) && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Tab Content Section */}
        <div className="flex-1 overflow-y-auto bg-black">
          {/* Download Tab - Exact match to image */}
          {activeTab === 'download' && (
            <div className="p-8">
              <div className="max-w-7xl mx-auto">
                {/* Download Options header */}
                <div className="mb-6">
                  <h3 className="text-white text-lg font-medium mb-2">Download Options</h3>
                  <div className="text-gray-400 text-sm">{movieData.downloadLinks?.length || 0}</div>
                </div>

                {/* Dynamic Download Links - Show all available links with individual file info */}
                {movieData.downloadLinks && movieData.downloadLinks.length > 0 ? (
                  <div className="space-y-4">
                    {movieData.downloadLinks.map((link, index) => (
                      <div key={index} className="bg-gray-900/30 border border-gray-700/50 rounded-lg overflow-hidden">
                        {/* File Information for this specific download */}
                        <div className="bg-gray-900/60 border-l-4 border-gray-600 p-4">
                          <h4 className="text-white font-medium mb-2">File Information:</h4>
                          <div className="text-gray-300 text-sm leading-relaxed">
                            {link.rawDatabaseDetails || link.description || 
                             `Download ${movieData.title} (${movieData.year || 'Unknown'}) ${link.quality || 'HD'} [${link.size || 'Unknown'}]`}
                          </div>
                          
                          {/* Dynamic Tags based on link details */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {link.quality && (
                              <span className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs font-medium">
                                {link.quality}
                              </span>
                            )}
                            {link.rawDatabaseDetails?.includes('BluRay') && (
                              <span className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs font-medium">
                                BluRay
                              </span>
                            )}
                            {link.rawDatabaseDetails?.includes('WEB-DL') && (
                              <span className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs font-medium">
                                WEB-DL
                              </span>
                            )}
                            {(link.rawDatabaseDetails?.includes('Hindi') && link.rawDatabaseDetails?.includes('English')) ? (
                              <span className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs font-medium">
                                Hindi + English
                              </span>
                            ) : (
                              <>
                                {movieData.languages?.map((lang, idx) => (
                                  <span key={idx} className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs font-medium">
                                    {lang}
                                  </span>
                                ))}
                              </>
                            )}
                            {link.rawDatabaseDetails?.includes('HEVC') && (
                              <span className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs font-medium">
                                HEVC
                              </span>
                            )}
                            {link.rawDatabaseDetails?.includes('Dual Audio') && (
                              <span className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs font-medium">
                                Dual Audio
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Download button row */}
                        <div className="flex items-center justify-between p-4 hover:bg-gray-900/20 transition-colors">
                          {/* Left side - Quality and size */}
                          <div className="flex items-center space-x-4">
                            <span className="text-white font-semibold text-base">{link.quality || 'HD'}</span>
                            <div className="text-gray-500 text-lg">|</div>
                            <span className="text-gray-300 text-base">{link.size || 'Unknown'}</span>
                          </div>

                          {/* Right side - Download button */}
                          <button 
                            onClick={() => handleDirectDownload(link, index)}
                            disabled={downloadingLinks.has(index)}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
                          >
                            {downloadingLinks.has(index) ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download size={16} />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback when no download links are available
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Download size={24} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 mb-2">No download links available</p>
                    <p className="text-gray-500 text-sm">Check back later for updates</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="p-8">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Synopsis */}
                <div>
                  <h3 className="text-white text-lg font-medium mb-3">Synopsis</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {movieData.description}
                  </p>
                </div>

                {/* Movie Info Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Genres */}
                  {movieData.genres && movieData.genres.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Genres</h4>
                      <div className="flex flex-wrap gap-2">
                        {movieData.genres.map((genre, idx) => (
                          <span key={idx} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {movieData.languages && movieData.languages.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {movieData.languages.map((language, idx) => (
                          <span key={idx} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Previews Tab */}
          {activeTab === 'previews' && (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Eye size={32} className="text-gray-500" />
              </div>
              <h3 className="text-white text-xl font-medium mb-2">Coming Soon</h3>
              <p className="text-gray-400 mb-6">Preview screenshots and trailers will be available soon</p>
              
              <div className="w-full max-w-md bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-gray-300 text-sm">Feature under development</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-800 rounded w-full"></div>
                  <div className="h-2 bg-gray-800 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MovieDetails);
