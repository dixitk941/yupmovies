import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Download, Star, Heart, ChevronLeft, ChevronRight, Calendar, 
  Clock, Globe, Bookmark, Share2, Info, Play, ChevronDown, 
  Package, Archive, Image, Tv, Eye, Users, Award 
} from 'lucide-react';
import { getSeriesById, getSeriesEpisodes, getEpisodeDownloadLinks } from '../services/seriesService';

const SeriesDetail = ({ series, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeTab, setActiveTab] = useState('episodes');
  const [expandGenres, setExpandGenres] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [seriesData, setSeriesData] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [downloadingLinks, setDownloadingLinks] = useState(new Set());
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const modalRef = useRef(null);
  const contentRef = useRef(null);
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
  
  // COMPACT DOWNLOAD BUTTON COMPONENT - Same as Movies
  const CompactDownloadButton = ({ link, onClick, isDownloading, description }) => {
    const getQualityColor = (quality) => {
      switch (quality) {
        case '480P': return 'from-yellow-500 to-orange-500 text-white shadow-yellow-500/25';
        case '720P': return 'from-blue-500 to-cyan-500 text-white shadow-blue-500/25';
        case '1080P': return 'from-emerald-500 to-green-500 text-white shadow-emerald-500/25';
        case '4K': return 'from-purple-500 to-pink-500 text-white shadow-purple-500/25';
        case 'HD': return 'from-blue-500 to-cyan-500 text-white shadow-blue-500/25';
        default: return 'from-gray-500 to-gray-600 text-white shadow-gray-500/25';
      }
    };

    const getQualityDisplay = (quality) => {
      switch (quality) {
        case '4K': return '4K';
        case '1080P': return 'FHD';
        case '720P': return 'HD';
        case '480P': return 'SD';
        case 'HD': return 'HD';
        default: return 'HD';
      }
    };

    // Clean size display
    const cleanSize = (sizeStr) => {
      if (!sizeStr || sizeStr === 'Unknown') return '?';
      const match = sizeStr.match(/(\d+(?:\.\d+)?)(MB|GB)/i);
      if (match) {
        return `${match[1]}${match[2].toUpperCase()}`;
      }
      return sizeStr.length <= 8 ? sizeStr : sizeStr.substring(0, 8) + '...';
    };

    // Extract format info from description
    const getFormatInfo = (desc) => {
      if (!desc) return '';
      const formatMatch = desc.match(/(WEB-DL|BluRay|Blu-Ray|WEBRip|HDRip|DVDRip)/i);
      return formatMatch ? formatMatch[1].toUpperCase() : '';
    };

    const formatInfo = getFormatInfo(description);

    return (
      <button
        onClick={onClick}
        disabled={isDownloading}
        className={`w-full p-3 bg-gradient-to-r from-slate-800/80 to-slate-900/80 hover:from-red-600/80 hover:to-purple-600/80 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${
          isDownloading ? 'animate-pulse' : ''
        }`}
      >
        <div className="flex items-center justify-between w-full text-left">
          {/* Quality Badge */}
          <div className={`bg-gradient-to-r ${getQualityColor(link.quality)} rounded-md px-2 py-1 text-xs font-bold flex-shrink-0`}>
            {getQualityDisplay(link.quality)}
          </div>
          
          {/* Details */}
          <div className="flex-1 ml-3 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-sm truncate">
                {link.quality} Quality
              </span>
              <span className="text-gray-300 text-xs font-medium ml-2">
                {cleanSize(link.size)}
              </span>
            </div>
            {formatInfo && (
              <div className="text-xs text-gray-400 mt-0.5">
                {formatInfo}
              </div>
            )}
          </div>

          {/* Download Status/Icon */}
          <div className="flex-shrink-0 ml-3">
            {isDownloading ? (
              <div className="flex items-center text-green-400">
                <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                <span className="text-xs">Starting...</span>
              </div>
            ) : (
              <Download size={16} className="text-gray-300" />
            )}
          </div>
        </div>
      </button>
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

  // Simplified data fetching
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
        console.error('Error fetching series data:', error);
        showToast('Error loading series data', 'error');
      } finally {
        setIsLoadingSeasons(false);
      }
    };
    
    fetchSeriesData();
  }, [series]);

  // Screenshot parsing
  useEffect(() => {
    const currentSeriesData = seriesData || series;
    if (!currentSeriesData) return;
    
    if (currentSeriesData.featuredImage) {
      setScreenshots([currentSeriesData.featuredImage]);
    } else if (currentSeriesData.poster && typeof currentSeriesData.poster === 'string') {
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      const extracted = [];
      let match;
      while ((match = imgRegex.exec(currentSeriesData.poster)) !== null) {
        extracted.push(match[1]);
      }
      setScreenshots(extracted);
    } else {
      setScreenshots([]);
    }
  }, [seriesData, series]);

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
      console.error('Download failed:', error);
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

  const tabs = [
    { id: 'episodes', label: 'Episodes', icon: Play },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'details', label: 'Details', icon: Info },
    ...(screenshots.length > 0 ? [{ id: 'screenshots', label: 'Gallery', icon: Image }] : [])
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-1 md:p-4"
      onClick={onClose}
    >
      {/* Main container */}
      <div 
        className={`relative w-full h-full max-w-6xl bg-slate-900/95 backdrop-blur-sm rounded-lg md:rounded-2xl overflow-hidden shadow-xl border border-white/20
          ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-500`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-40 w-8 h-8 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200"
        >
          <X size={16} />
        </button>

        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-full`}>
          {/* Left Panel */}
          <div className={`${isMobile ? 'h-48' : 'w-80'} relative flex-shrink-0`}>
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
              
              {/* Series Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1 bg-purple-600/30 px-2 py-1 rounded-full text-xs">
                    <Tv size={10} />
                    <span>TV Series</span>
                  </div>
                  
                  <h1 className="text-lg font-bold text-white leading-tight">
                    {currentSeriesData.title}
                  </h1>
                  
                  <div className="flex items-center space-x-3 text-xs text-gray-300">
                    {year && <span>{year}</span>}
                    {availableSeasons.length > 0 && <span>{availableSeasons.length} Seasons</span>}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-2">
                    <button 
                      onClick={() => { setIsLiked(!isLiked); showToast(isLiked ? 'Removed from favorites' : 'Added to favorites', 'success'); }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                        isLiked ? 'bg-red-600/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart size={12} className={isLiked ? 'fill-current' : ''} />
                    </button>
                    
                    <button 
                      onClick={() => { setIsBookmarked(!isBookmarked); showToast(isBookmarked ? 'Removed from watchlist' : 'Added to watchlist', 'success'); }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                        isBookmarked ? 'bg-blue-600/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Bookmark size={12} className={isBookmarked ? 'fill-current' : ''} />
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
                      className="w-7 h-7 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-all"
                    >
                      <Share2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col bg-black/30 min-h-0">
            {/* Tab Navigation */}
            <div className="flex-shrink-0 border-b border-white/20 bg-black/50">
              <div className="flex overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id 
                        ? 'text-white border-b-2 border-purple-500 bg-purple-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div 
              className="flex-1 overflow-y-auto overscroll-contain" 
              ref={contentRef}
              style={{ 
                maxHeight: isMobile ? 'calc(100vh - 12rem)' : 'calc(100vh - 8rem)',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="p-4 space-y-4 pb-6">
                
                {/* EPISODES TAB */}
                {activeTab === 'episodes' && (
                  <div className="space-y-4">
                    {/* Season Selector */}
                    {!isLoadingSeasons && availableSeasons.length > 0 && (
                      <div className="relative" ref={seasonDropdownRef}>
                        <button
                          onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                          className="flex items-center justify-between w-full p-3 bg-white/10 rounded-lg border border-white/20 hover:border-purple-500/50 transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                              <Tv size={14} className="text-white" />
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
                            size={16} 
                            className={`text-gray-400 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} 
                          />
                        </button>
                        
                        {showSeasonDropdown && (
                          <div className="absolute z-20 mt-1 w-full bg-slate-800 rounded-lg border border-white/20 shadow-xl max-h-48 overflow-y-auto">
                            {availableSeasons.map(season => (
                              <button
                                key={season.id}
                                onClick={() => handleSeasonChange(season)}
                                className={`w-full text-left p-3 hover:bg-white/10 flex items-center space-x-3 transition-all text-sm ${
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

                    {/* Episodes List with Movie-Style Download Buttons */}
                    {!isLoadingEpisodes && seasonEpisodes?.length > 0 ? (
                      <div className="space-y-3">
                        {seasonEpisodes.map((episode, index) => (
                          <div 
                            key={episode.id || `episode-${index}`} 
                            className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-purple-500/30 transition-all"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                  {episode.episodeNumber === 'complete' ? 'S' : episode.episodeNumber || episode.number}
                                </div>
                                <div>
                                  <h4 className="text-white font-medium text-sm">
                                    {episode.episodeNumber === 'complete' ? 'Complete Season' : `Episode ${episode.episodeNumber || episode.number}`}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-gray-400 text-xs">{episode.downloadLinks?.length || 1} options</span>
                                    <div className="bg-green-600/30 px-2 py-0.5 rounded text-green-300 text-xs">
                                      Direct Download
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Movie-Style Download Buttons */}
                            {episode.downloadLinks?.length > 0 && (
                              <div className="space-y-2">
                                {episode.downloadLinks.map((link, linkIndex) => {
                                  const downloadKey = `${episode.id || episode.episodeNumber}-${linkIndex}`;
                                  const isDownloading = downloadingLinks.has(downloadKey);
                                  
                                  return (
                                    <CompactDownloadButton
                                      key={linkIndex}
                                      link={link}
                                      onClick={() => handleDownload(episode, linkIndex)}
                                      isDownloading={isDownloading}
                                      description={link.description}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isLoadingEpisodes ? (
                      <div className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-400 text-sm">Loading episodes...</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Tv size={32} className="mx-auto mb-2 text-gray-600" />
                        <p className="text-gray-400">No episodes available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PACKAGES TAB */}
                {activeTab === 'packages' && (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Package size={24} className="text-white" />
                      </div>
                      <h2 className="text-lg font-bold text-white mb-1">Season Packages</h2>
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
                              className="bg-blue-600/10 rounded-lg p-4 border border-blue-500/30 hover:border-blue-500/50 transition-all"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Archive size={20} className="text-white" />
                                  </div>
                                  <div>
                                    <h3 className="text-white font-medium">
                                      Season {activeSeason?.seasonNumber || ''} Archive
                                    </h3>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <div className={`bg-gradient-to-r ${zipLink.quality === '4K' ? 'from-purple-500 to-pink-500' : zipLink.quality === '1080P' ? 'from-emerald-500 to-green-500' : 'from-blue-500 to-cyan-500'} rounded px-2 py-1`}>
                                        <span className="text-white text-xs font-bold">
                                          {zipLink.quality === '1080P' ? 'FHD' : zipLink.quality}
                                        </span>
                                      </div>
                                      <span className="text-gray-300 text-sm">{zipLink.size}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">
                                      All episodes in compressed file
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Movie-Style Download Button for Package */}
                              <CompactDownloadButton
                                link={zipLink}
                                onClick={() => {
                                  setDownloadingLinks(prev => new Set([...prev, downloadKey]));
                                  handleDownload(zipLink, 0, true);
                                }}
                                isDownloading={isDownloading}
                                description="Season Package"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package size={32} className="mx-auto mb-3 text-gray-600" />
                        <p className="text-gray-400 mb-2">No packages available</p>
                        <button
                          onClick={() => setActiveTab('episodes')}
                          className="bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 text-white text-sm font-medium transition-all"
                        >
                          Browse Episodes
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* DETAILS TAB - COMPACT */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {/* Synopsis */}
                    {(currentSeriesData?.content?.description || currentSeriesData?.excerpt) && (
                      <div className="space-y-2">
                        <h3 className="text-white font-bold flex items-center">
                          <div className="w-1 h-4 bg-purple-500 rounded-full mr-2"></div>
                          Synopsis
                        </h3>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {currentSeriesData?.content?.description || currentSeriesData?.excerpt}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Genres */}
                    {getCategories().length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-white font-bold flex items-center">
                          <div className="w-1 h-4 bg-pink-500 rounded-full mr-2"></div>
                          Genres
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {getCategories().slice(0, expandGenres ? getCategories().length : 6).map((category, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30"
                            >
                              {category}
                            </span>
                          ))}
                          {!expandGenres && getCategories().length > 6 && (
                            <button 
                              onClick={() => setExpandGenres(true)}
                              className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs font-medium border border-white/20 hover:bg-white/20"
                            >
                              +{getCategories().length - 6} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Series Stats */}
                    <div className="space-y-2">
                      <h3 className="text-white font-bold flex items-center">
                        <div className="w-1 h-4 bg-green-500 rounded-full mr-2"></div>
                        Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Seasons', value: availableSeasons.length, icon: Tv },
                          { label: 'Episodes', value: currentSeriesData.totalEpisodes || 'TBA', icon: Play },
                          { label: 'Year', value: year || 'TBA', icon: Calendar },
                          { label: 'Quality', value: 'HD', icon: Award }
                        ].map((stat, index) => (
                          <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                            <stat.icon size={20} className="mx-auto mb-1 text-purple-400" />
                            <div className="text-gray-400 text-xs">{stat.label}</div>
                            <div className="text-white font-bold">{stat.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SCREENSHOTS TAB */}
                {activeTab === 'screenshots' && screenshots.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-lg font-bold text-white mb-1">Gallery</h2>
                      <p className="text-gray-400 text-sm">Series screenshots</p>
                    </div>
                    
                    <div className="relative">
                      <div className="relative rounded-lg overflow-hidden">
                        <img 
                          src={screenshots[activeScreenshot]} 
                          alt={`Screenshot ${activeScreenshot + 1}`} 
                          className="w-full h-auto object-cover"
                          onError={handleImageError}
                        />
                        
                        {screenshots.length > 1 && (
                          <>
                            <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setActiveScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length)}
                                className="w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              
                              <button 
                                onClick={() => setActiveScreenshot((prev) => (prev + 1) % screenshots.length)}
                                className="w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                            
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                              {activeScreenshot + 1} / {screenshots.length}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Thumbnail Grid */}
                      {screenshots.length > 1 && (
                        <div className="flex space-x-2 mt-3 overflow-x-auto pb-2">
                          {screenshots.map((screenshot, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveScreenshot(index)}
                              className={`flex-shrink-0 rounded overflow-hidden transition-all ${
                                activeScreenshot === index 
                                  ? 'ring-2 ring-purple-500' 
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img 
                                src={screenshot}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-16 h-10 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
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
