import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Download, Star, Heart, ChevronLeft, ChevronRight, Calendar, 
  Clock, Globe, Bookmark, Share2, Info, Play, ChevronDown, 
  Package, Archive, Tv, Eye, Users, Award, HardDrive, Film, Image, ThumbsUp
} from 'lucide-react';
import { getSeriesById, getSeriesEpisodes, getEpisodeDownloadLinks } from '../services/seriesService';
import { formatDateString, debugDate } from '../services/utils.js';
import { LoadingDots } from '../components/Skeleton';

const SeriesDetail = ({ series, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('episodes');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [expandGenres, setExpandGenres] = useState(false);
  const [expandLanguages, setExpandLanguages] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [downloadingLinks, setDownloadingLinks] = useState(new Set());
  const [activeSeason, setActiveSeason] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [seriesData, setSeriesData] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [episodeQualities, setEpisodeQualities] = useState({});
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const backdropRef = useRef(null);
  const seasonDropdownRef = useRef(null);
  
  // Helper functions
  const year = React.useMemo(() => {
    const currentSeriesData = seriesData || series;
    if (!currentSeriesData?.title) return '';
    const yearMatch = currentSeriesData.title.match(/\((\d{4})\)/);
    return yearMatch ? yearMatch[1] : '';
  }, [seriesData?.title, series?.title]);
  
  const getCategories = useCallback(() => {
    const currentSeriesData = seriesData || series;
    if (!currentSeriesData?.categories) {
      return currentSeriesData?.genres || [];
    }
    
    if (typeof currentSeriesData.categories === 'string') {
      return currentSeriesData.categories.split(',').map(cat => cat.trim());
    } else if (Array.isArray(currentSeriesData.categories)) {
      return currentSeriesData.categories;
    } else {
      return currentSeriesData?.genres || [];
    }
  }, [seriesData?.categories, seriesData?.genres, series?.categories, series?.genres]);
  
  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/400x600/1e293b/64748b?text=No+Image';
    e.target.onerror = null;
  };
  
  // Enhanced Episode Download Selector with file type information
  const EpisodeDownloadSelector = ({ episode, onDownload, isDownloading, seriesData }) => {
    const episodeId = episode.id || episode.episodeNumber;
    const selectedQuality = episodeQualities[episodeId] || '';
    
    const setSelectedQuality = (quality) => {
      setEpisodeQualities(prev => ({
        ...prev,
        [episodeId]: quality
      }));
    };

    const handleDownloadClick = () => {
      if (!selectedQuality) {
        showToast('Please select a quality to download', 'error');
        return;
      }
      
      const linkIndex = episode.downloadLinks.findIndex(link => link.quality === selectedQuality);
      if (linkIndex !== -1) {
        onDownload(episode, linkIndex);
      }
    };

    const getQualityDisplay = (quality) => {
      const map = {
        '480P': '480p',
        '720P': '720p',
        '1080P': '1080p',
        '4K': '4K',
        'HD': 'HD',
        'SD': 'SD'
      };
      return map[quality] || quality || 'HD';
    };

    // Enhanced format info extraction for series
    const getFormatInfo = (link, seriesInfo) => {
      const sources = [
        link?.description || '', 
        seriesInfo?.categories || '',
        episode?.description || ''
      ].filter(Boolean);
      
      // File type patterns
      const fileTypePatterns = [
        { pattern: /WEB-DL/i, display: 'WEB-DL' },
        { pattern: /BluRay|Blu-Ray|BRRIP|BRRip/i, display: 'BluRay' },
        { pattern: /WEBRip|WEB-Rip/i, display: 'WEBRip' },
        { pattern: /HDRip|HD-Rip/i, display: 'HDRip' },
        { pattern: /DVDRip|DVD-Rip/i, display: 'DVDRip' },
        { pattern: /HDTV|HD-TV/i, display: 'HDTV' }
      ];
      
      for (const source of sources) {
        for (const { pattern, display } of fileTypePatterns) {
          if (pattern.test(source)) {
            return display;
          }
        }
      }
      
      return '';
    };

    // Get audio info
    const getAudioInfo = (link, seriesInfo) => {
      const sources = [
        link?.description || '', 
        seriesInfo?.categories || '',
        episode?.description || ''
      ].filter(Boolean);
      
      const audioPatterns = [
        { pattern: /Dual Audio|Multi Audio/i, display: 'Dual' },
        { pattern: /Hindi.*English|English.*Hindi/i, display: 'Dual' },
        { pattern: /10Bit|10-Bit/i, display: '10Bit' }
      ];
      
      for (const source of sources) {
        for (const { pattern, display } of audioPatterns) {
          if (pattern.test(source)) {
            return display;
          }
        }
      }
      
      return '';
    };

    return (
      <div className="space-y-2 mt-2">
        {/* Enhanced Quality Selector with file type info */}
        <div className="relative">
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            className="w-full bg-slate-800 text-white border border-orange-600 rounded px-3 py-2 text-sm appearance-none cursor-pointer pr-8 hover:border-orange-500 focus:outline-none focus:border-orange-400 transition-colors"
            style={{ minWidth: '200px' }}
          >
            <option value="" disabled className="bg-slate-800">
              Select quality & format
            </option>
            {episode.downloadLinks?.map((link, index) => {
              const formatInfo = getFormatInfo(link, seriesData);
              const audioInfo = getAudioInfo(link, seriesData);
              const qualityDisplay = getQualityDisplay(link.quality);
              
              let optionText = qualityDisplay;
              if (link.size) {
                optionText += ` (${link.size})`;
              }
              if (formatInfo) {
                optionText += ` - ${formatInfo}`;
              }
              if (audioInfo) {
                optionText += ` ${audioInfo}`;
              }
              
              return (
                <option key={index} value={link.quality} className="bg-slate-800">
                  {optionText}
                </option>
              );
            })}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </div>

        {/* Enhanced info display for selected quality */}
        {selectedQuality && (
          <div className="flex items-center gap-2 text-xs">
            {(() => {
              const selectedLink = episode.downloadLinks?.find(link => link.quality === selectedQuality);
              if (!selectedLink) return null;
              
              const formatInfo = getFormatInfo(selectedLink, seriesData);
              const audioInfo = getAudioInfo(selectedLink, seriesData);
              
              return (
                <>
                  <span className="text-gray-400">Selected:</span>
                  {formatInfo && (
                    <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                      {formatInfo}
                    </span>
                  )}
                  {audioInfo && (
                    <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                      {audioInfo}
                    </span>
                  )}
                  <span className="text-gray-500">
                    {selectedLink.size || 'Size unknown'}
                  </span>
                </>
              );
            })()}
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownloadClick}
          disabled={isDownloading || !selectedQuality}
          className={`w-full px-4 py-2 rounded text-sm font-semibold transition-all duration-200 ${
            isDownloading 
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
              : selectedQuality
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isDownloading ? 'Downloading...' : 'Download Selected Quality'}
        </button>
      </div>
    );
  };
  
  // Compact toast notification
  const showToast = (message, type = 'info') => {
    const existingToast = document.querySelector('.compact-toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }
    
    const toast = document.createElement('div');
    toast.className = 'compact-toast fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-[200] max-w-xs text-sm';
    
    const styles = {
      success: 'bg-green-600 text-white',
      error: 'bg-red-600 text-white',
      info: 'bg-blue-600 text-white'
    };
    
    toast.classList.add(...styles[type].split(' '));
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };
  
  // Screen detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Data fetching
  useEffect(() => {
    if (!series) return;
    
    const fetchSeriesData = async () => {
      setIsLoadingSeasons(true);
      try {
        if (series.isSeries && series.seasons && Object.keys(series.seasons).length > 0) {
          setSeriesData(series);
          const seasons = Object.entries(series.seasons).map(([seasonKey, seasonData]) => ({
            id: seasonKey,
            seasonNumber: seasonData.seasonNumber,
            episodes: seasonData.episodes || [],
            totalEpisodes: seasonData.totalEpisodes || seasonData.episodes?.length || 0
          })).sort((a, b) => a.seasonNumber - b.seasonNumber);
          
          setAvailableSeasons(seasons);
          if (seasons.length > 0) {
            setActiveSeason(seasons[0]);
            setSeasonEpisodes(seasons[0].episodes);
          }
        }
      } catch (error) {
        // console.error('Error fetching series data:', error);
        showToast('Error loading series data', 'error');
      } finally {
        setIsLoadingSeasons(false);
      }
    };
    
    fetchSeriesData();
  }, [series]);

  // Download handler
  const handleDownload = useCallback(async (episode, linkIndex = 0, isPackage = false) => {
    const downloadKey = `${episode?.id || episode?.episodeNumber || 'package'}-${linkIndex}`;
    setDownloadingLinks(prev => new Set([...prev, downloadKey]));
    
    try {
      let downloadUrl, quality = 'HD', size = '';
      
      if (typeof episode === 'string') {
        downloadUrl = episode;
      } else if (episode?.downloadLinks?.length > 0) {
        const link = episode.downloadLinks[linkIndex] || episode.downloadLinks[0];
        downloadUrl = link.url;
        quality = link.quality || 'HD';
        size = link.size || '';
      } else if (episode?.url) {
        downloadUrl = episode.url;
        quality = episode.quality || 'HD';
        size = episode.size || '';
      }

      if (!downloadUrl) {
        showToast("No download link available", 'error');
        return;
      }

      showToast(`Starting download: ${quality}`, 'info');
      
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${seriesData?.title || 'Episode'}_${quality}.mkv`;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.style.display = 'none';
      
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      
      setTimeout(() => showToast(`Download started: ${quality}`, 'success'), 1000);
      
    } catch (error) {
      // console.error('Download failed:', error);
      showToast("Download failed", 'error');
    } finally {
      setTimeout(() => {
        setDownloadingLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(downloadKey);
          return newSet;
        });
      }, 3000);
    }
  }, [seriesData]);

  const handleSeasonChange = useCallback((season) => {
    setActiveSeason(season);
    setShowSeasonDropdown(false);
    setSeasonEpisodes(season.episodes || []);
  }, []);

  if (!series) {
    return <div className="text-center py-10">Series data not available</div>;
  }

  const currentSeriesData = seriesData || series;

  // Add tabs configuration
  const tabs = [
    { id: 'episodes', label: 'Episodes', icon: Play },
    { id: 'packages', label: 'Season Packs', icon: Package },
    { id: 'details', label: 'Details', icon: Info }
  ];

  // Extract series data similar to MovieDetails
  const extractSeriesData = useCallback(() => {
    const sourceData = seriesData || series;
    
    if (!sourceData) return {};
    
    return {
      title: sourceData.title || 'Unknown Series',
      year: year,
      image: sourceData.featuredImage || sourceData.featured_image || sourceData.poster || sourceData.image,
      genres: getCategories() || [],
      languages: sourceData.languages || [],
      isSeries: true,
      seasons: sourceData.seasons,
      description: sourceData.content?.description || sourceData.excerpt || "No description available.",
      duration: sourceData.content?.duration,
      rating: sourceData.content?.rating,
      downloadLinks: [],
      cast: sourceData.cast || [],
      director: sourceData.director,
      status: sourceData.status,
      publishDate: sourceData.date,
      modifiedDate: sourceData.modified_date
    };
  }, [series, seriesData, year, getCategories]);

  const seriesDataExtracted = extractSeriesData();

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-0 overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="series-details-title"
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
              <Tv size={20} className="text-blue-400 mr-2" />
              <h3 className="text-white font-medium truncate max-w-[200px] md:max-w-md">
                {seriesDataExtracted.title}
              </h3>
              {seriesDataExtracted.year && (
                <span className="text-gray-400 text-sm ml-2">({seriesDataExtracted.year})</span>
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

        {/* Mobile layout - REDESIGNED to match MovieDetails */}
        {isMobile && (
          <>
            {/* Hero section with image - reduced height to allow more room for content */}
            <div className="relative h-[30vh] w-full overflow-hidden bg-black">
              <div className="absolute inset-0 bg-gradient-to-r from-black to-gray-900 animate-pulse"></div>
              
              <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
                <img 
                  src={seriesDataExtracted.image} 
                  alt={seriesDataExtracted.title} 
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
                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium backdrop-blur-sm">
                      <Tv size={12} className="mr-1" /> Series
                    </div>
                    
                    {seriesDataExtracted.rating && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                        <Star size={12} className="mr-1 fill-yellow-400" /> {seriesDataExtracted.rating}
                      </div>
                    )}
                  </div>
                  
                  <h2 id="series-details-title" className="text-2xl font-bold text-white drop-shadow-lg">
                    {seriesDataExtracted.title}
                  </h2>
                  
                  {/* Basic metadata */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-300">
                    {seriesDataExtracted.year && (
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {seriesDataExtracted.year}
                      </span>
                    )}
                    {availableSeasons.length > 0 && (
                      <span className="flex items-center">
                        <Tv size={14} className="mr-1 text-gray-400" />
                        {availableSeasons.length} Seasons
                      </span>
                    )}
                    {seriesDataExtracted.languages.length > 0 && (
                      <span className="flex items-center">
                        <Globe size={14} className="mr-1 text-gray-400" />
                        {seriesDataExtracted.languages[0]}
                      </span>
                    )}
                  </div>
                  
                  {/* Date badge */}
                  {(seriesDataExtracted.modifiedDate || seriesDataExtracted.publishDate) && (
                    <span className="flex items-center bg-red-600 text-white px-2 py-0.5 rounded text-xs shadow-sm self-start">
                      <Calendar size={10} className="mr-1" />
                      Added: {formatDateString(seriesDataExtracted.modifiedDate || seriesDataExtracted.publishDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex flex-col gap-2">
                  {/* Content type and rating */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium backdrop-blur-sm">
                      <Tv size={12} className="mr-1" /> TV Series
                    </div>
                    
                    {currentSeriesData.rating && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                        <Star size={12} className="mr-1 fill-yellow-400" /> {currentSeriesData.rating}
                      </div>
                    )}
                  </div>
                  
                  <h2 id="series-details-title" className="text-2xl font-bold text-white drop-shadow-lg">
                    {currentSeriesData.title}
                  </h2>
                  
                  {/* Basic metadata */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-300">
                    {year && (
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {year}
                      </span>
                    )}
                    {availableSeasons.length > 0 && (
                      <span className="flex items-center">
                        <Tv size={14} className="mr-1 text-gray-400" />
                        {availableSeasons.length} Seasons
                      </span>
                    )}
                    {currentSeriesData.language && (
                      <span className="flex items-center">
                        <Globe size={14} className="mr-1 text-gray-400" />
                        {currentSeriesData.language}
                      </span>
                    )}
                  </div>
                  
                  {/* Date badge */}
                  {(currentSeriesData.modifiedDate || currentSeriesData.modified_date || currentSeriesData.publishDate || currentSeriesData.date) && (
                    <span className="flex items-center bg-red-600 text-white px-2 py-0.5 rounded text-xs shadow-sm self-start">
                      <Calendar size={10} className="mr-1" />
                      Added: {formatDateString(currentSeriesData.modifiedDate || currentSeriesData.modified_date || currentSeriesData.publishDate || currentSeriesData.date)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation tabs - REDESIGNED to match MovieDetails */}
            <div className="flex items-center justify-around bg-black border-b border-gray-800 sticky top-0 z-20">
              <button 
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'episodes' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('episodes')}
              >
                <div className="flex flex-col items-center">
                  <Play size={16} className={activeTab === 'episodes' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Episodes</span>
                </div>
                {activeTab === 'episodes' && (
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
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'packages' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('packages')}
              >
                <div className="flex flex-col items-center">
                  <Package size={16} className={activeTab === 'packages' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Packages</span>
                </div>
                {activeTab === 'packages' && (
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
          {/* Left Panel - COMPACT */}
          <div className={`${isMobile ? 'h-40' : 'w-72'} relative flex-shrink-0`}>
            {/* Hero Image */}
            <div className="relative h-full overflow-hidden">
              <img 
                src={currentSeriesData.featuredImage || currentSeriesData.featured_image || currentSeriesData.poster || currentSeriesData.image} 
                alt={currentSeriesData.title}
                className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={handleImageError}
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              
              {/* Series Info - COMPACT */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center space-x-1 bg-purple-600/30 px-2 py-0.5 rounded-full text-xs">
                    <Tv size={10} />
                    <span>TV Series</span>
                  </div>
                  
                  <h1 className="text-base font-bold text-white leading-tight">
                    {currentSeriesData.title}
                  </h1>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    {year && <span>{year}</span>}
                    {availableSeasons.length > 0 && <span>{availableSeasons.length} Seasons</span>}
                  </div>
                  
                  {/* Action Buttons - SMALLER */}
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    <button 
                      onClick={() => { setIsLiked(!isLiked); showToast(isLiked ? 'Removed from favorites' : 'Added to favorites', 'success'); }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                        isLiked ? 'bg-red-600/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart size={10} className={isLiked ? 'fill-current' : ''} />
                    </button>
                    
                    <button 
                      onClick={() => { setIsBookmarked(!isBookmarked); showToast(isBookmarked ? 'Removed from watchlist' : 'Added to watchlist', 'success'); }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                        isBookmarked ? 'bg-blue-600/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Bookmark size={10} className={isBookmarked ? 'fill-current' : ''} />
                    </button>
                    
                    <button 
                      onClick={() => { 
                        if (navigator.share) {
                          navigator.share({ title: currentSeriesData.title, url: window.location.href });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('Link copied', 'success');
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-all"
                    >
                      <Share2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col bg-black/30 min-h-0">
            {/* Tab Navigation - COMPACT */}
            <div className="flex-shrink-0 border-b border-white/20 bg-black/50">
              <div className="flex overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id 
                        ? 'text-white border-b-2 border-purple-500 bg-purple-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area - FIXED WITH EXTRA BOTTOM PADDING */}
            <div 
              className="flex-1 overflow-y-auto overscroll-contain" 
              ref={contentRef}
              style={{ 
                maxHeight: isMobile ? 'calc(100vh - 10rem)' : 'calc(100vh - 6rem)',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: isMobile ? '120px' : '80px' // ADDED EXTRA BOTTOM PADDING
              }}
            >
              <div className="p-3 space-y-3 pb-24"> {/* INCREASED bottom padding from pb-6 to pb-24 */}
                
                {/* EPISODES TAB - WITH QUALITY SELECTOR + SINGLE BUTTON */}
                {activeTab === 'episodes' && (
                  <div className="space-y-3">
                    {/* Season Selector - SMALLER */}
                    {!isLoadingSeasons && availableSeasons.length > 0 && (
                      <div className="relative" ref={seasonDropdownRef}>
                        <button
                          onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                          className="flex items-center justify-between w-full p-2.5 bg-white/10 rounded-lg border border-white/20 hover:border-purple-500/50 transition-all"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
                              <Tv size={12} className="text-white" />
                            </div>
                            <div className="text-left">
                              <div className="text-white font-medium text-sm">
                                {activeSeason ? `Season ${activeSeason.seasonNumber}` : 'Select Season'}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {activeSeason ? `${seasonEpisodes.length} episodes` : 'Choose season'}
                              </div>
                            </div>
                          </div>
                          <ChevronDown 
                            size={14} 
                            className={`text-gray-400 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} 
                          />
                        </button>
                        
                        {showSeasonDropdown && (
                          <div className="absolute z-20 mt-1 w-full bg-slate-800 rounded-lg border border-white/20 shadow-xl max-h-40 overflow-y-auto">
                            {availableSeasons.map(season => (
                              <button
                                key={season.id}
                                onClick={() => handleSeasonChange(season)}
                                className={`w-full text-left p-2.5 hover:bg-white/10 flex items-center space-x-2.5 transition-all text-sm ${
                                  activeSeason?.id === season.id ? 'bg-purple-600/30 border-l-2 border-purple-500' : ''
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full ${activeSeason?.id === season.id ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                                <div>
                                  <div className="text-white">Season {season.seasonNumber}</div>
                                  <div className="text-gray-400 text-xs">{season.episodes?.length || 0} episodes</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Episodes List - WITH QUALITY SELECTOR LIKE THE IMAGE AND EXTRA MARGIN FOR LAST ITEM */}
                    {!isLoadingEpisodes && seasonEpisodes?.length > 0 ? (
                      <div className="space-y-2">
                        {seasonEpisodes.map((episode, index) => (
                          <div 
                            key={episode.id || `episode-${index}`} 
                            className={`bg-white/5 rounded-lg p-3 border border-white/10 hover:border-purple-500/30 transition-all ${
                              index === seasonEpisodes.length - 1 ? 'mb-20' : '' // EXTRA MARGIN FOR LAST EPISODE
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                  {episode.episodeNumber === 'complete' ? 'S' : episode.episodeNumber || episode.number}
                                </div>
                                <div>
                                  <h4 className="text-white font-medium text-sm">
                                    {episode.episodeNumber === 'complete' ? 'Complete Season' : `Episode ${episode.episodeNumber || episode.number}`}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-gray-400 text-xs">{episode.downloadLinks?.length || 1} qualities</span>
                                    <div className="bg-green-600/30 px-1.5 py-0.5 rounded text-green-300 text-xs flex items-center">
                                      <HardDrive size={8} className="mr-0.5" />
                                      Direct
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Quality Selector + Single Download Button - EXACTLY LIKE THE IMAGE */}
                            {episode.downloadLinks?.length > 0 && (
                              <EpisodeDownloadSelector
                                episode={episode}
                                onDownload={handleDownload}
                                isDownloading={downloadingLinks.has(`${episode.id || episode.episodeNumber}-0`)}
                                seriesData={currentSeriesData}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isLoadingEpisodes ? (
                      <div className="text-center py-6">
                        <LoadingDots size="md" color="purple" className="justify-center mb-2" />
                        <p className="text-gray-400 text-sm">Loading episodes...</p>
                      </div>
                    ) : (
                      <div className="text-center py-6 mb-20"> {/* EXTRA MARGIN FOR EMPTY STATE */}
                        <Tv size={24} className="mx-auto mb-2 text-gray-600" />
                        <p className="text-gray-400">No episodes available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PACKAGES TAB - ALSO WITH EXTRA PADDING */}
                {activeTab === 'packages' && (
                  <div className="space-y-3">
                    <div className="text-center py-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <Package size={20} className="text-white" />
                      </div>
                      <h2 className="text-base font-bold text-white mb-1">Season Packages</h2>
                      <p className="text-gray-400 text-sm">Download complete seasons</p>
                    </div>

                    {currentSeriesData?.seasonZipLinks?.length > 0 ? (
                      <div className="space-y-3">
                        {currentSeriesData.seasonZipLinks.map((zipLink, zipIndex) => {
                          const downloadKey = `package-${zipIndex}`;
                          const isDownloading = downloadingLinks.has(downloadKey);
                          
                          return (
                            <div 
                              key={zipIndex}
                              className={`bg-blue-600/10 rounded-lg p-3 border border-blue-500/30 hover:border-blue-500/50 transition-all ${
                                zipIndex === currentSeriesData.seasonZipLinks.length - 1 ? 'mb-20' : '' // EXTRA MARGIN FOR LAST PACKAGE
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Archive size={16} className="text-white" />
                                  </div>
                                  <div>
                                    <h3 className="text-white font-medium text-sm">
                                      Season {activeSeason?.seasonNumber || ''} Archive
                                    </h3>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <div className={`bg-gradient-to-r ${zipLink.quality === '4K' ? 'from-purple-500 to-pink-500' : zipLink.quality === '1080P' ? 'from-emerald-500 to-green-500' : 'from-blue-500 to-cyan-500'} rounded px-2 py-0.5`}>
                                        <span className="text-white text-xs font-bold">
                                          {zipLink.quality === '1080P' ? '1080p' : zipLink.quality === '720P' ? '720p' : zipLink.quality === '480P' ? '480p' : zipLink.quality}
                                        </span>
                                      </div>
                                      <span className="text-gray-300 text-xs">{zipLink.size}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">All episodes compressed</p>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => {
                                    setDownloadingLinks(prev => new Set([...prev, downloadKey]));
                                    handleDownload(zipLink, 0, true);
                                  }}
                                  disabled={isDownloading}
                                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded px-4 py-2 text-white text-sm font-medium transition-all"
                                >
                                  {isDownloading ? 'Downloading...' : 'Click here'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 mb-20"> {/* EXTRA MARGIN FOR EMPTY STATE */}
                        <Package size={24} className="mx-auto mb-2 text-gray-600" />
                        <p className="text-gray-400 mb-2">No packages available</p>
                        <button
                          onClick={() => setActiveTab('episodes')}
                          className="bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-1.5 text-white text-sm font-medium transition-all"
                        >
                          Browse Episodes
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* DETAILS TAB - ALSO WITH EXTRA PADDING */}
                {activeTab === 'details' && (
                  <div className="space-y-3 mb-20"> {/* EXTRA BOTTOM MARGIN */}
                    {/* Same details content as before */}
                    {(currentSeriesData?.content?.description || currentSeriesData?.excerpt) && (
                      <div className="space-y-2">
                        <h3 className="text-white font-bold flex items-center text-sm">
                          <div className="w-1 h-3 bg-purple-500 rounded-full mr-2"></div>
                          Synopsis
                        </h3>
                        <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {currentSeriesData?.content?.description || currentSeriesData?.excerpt}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Genres */}
                    {getCategories().length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-white font-bold flex items-center text-sm">
                          <div className="w-1 h-3 bg-pink-500 rounded-full mr-2"></div>
                          Genres
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {getCategories().slice(0, expandGenres ? getCategories().length : 6).map((category, index) => (
                            <span 
                              key={index}
                              className="px-2.5 py-1 bg-purple-600/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30"
                            >
                              {category}
                            </span>
                          ))}
                          {!expandGenres && getCategories().length > 6 && (
                            <button 
                              onClick={() => setExpandGenres(true)}
                              className="px-2.5 py-1 bg-white/10 text-gray-300 rounded-full text-xs font-medium border border-white/20 hover:bg-white/20"
                            >
                              +{getCategories().length - 6} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Series Stats */}
                    <div className="space-y-2">
                      <h3 className="text-white font-bold flex items-center text-sm">
                        <div className="w-1 h-3 bg-green-500 rounded-full mr-2"></div>
                        Information
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Seasons', value: availableSeasons.length, icon: Tv },
                          { label: 'Episodes', value: currentSeriesData.totalEpisodes || 'TBA', icon: Play },
                          { label: 'Year', value: year || 'TBA', icon: Calendar },
                          { label: 'Quality', value: 'HD', icon: Award }
                        ].map((stat, index) => (
                          <div key={index} className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
                            <stat.icon size={14} className="mx-auto mb-1 text-purple-400" />
                            <div className="text-gray-400 text-xs">{stat.label}</div>
                            <div className="text-white font-bold text-xs">{stat.value}</div>
                          </div>
                        ))}
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
