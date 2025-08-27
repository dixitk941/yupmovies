import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info, Play, ChevronDown, Package, Archive } from 'lucide-react';
import { getSeriesById, getSeriesEpisodes, getEpisodeDownloadLinks } from '../services/seriesService';

const SeriesDetail = ({ series, onClose }) => {
  console.log('🚀 SeriesDetail mounted with series:', series);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeTab, setActiveTab] = useState('episodes');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [expandGenres, setExpandGenres] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [seriesData, setSeriesData] = useState(null);
  
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const screenshotTimerRef = useRef(null);
  const backdropRef = useRef(null);
  const seasonDropdownRef = useRef(null);
  
  // Extract year from title if available
  const year = React.useMemo(() => {
    const currentSeriesData = seriesData || series;
    if (!currentSeriesData?.title) return '';
    const yearMatch = currentSeriesData.title.match(/\((\d{4})\)/);
    console.log('📅 Year extracted:', yearMatch ? yearMatch[1] : 'No year found');
    return yearMatch ? yearMatch[1] : '';
  }, [seriesData?.title, series?.title]);
  
  // Helper function to safely get categories as array
  const getCategories = useCallback(() => {
    const currentSeriesData = seriesData || series;
    console.log('🏷️ Getting categories from:', currentSeriesData?.categories);
    
    if (!currentSeriesData?.categories) {
      return currentSeriesData?.genres || [];
    }
    
    if (typeof currentSeriesData.categories === 'string') {
      const cats = currentSeriesData.categories.split(',').map(cat => cat.trim());
      console.log('🏷️ Categories parsed:', cats);
      return cats;
    } else if (Array.isArray(currentSeriesData.categories)) {
      console.log('🏷️ Categories already array:', currentSeriesData.categories);
      return currentSeriesData.categories;
    } else {
      console.log('🏷️ No categories found, trying genres');
      return currentSeriesData?.genres || [];
    }
  }, [seriesData?.categories, seriesData?.genres, series?.categories, series?.genres]);
  
  // Create a helper function for image error handling
  const handleImageError = (e) => {
    console.log('🖼️ Image error, using fallback');
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
    e.target.onerror = null;
  };
  
  // Generate unique ID from series title
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
      
      // Optional: Send to analytics endpoint
      console.log('📊 Activity logged:', activityData);
      
    } catch (e) {
      // Silent fail for analytics
    }
  };
  
  // Simple toast notification function
  const showToast = (message) => {
    console.log('🔔 Toast:', message);
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg z-[100] animate-fadeIn';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-fadeOut');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };
  
  // UPDATED: Fetch series data using new service structure
  useEffect(() => {
    console.log('🔄 Starting series data fetch...');
    
    if (!series) {
      console.log('❌ No series identifier provided');
      return;
    }
    
    const fetchSeriesData = async () => {
      console.log('🎬 Fetching series data for:', series.id || series.recordId || series);
      setIsLoadingSeasons(true);
      
      try {
        const seriesId = series.id || series.recordId || series.record_id || series;
        console.log('🔍 Using series ID:', seriesId);
        
        if (series.isSeries && series.seasons && Object.keys(series.seasons).length > 0) {
          console.log('✅ Series data already loaded, using directly');
          setSeriesData(series);
          
          const seasons = [];
          Object.entries(series.seasons).forEach(([seasonKey, seasonData]) => {
            console.log(`🎬 Processing season: ${seasonKey}`, seasonData);
            
            const seasonObj = {
              id: seasonKey,
              season: seasonData.seasonNumber,
              seasonNumber: seasonData.seasonNumber,
              episodes: seasonData.episodes || [],
              totalEpisodes: seasonData.totalEpisodes || seasonData.episodes?.length || 0
            };
            
            seasons.push(seasonObj);
          });
          
          seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
          setAvailableSeasons(seasons);
          
          if (seasons.length > 0) {
            setActiveSeason(seasons[0]);
            setSeasonEpisodes(seasons[0].episodes);
          }
        } else {
          console.log('🔄 Fetching fresh series data from service...');
          const fetchedSeries = await getSeriesById(seriesId);
          console.log('✅ Fetched series data from service:', fetchedSeries);
          
          if (fetchedSeries && fetchedSeries.seasons) {
            setSeriesData(fetchedSeries);
            
            const seasons = [];
            Object.entries(fetchedSeries.seasons).forEach(([seasonKey, seasonData]) => {
              console.log(`🎬 Processing season: ${seasonKey}`, seasonData);
              
              const seasonObj = {
                id: seasonKey,
                season: seasonData.seasonNumber,
                seasonNumber: seasonData.seasonNumber,
                episodes: seasonData.episodes || [],
                totalEpisodes: seasonData.totalEpisodes || seasonData.episodes?.length || 0
              };
              
              seasons.push(seasonObj);
            });
            
            seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
            setAvailableSeasons(seasons);
            
            if (seasons.length > 0) {
              setActiveSeason(seasons[0]);
              setSeasonEpisodes(seasons[0].episodes);
            }
          } else {
            console.log('❌ No valid series data returned from service');
            setAvailableSeasons([]);
          }
        }
      } catch (error) {
        console.error('💥 Error fetching series data:', error);
        showToast('Error loading series data');
        setAvailableSeasons([]);
      } finally {
        console.log('✅ Series data fetch complete');
        setIsLoadingSeasons(false);
      }
    };
    
    fetchSeriesData();
  }, [series]);
  
  // Handle season change
  const handleSeasonChange = useCallback(async (season) => {
    console.log('🎯 Changing to season:', season);
    setActiveSeason(season);
    setShowSeasonDropdown(false);
    setIsLoadingEpisodes(true);
    
    try {
      if (season.episodes && season.episodes.length > 0) {
        console.log('📺 Using cached episodes for season', season.seasonNumber);
        setSeasonEpisodes(season.episodes);
      } else {
        const seriesId = seriesData?.id || seriesData?.recordId || series?.id || series?.recordId;
        console.log('📺 Fetching fresh episodes for series:', seriesId, 'season:', season.seasonNumber);
        
        const episodes = await getSeriesEpisodes(seriesId, season.seasonNumber);
        console.log('📺 Fetched fresh episodes for season', season.seasonNumber, ':', episodes);
        
        setSeasonEpisodes(episodes.length > 0 ? episodes : []);
      }
    } catch (error) {
      console.error('💥 Error fetching season episodes:', error);
      showToast('Error loading season episodes');
      setSeasonEpisodes(season.episodes || []);
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [seriesData, series]);
  
  // Parse screenshots from poster field
  useEffect(() => {
    console.log('🖼️ Parsing screenshots from poster field...');
    const currentSeriesData = seriesData || series;
    if (!currentSeriesData) return;
    
    try {
      if (currentSeriesData.featuredImage) {
        console.log('🖼️ Using featuredImage from new structure');
        setScreenshots([currentSeriesData.featuredImage]);
        return;
      }
      
      if (currentSeriesData.poster && typeof currentSeriesData.poster === 'string') {
        console.log('🖼️ Poster field contains string, parsing HTML...');
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        const extracted = [];
        let match;
        
        while ((match = imgRegex.exec(currentSeriesData.poster)) !== null) {
          console.log('🖼️ Found screenshot URL:', match[1]);
          extracted.push(match[1]);
        }
        
        console.log('🖼️ Total screenshots extracted:', extracted.length);
        setScreenshots(extracted.length > 0 ? extracted : []);
      } else if (Array.isArray(currentSeriesData.poster)) {
        console.log('🖼️ Poster is already array:', currentSeriesData.poster);
        setScreenshots(currentSeriesData.poster);
      } else {
        console.log('🖼️ No poster data found');
        setScreenshots([]);
      }
    } catch (error) {
      console.error('💥 Error parsing screenshots:', error);
      setScreenshots([]);
    }
  }, [seriesData, series]);
  
  // Handle screen size detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      const tablet = window.innerWidth >= 640 && window.innerWidth < 1024;
      console.log('📱 Screen size changed:', { width: window.innerWidth, mobile, tablet });
      setIsMobile(mobile);
      setIsTablet(tablet);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Track scroll position for dynamic header
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setScrollPosition(contentRef.current.scrollTop);
      }
    };
    
    const currentRef = contentRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  
  // Add entrance animation after component mounts
  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
    
    return () => {
      if (screenshotTimerRef.current) {
        clearInterval(screenshotTimerRef.current);
      }
    };
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Auto-rotate screenshots every 5 seconds if they're visible
  useEffect(() => {
    if (activeTab === 'screenshots' && screenshots.length > 1) {
      screenshotTimerRef.current = setInterval(() => {
        setActiveScreenshot((prev) => (prev + 1) % screenshots.length);
      }, 5000);
    } else if (screenshotTimerRef.current) {
      clearInterval(screenshotTimerRef.current);
    }
    
    return () => {
      if (screenshotTimerRef.current) {
        clearInterval(screenshotTimerRef.current);
      }
    };
  }, [activeTab, activeScreenshot, screenshots.length]);

  // Navigate through screenshots
  const nextScreenshot = useCallback(() => {
    if (screenshots.length <= 1) return;
    setActiveScreenshot((prev) => (prev + 1) % screenshots.length);
  }, [screenshots.length]);
  
  const prevScreenshot = useCallback(() => {
    if (screenshots.length <= 1) return;
    setActiveScreenshot((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1));
  }, [screenshots.length]);
  
  // UPDATED: Handle direct download without redirect
  const handleDownload = useCallback(async (episode, linkIndex = 0, episodeNumber = null, isFullSeason = false, isPackageDownload = false) => {
    console.log('⬇️ Direct download initiated:', { episode, linkIndex, episodeNumber, isFullSeason, isPackageDownload });
    
    let downloadUrl, quality, size, isPackage = false, fileName = '';
    const currentSeriesData = seriesData || series;
    
    // Extract download information
    if (typeof episode === 'string') {
      downloadUrl = episode;
      quality = 'HD';
      size = '';
    } else if (episode && episode.downloadLinks && episode.downloadLinks.length > 0) {
      const link = episode.downloadLinks[linkIndex] || episode.downloadLinks[0];
      downloadUrl = link.url;
      quality = link.quality || 'HD';
      size = link.size || '';
      isPackage = link.isPackage || false;
      episodeNumber = episode.episodeNumber || episode.number;
    } else if (episode && episode.url) {
      downloadUrl = episode.url;
      quality = episode.quality || 'HD';
      size = episode.size || '';
      episodeNumber = episode.episodeNumber || episode.number;
    } else {
      console.log('❌ No download link available');
      showToast("No download link available");
      return;
    }

    if (!downloadUrl) {
      console.log('❌ Download URL is empty');
      showToast("No download link available");
      return;
    }

    // Generate appropriate filename
    if (isPackage || isPackageDownload) {
      fileName = `${currentSeriesData?.title} - Season ${activeSeason?.seasonNumber} Package (${quality}).zip`;
    } else if (episodeNumber !== null && episodeNumber !== 'complete') {
      fileName = `${currentSeriesData?.title} - S${activeSeason?.seasonNumber}E${episodeNumber} (${quality}).mkv`;
    } else {
      fileName = `${currentSeriesData?.title} - Season ${activeSeason?.seasonNumber} (${quality}).mkv`;
    }
    
    // Clean filename for filesystem compatibility
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');

    try {
      // Method 1: Try HTML5 download attribute (works for same-origin and some cross-origin)
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      
      // Style the anchor to be invisible
      anchor.style.display = 'none';
      
      document.body.appendChild(anchor);
      
      // Check if the download attribute is supported
      if ('download' in anchor) {
        console.log('✅ Using HTML5 download attribute');
        anchor.click();
      } else {
        console.log('⚠️ HTML5 download not supported, opening in new tab');
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      }
      
      document.body.removeChild(anchor);
      
      // Show success message
      if (isPackage || isPackageDownload) {
        showToast(`📦 Downloading: ${currentSeriesData?.title} Season Package (${quality})`);
      } else if (episodeNumber !== null && episodeNumber !== 'complete') {
        showToast(`📺 Downloading: S${activeSeason?.seasonNumber}E${episodeNumber} (${quality})`);
      } else {
        showToast(`📺 Downloading: Season ${activeSeason?.seasonNumber} (${quality})`);
      }
      
      console.log('✅ Direct download initiated successfully');
      
      // Log activity
      logActivity('direct_download_success', { 
        title: currentSeriesData?.title,
        quality,
        season: activeSeason?.seasonNumber,
        episode: episodeNumber,
        isPackage: isPackage || isPackageDownload,
        method: 'direct_download'
      });
      
    } catch (error) {
      console.error('💥 Direct download failed:', error);
      
      // Ultimate fallback: Copy URL to clipboard and notify user
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(downloadUrl);
          showToast("📋 Download URL copied to clipboard - paste in browser address bar");
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = downloadUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showToast("📋 Download URL copied to clipboard");
        }
      } catch (clipboardError) {
        console.error('💥 Clipboard fallback failed:', clipboardError);
        showToast("❌ Unable to start download. Please try again.");
      }
    }
  }, [seriesData, series, activeSeason]);

  if (!series) {
    console.log('❌ No series data, rendering fallback');
    return <div className="text-center py-10">Series data not available</div>;
  }

  const currentSeriesData = seriesData || series;

  console.log('🎬 Current state:', {
    isLoadingSeasons,
    availableSeasons: availableSeasons.length,
    activeSeason: activeSeason?.seasonNumber,
    seasonEpisodes: seasonEpisodes.length,
    activeTab,
    seriesData: !!seriesData,
    seasonZipLinks: currentSeriesData?.seasonZipLinks?.length || 0
  });

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-0 overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="series-details-title"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-[#100818]/30 to-black/40 animate-gradient-shift"></div>
      
      {/* Animated particles in background */}
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
      
      <div 
        ref={modalRef}
        className={`relative w-full h-full md:h-[95%] md:w-[94%] lg:h-[90%] xl:max-w-7xl bg-gradient-to-b from-[#0a0a0a] to-black rounded-none md:rounded-2xl overflow-hidden shadow-2xl border border-gray-800/30
          ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-500`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrollPosition > 100 ? 'bg-black/90 backdrop-blur-md shadow-xl' : 'bg-transparent'
        }`}>
          <div className="flex items-center justify-between p-3 md:p-4">
            <h3 className={`transition-all duration-300 truncate ${
              scrollPosition > 100 ? 'opacity-100 max-w-[200px] md:max-w-md' : 'opacity-0 max-w-0'
            } text-white font-medium`}>
              {currentSeriesData.title}
            </h3>
            
            <button 
              className="bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-colors duration-200 ml-auto"
              onClick={onClose}
              aria-label="Close details"
            >
              <X size={isMobile ? 18 : 22} />
            </button>
          </div>
        </div>
        
        {/* Main content container */}
        <div className="md:flex h-full">
          {/* Left column - Featured image (desktop) and full-width hero (mobile) */}
          <div className={`${isMobile ? 'h-[35vh]' : 'md:w-[40%] lg:w-[35%] h-full'}`}>
            <div className="relative h-full w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse"></div>
              
              <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
                <img 
                  src={currentSeriesData.featuredImage || currentSeriesData.featured_image || currentSeriesData.poster || currentSeriesData.image} 
                  alt={currentSeriesData.title} 
                  className={`w-full h-full ${isMobile ? 'object-cover' : 'object-cover md:object-contain'} transition-opacity duration-700 opacity-0 onload-visible`}
                  onLoad={(e) => {
                    e.target.classList.add('opacity-100');
                    e.target.classList.remove('opacity-0');
                  }}
                  onError={handleImageError}
                />
              </div>
              
              {/* Gradient overlays for better text legibility */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/90 to-transparent"></div>
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent"></div>
              
              {/* Show title on mobile view over the image */}
              {isMobile && (
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="inline-block mb-2 px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium backdrop-blur-sm">
                    <Play size={12} className="inline mr-1" /> TV Series
                  </div>
                  
                  <h2 id="series-details-title" className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                    {currentSeriesData.title}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-300">
                    {year && (
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {year}
                      </span>
                    )}
                    {availableSeasons.length > 0 && (
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>
                        {availableSeasons.length} {availableSeasons.length === 1 ? 'Season' : 'Seasons'}
                      </span>
                    )}
                    <span className="text-xs border border-gray-600 px-1 rounded">HD</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right column - Content area */}
          <div className={`${isMobile ? 'h-[65vh]' : 'md:w-[60%] lg:w-[65%] h-full'} flex flex-col`}>
            {/* Series title & metadata (desktop only) */}
            {!isMobile && (
              <div className="px-5 pt-5 pb-3">
                <div className="inline-block mb-2 px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium">
                  <Play size={12} className="inline mr-1" /> TV Series
                </div>
                
                <h2 id="series-details-title" className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {currentSeriesData.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs md:text-sm text-gray-300 mb-2">
                  {year && (
                    <span className="flex items-center">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {year}
                    </span>
                  )}
                  {availableSeasons.length > 0 && (
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>
                      {availableSeasons.length} {availableSeasons.length === 1 ? 'Season' : 'Seasons'}
                    </span>
                  )}
                  {getCategories().length > 0 && (
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
                      {getCategories()[0]}
                    </span>
                  )}
                  <span className="text-xs border border-gray-600 px-1 rounded">HD</span>
                </div>
                
                <div className="flex items-center gap-2.5 mt-3">
                  <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2 rounded-full transition-all duration-200 overflow-hidden group">
                    <Bookmark size={16} className="text-white relative z-10" />
                    <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                  </button>
                  
                  <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2 rounded-full transition-all duration-200 overflow-hidden group">
                    <ThumbsUp size={16} className="text-white relative z-10" />
                    <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                  </button>
                  
                  <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2 rounded-full transition-all duration-200 overflow-hidden group">
                    <Share2 size={16} className="text-white relative z-10" />
                    <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Tab navigation */}
            <div className="flex border-b border-gray-800 sticky top-0 z-20 bg-black/90 backdrop-blur-sm">
              <button
                className={`py-3 px-4 text-sm font-medium relative overflow-hidden ${activeTab === 'episodes' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => {
                  console.log('🎯 Switching to episodes tab');
                  setActiveTab('episodes');
                }}
              >
                Episodes
                {activeTab === 'episodes' && (
                  <>
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-purple-600"></span>
                    <span className="absolute bottom-0 left-0 w-16 h-0.5 bg-white/30 animate-slide-right"></span>
                  </>
                )}
              </button>
              
              <button
                className={`py-3 px-4 text-sm font-medium relative overflow-hidden ${activeTab === 'details' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => {
                  console.log('🎯 Switching to details tab');
                  setActiveTab('details');
                }}
              >
                Details
                {activeTab === 'details' && (
                  <>
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-purple-600"></span>
                    <span className="absolute bottom-0 left-0 w-16 h-0.5 bg-white/30 animate-slide-right"></span>
                  </>
                )}
              </button>
              
              {screenshots.length > 0 && (
                <button
                  className={`py-3 px-4 text-sm font-medium relative overflow-hidden ${activeTab === 'screenshots' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => {
                    console.log('🎯 Switching to screenshots tab');
                    setActiveTab('screenshots');
                  }}
                >
                  Screenshots
                  {activeTab === 'screenshots' && (
                    <>
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-purple-600"></span>
                      <span className="absolute bottom-0 left-0 w-16 h-0.5 bg-white/30 animate-slide-right"></span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Tab content area */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain" 
            >
              <div className="p-4 md:p-5">
                {/* EPISODES TAB */}
                {activeTab === 'episodes' && (
                  <div className="animate-fadeIn">
                    {/* Loading states */}
                    {isLoadingSeasons && (
                      <div className="text-center py-6 text-gray-400">
                        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Loading seasons...</p>
                      </div>
                    )}

                    {/* No seasons available */}
                    {!isLoadingSeasons && (!availableSeasons || availableSeasons.length === 0) && (
                      <div className="text-center py-8 text-gray-400">
                        <Info size={40} className="mx-auto mb-4 text-gray-600" />
                        <p>No seasons available for this series</p>
                      </div>
                    )}

                    {/* Season selector and episodes */}
                    {!isLoadingSeasons && availableSeasons && availableSeasons.length > 0 && (
                      <>
                        {/* Season selector dropdown */}
                        <div className="relative mb-4" ref={seasonDropdownRef}>
                          <button
                            className="flex items-center justify-between w-full sm:w-64 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700 focus:outline-none hover:border-purple-500/50 transition-colors duration-300"
                            onClick={() => {
                              console.log('🔽 Season dropdown toggled');
                              setShowSeasonDropdown(!showSeasonDropdown);
                            }}
                          >
                            <span className="flex items-center">
                              <Play size={16} className="mr-2 text-red-500" />
                              {activeSeason ? `Season ${activeSeason.seasonNumber}` : 'Select Season'}
                            </span>
                            <ChevronDown 
                              size={18} 
                              className={`transition-transform duration-300 ${showSeasonDropdown ? 'rotate-180' : ''}`} 
                            />
                          </button>
                          
                          {showSeasonDropdown && (
                            <div className="absolute z-10 mt-1 w-full sm:w-64 bg-[#1a1a1a] rounded-lg border border-gray-700 shadow-xl max-h-60 overflow-y-auto">
                              {availableSeasons.map(season => (
                                <button
                                  key={season.id}
                                  className="w-full text-left px-4 py-2 hover:bg-[#252525] flex items-center"
                                  onClick={() => handleSeasonChange(season)}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${activeSeason?.id === season.id ? 'bg-red-500' : 'bg-gray-600'}`}></span>
                                  Season {season.seasonNumber}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Episodes loading */}
                        {isLoadingEpisodes && (
                          <div className="text-center py-6 text-gray-400">
                            <div className="animate-spin w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-sm">Loading episodes...</p>
                          </div>
                        )}

                        {/* UPDATED: Episodes list with package separation */}
                        {!isLoadingEpisodes && seasonEpisodes && seasonEpisodes.length > 0 && (
                          <div className="space-y-2.5">
                            {seasonEpisodes.map((episode, index) => (
                              <div 
                                key={episode.id || `episode-${index}`} 
                                className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800/30 hover:border-purple-500/20 transition-colors duration-300"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center">
                                    <div className="bg-gradient-to-r from-red-600 to-purple-600 w-10 h-10 flex items-center justify-center rounded-md mr-3 shadow-md shadow-purple-900/20">
                                      {episode.episodeNumber === 'complete' ? 'S' : episode.episodeNumber || episode.number}
                                    </div>
                                    <div>
                                      <h4 className="font-medium">
                                        {episode.episodeNumber === 'complete' ? 'Complete Season' : `Episode ${episode.episodeNumber || episode.number}`}
                                      </h4>
                                      <div className="text-sm text-gray-400 flex items-center mt-1">
                                        <span className="mr-3">{episode.downloadLinks?.length || 1} download options</span>
                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Direct Download</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Episode streaming downloads */}
                                {episode.downloadLinks && episode.downloadLinks.length > 0 && (
                                  <div>
                                    <div className="text-xs text-gray-500 mb-2 flex items-center">
                                      <Play size={12} className="mr-1" />
                                      Episode Streaming Files
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {episode.downloadLinks.map((link, linkIndex) => (
                                        <button
                                          key={linkIndex}
                                          onClick={() => {
                                            console.log(`⬇️ Episode download clicked:`, link);
                                            handleDownload(episode, linkIndex);
                                          }}
                                          className="bg-[#252525] hover:bg-green-600/20 border hover:border-green-500/50 px-3 py-1.5 rounded text-sm transition-all duration-300 hover:scale-105 flex items-center gap-2"
                                        >
                                          <Download size={14} />
                                          {link.quality} ({link.size})
                                          <span className="text-xs text-green-400">Direct</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* UPDATED: Season zip packages section */}
                        {currentSeriesData?.seasonZipLinks && currentSeriesData.seasonZipLinks.length > 0 && (
                          <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-blue-900/20 border border-blue-500/30 rounded-lg">
                            <div className="text-sm text-gray-400 mb-3 flex items-center">
                              <Package size={14} className="mr-2 text-blue-400" />
                              Season Packages (Zip/Archive Files)
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {currentSeriesData.seasonZipLinks.map((zipLink, zipIndex) => (
                                <button
                                  key={zipIndex}
                                  onClick={() => {
                                    console.log(`⬇️ Package download clicked:`, zipLink);
                                    handleDownload(zipLink, 0, 'package', false, true);
                                  }}
                                  className="bg-blue-900/20 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 px-3 py-1.5 rounded text-sm transition-all duration-300 hover:scale-105 flex items-center gap-2"
                                >
                                  <Archive size={14} />
                                  {zipLink.quality} ({zipLink.size})
                                  <span className="text-xs text-blue-400">Package</span>
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              📦 Package files contain multiple episodes in compressed format
                            </div>
                          </div>
                        )}

                        {/* No episodes available */}
                        {!isLoadingEpisodes && (!seasonEpisodes || seasonEpisodes.length === 0) && (
                          <div className="text-center py-6 text-gray-400">
                            <Info size={40} className="mx-auto mb-4 text-gray-600" />
                            <p>No episodes available for this season</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* DETAILS TAB */}
                {activeTab === 'details' && (
                  <div className="animate-fadeIn">
                    {/* Genres */}
                    {getCategories().length > 0 && (
                      <div className="mb-5">
                        <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                          <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-2"></span>
                          Genres
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {getCategories()
                            .slice(0, expandGenres ? undefined : 5)
                            .map((category, index) => (
                              <span 
                                key={index}
                                className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30 transition-colors duration-200"
                              >
                                {category}
                              </span>
                            ))}
                            
                          {getCategories().length > 5 && !expandGenres && (
                            <button 
                              className="text-xs px-3 py-1 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors duration-300"
                              onClick={() => setExpandGenres(true)}
                            >
                              +{getCategories().length - 5} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {(currentSeriesData?.content?.description || currentSeriesData?.excerpt) && (
                      <div className="mb-5">
                        <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                          <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                          Description
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {currentSeriesData?.content?.description || currentSeriesData?.excerpt}
                        </p>
                      </div>
                    )}

                    {/* Series Statistics */}
                    {currentSeriesData && (
                      <div className="mb-5">
                        <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                          <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-2"></span>
                          Series Info
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-[#1a1a1a] p-3 rounded-lg">
                            <div className="text-gray-400">Total Seasons</div>
                            <div className="text-white font-medium">{currentSeriesData.totalSeasons || availableSeasons.length}</div>
                          </div>
                          <div className="bg-[#1a1a1a] p-3 rounded-lg">
                            <div className="text-gray-400">Total Episodes</div>
                            <div className="text-white font-medium">{currentSeriesData.totalEpisodes || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Download Options Notice */}
                    <div className="p-4 bg-gradient-to-r from-green-900/20 via-blue-900/20 to-purple-900/20 border border-gray-700/50 rounded-lg mb-5">
                      <div className="flex items-center mb-2">
                        <Download size={16} className="text-green-400 mr-2" />
                        <h4 className="text-sm font-medium text-white">Download Options Available</h4>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          <span>Direct download for individual episodes</span>
                        </div>
                        {currentSeriesData?.seasonZipLinks && currentSeriesData.seasonZipLinks.length > 0 && (
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            <span>Season packages (ZIP/Archive) for bulk download</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                          <span>No redirects - downloads start immediately</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick link to episodes */}
                    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-gray-800/30">
                      <p className="text-sm text-gray-400">
                        Want to start watching? Access all episodes and download links:
                      </p>
                      <button
                        className="mt-3 px-4 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 rounded-md text-sm flex items-center transition-all duration-300 shadow-md shadow-purple-900/20"
                        onClick={() => setActiveTab('episodes')}
                      >
                        <ChevronRight size={16} className="mr-2" />
                        Go to Episodes
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREENSHOTS TAB */}
                {activeTab === 'screenshots' && (
                  <div className="animate-fadeIn">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <button 
                          className="bg-[#252525] hover:bg-[#303030] p-2.5 rounded-full transition-all duration-300"
                          onClick={prevScreenshot}
                          aria-label="Previous screenshot"
                        >
                          <ChevronLeft size={20} className="text-white" />
                        </button>
                        <span className="text-sm text-gray-400">
                          {activeScreenshot + 1} / {screenshots.length}
                        </span>
                        <button 
                          className="bg-[#252525] hover:bg-[#303030] p-2.5 rounded-full transition-all duration-300"
                          onClick={nextScreenshot}
                          aria-label="Next screenshot"
                        >
                          <ChevronRight size={20} className="text-white" />
                        </button>
                      </div>
                      <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-lg shadow-lg">
                        <img 
                          src={screenshots[activeScreenshot]} 
                          alt={`Screenshot ${activeScreenshot + 1}`} 
                          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                          onError={handleImageError}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesDetail;
