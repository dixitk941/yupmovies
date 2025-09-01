import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Download, Star, Heart, ChevronLeft, ChevronRight, Calendar, 
  Clock, Globe, Bookmark, Share2, Info, Play, ChevronDown, 
  Package, Archive, Tv, Eye, Users, Award, HardDrive, ArrowUpDown
} from 'lucide-react';
import { getSeriesById, getSeriesEpisodes, getEpisodeDownloadLinks } from '../services/seriesService';

const SeriesDetail = ({ series, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('Episodes');
  const [expandGenres, setExpandGenres] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [seriesData, setSeriesData] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [downloadingLinks, setDownloadingLinks] = useState(new Set());
  const [imageLoaded, setImageLoaded] = useState(false);
  const [episodeQualities, setEpisodeQualities] = useState({});
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = latest first, 'asc' = oldest first
  
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
  
  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/400x600/000000/ffffff?text=No+Image';
    e.target.onerror = null;
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
            setActiveSeason(seasons[seasons.length - 1]);
            setSeasonEpisodes(seasons[seasons.length - 1].episodes);
          }
        } else {
          // Mock data
          const mockSeasons = [
            {
              id: 'season-1',
              seasonNumber: 1,
              episodes: Array.from({ length: 15 }, (_, i) => ({
                id: `s1-ep-${i + 1}`,
                episodeNumber: i + 1,
                downloadLinks: [
                  { quality: '1080p', size: '568MB', url: '#' },
                  { quality: '720p', size: '350MB', url: '#' }
                ]
              })),
              totalEpisodes: 15
            },
            {
              id: 'season-2',
              seasonNumber: 2,
              episodes: Array.from({ length: 10 }, (_, i) => ({
                id: `s2-ep-${i + 1}`,
                episodeNumber: i + 1,
                downloadLinks: [
                  { quality: '1080p', size: '568MB', url: '#' },
                  { quality: '720p', size: '350MB', url: '#' }
                ]
              })),
              totalEpisodes: 10
            }
          ];
          
          setAvailableSeasons(mockSeasons);
          setActiveSeason(mockSeasons[1]);
          setSeasonEpisodes(mockSeasons[1].episodes);
          
          setSeriesData({
            ...series,
            title: series?.title || 'Fantasy Island (2025)',
            totalSeasons: 2,
            seasonZipLinks: [
              { seasonNumber: 1, quality: '1080p', size: '8.5GB', url: '#', description: 'Season 1 Complete - 1080p WEB-DL' },
              { seasonNumber: 1, quality: '720p', size: '5.2GB', url: '#', description: 'Season 1 Complete - 720p WEB-DL' },
              { seasonNumber: 2, quality: '1080p', size: '5.6GB', url: '#', description: 'Season 2 Complete - 1080p WEB-DL' },
              { seasonNumber: 2, quality: '720p', size: '3.5GB', url: '#', description: 'Season 2 Complete - 720p WEB-DL' }
            ]
          });
        }
      } catch (error) {
        showToast('Error loading series data', 'error');
      } finally {
        setIsLoadingSeasons(false);
      }
    };
    
    fetchSeriesData();
  }, [series]);

  // Download handler
  const handleDownload = useCallback(async (episode, quality = null, isPackage = false) => {
    const downloadKey = isPackage 
      ? `package-${episode.seasonNumber}-${episode.quality}`
      : `${episode?.id || episode?.episodeNumber}-${quality}`;
    setDownloadingLinks(prev => new Set([...prev, downloadKey]));
    
    try {
      showToast(
        isPackage 
          ? `Starting: Season ${episode.seasonNumber} ${episode.quality}`
          : `Starting: Episode ${episode.episodeNumber || episode.id} - ${quality}`, 
        'success'
      );
    } catch (error) {
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

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  }, []);

  if (!series) {
    return <div className="text-center py-10 text-white">Series data not available</div>;
  }

  const currentSeriesData = seriesData || series;
  const tabs = ['Episodes', 'Season Zips', 'Previews'];
  const latestSeason = availableSeasons.length > 0 ? availableSeasons[availableSeasons.length - 1] : null;
  const currentEpisodeInSeason = latestSeason ? latestSeason.totalEpisodes : 15;

  // Sort episodes based on sort order
  const sortedEpisodes = seasonEpisodes.length > 0 
    ? [...seasonEpisodes].sort((a, b) => 
        sortOrder === 'desc' 
          ? b.episodeNumber - a.episodeNumber 
          : a.episodeNumber - b.episodeNumber
      )
    : Array.from({ length: 6 }, (_, i) => ({
        episodeNumber: sortOrder === 'desc' ? 10 - i : 5 + i,
        id: `episode-${sortOrder === 'desc' ? 10 - i : 5 + i}`
      }));

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-md bg-black overflow-hidden flex flex-col">
        
        {/* Header - More compact */}
        <div className="relative h-56 flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 z-40 w-7 h-7 bg-black/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all"
          >
            <X size={14} />
          </button>

          <img 
            src={currentSeriesData.featuredImage || currentSeriesData.featured_image || currentSeriesData.poster || currentSeriesData.image || 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop'} 
            alt={currentSeriesData.title}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          
          <div className="absolute bottom-3 left-3 right-3">
            <div className="mb-2">
              <span className="bg-red-600 text-white px-2.5 py-1 rounded text-xs font-semibold">
                S{latestSeason?.seasonNumber || 1} Episode {currentEpisodeInSeason}
              </span>
            </div>
            <button className="bg-white text-black px-5 py-1.5 rounded font-medium text-sm hover:bg-gray-200 transition-colors">
              Watch Now
            </button>
          </div>
        </div>

        {/* Info section - Ultra compact */}
        <div className="px-3 py-3 bg-black flex-shrink-0">
          <h1 className="text-white text-xl font-bold mb-1.5">
            {currentSeriesData.title || 'Fantasy Island (2025)'}
          </h1>
          <div className="flex items-center justify-between text-sm mb-3">
            <p className="text-gray-400">Updated on December 20, 2024</p>
            <div className="flex items-center text-gray-400">
              <span>Seasons: </span>
              <span className="text-white font-bold ml-1">{availableSeasons.length}</span>
            </div>
          </div>

          {/* VLC notice - Ultra compact */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <div className="w-4 h-4 rounded-full border border-gray-500 flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            </div>
            <span>Use <span className="text-white font-medium">VLC Media Player</span> for best experience</span>
          </div>
        </div>

        {/* Tabs - Compact */}
        <div className="flex bg-black border-b border-gray-700 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-black">
          <div className="px-3 py-3">
            
            {activeTab === 'Episodes' && (
              <div className="space-y-3">
                
                {/* Season selector and sort controls - Side by side */}
                <div className="flex gap-2">
                  {/* Season Selector - Left side */}
                  <div className="relative flex-1" ref={seasonDropdownRef}>
                    <button
                      onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                      className="flex items-center justify-between w-full p-2.5 bg-black border border-gray-700 rounded text-white font-medium text-sm"
                    >
                      <span>S{activeSeason?.seasonNumber || 2} ({activeSeason?.totalEpisodes || 10})</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showSeasonDropdown && (
                      <div className="absolute z-20 mt-1 w-full bg-black border border-gray-700 rounded shadow-xl max-h-32 overflow-y-auto">
                        {availableSeasons.map(season => (
                          <button
                            key={season.id}
                            onClick={() => handleSeasonChange(season)}
                            className={`w-full text-left p-2.5 hover:bg-gray-800 transition-all text-sm ${
                              activeSeason?.id === season.id ? 'bg-gray-800' : ''
                            }`}
                          >
                            <div className="text-white">S{season.seasonNumber} ({season.totalEpisodes || season.episodes?.length || 0})</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sort control - Right side */}
                  <button
                    onClick={toggleSortOrder}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-black border border-gray-700 rounded text-white font-medium text-sm hover:bg-gray-800 transition-colors"
                  >
                    <ArrowUpDown size={14} />
                    <span>{sortOrder === 'desc' ? 'Latest' : 'Oldest'}</span>
                  </button>
                </div>

                {/* Season Information - Single line, more compact */}
                <div className="bg-black border border-gray-700 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium text-sm">Season Information</h3>
                    <div className="flex gap-1.5">
                      <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">BluRay</span>
                      <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">Hindi + English</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {currentSeriesData.title || 'Fantasy Island'} Season {activeSeason?.seasonNumber || 2} Complete Hindi Dubbed (ORG) Multi-Audio Series - 720p | 1080p WEB-DL
                  </p>
                </div>

                {/* Episodes List - Removed borders, larger selectors, conditional button colors */}
                <div className="space-y-2 pb-16">
                  {sortedEpisodes.map((episode, index) => {
                    const episodeNumber = episode.episodeNumber;
                    const downloadKey = `episode-${episodeNumber}-${episodeQualities[`episode-${episodeNumber}`]}`;
                    const isDownloading = downloadingLinks.has(downloadKey);
                    const hasQualitySelected = episodeNumber === 10 || episodeQualities[`episode-${episodeNumber}`];
                    
                    return (
                      <div key={episode.id || `episode-${index}`} className="flex items-center justify-between p-2.5">
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm">Episode {episodeNumber < 10 ? `0${episodeNumber}` : episodeNumber}</h4>
                          <p className="text-gray-400 text-xs">{episode.downloadLinks?.length || 2} qualities</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Larger Quality Selector */}
                          <select
                            value={episodeNumber === 10 ? '1080p' : episodeQualities[`episode-${episodeNumber}`] || ''}
                            onChange={(e) => {
                              setEpisodeQualities(prev => ({
                                ...prev,
                                [`episode-${episodeNumber}`]: e.target.value
                              }));
                            }}
                            className="bg-black text-white border border-gray-700 rounded px-3 py-2 text-sm min-w-[140px] appearance-none cursor-pointer"
                          >
                            {episodeNumber === 10 ? (
                              <>
                                <option value="1080p">1080p (568MB)</option>
                                <option value="720p">720p (350MB)</option>
                              </>
                            ) : (
                              <>
                                <option value="">select quality</option>
                                <option value="1080p">1080p (568MB)</option>
                                <option value="720p">720p (350MB)</option>
                              </>
                            )}
                          </select>
                          
                          {/* Conditional Download Button Colors */}
                          <button
                            onClick={() => {
                              const quality = episodeNumber === 10 ? '1080p' : episodeQualities[`episode-${episodeNumber}`];
                              if (!quality) {
                                showToast('Select quality first', 'error');
                                return;
                              }
                              setDownloadingLinks(prev => new Set([...prev, `episode-${episodeNumber}-${quality}`]));
                              showToast(`Starting: Episode ${episodeNumber} - ${quality}`, 'success');
                              setTimeout(() => {
                                setDownloadingLinks(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(`episode-${episodeNumber}-${quality}`);
                                  return newSet;
                                });
                              }, 3000);
                            }}
                            disabled={isDownloading}
                            className={`${hasQualitySelected ? 'bg-red-600 hover:bg-red-700' : 'bg-black border border-gray-700 hover:bg-gray-800'} disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-all flex items-center gap-2`}
                          >
                            <Download size={14} />
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Season Zips Tab */}
            {activeTab === 'Season Zips' && (
              <div className="space-y-3 pb-16">
                <div className="text-center py-4">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Archive size={20} className="text-white" />
                  </div>
                  <h3 className="text-white font-medium mb-1">Season Packages</h3>
                  <p className="text-gray-400 text-xs">Complete seasons in zip format</p>
                </div>

                {currentSeriesData?.seasonZipLinks?.length > 0 ? (
                  <div className="space-y-2">
                    {currentSeriesData.seasonZipLinks.map((zipLink, zipIndex) => {
                      const downloadKey = `package-${zipLink.seasonNumber}-${zipLink.quality}`;
                      const isDownloading = downloadingLinks.has(downloadKey);
                      
                      return (
                        <div key={zipIndex} className="bg-black border border-gray-700 rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 flex-1">
                              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                <Package size={14} className="text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-white font-medium text-sm">Season {zipLink.seasonNumber} Complete</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                    zipLink.quality === '1080p' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'
                                  }`}>
                                    {zipLink.quality}
                                  </span>
                                  <span className="text-gray-400 text-xs">{zipLink.size}</span>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleDownload(zipLink, null, true)}
                              disabled={isDownloading}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1"
                            >
                              <Download size={12} />
                              {isDownloading ? 'DL...' : 'Download'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Package size={32} className="mx-auto mb-2 text-gray-600" />
                    <p className="text-gray-400 text-sm mb-3">No packages available</p>
                    <button
                      onClick={() => setActiveTab('Episodes')}
                      className="bg-red-600 hover:bg-red-700 rounded px-3 py-1.5 text-white text-xs font-medium transition-all"
                    >
                      Browse Episodes
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Previews Tab */}
            {activeTab === 'Previews' && (
              <div className="space-y-3 pb-16">
                <div className="text-center py-8">
                  <Eye size={48} className="mx-auto mb-3 text-gray-600" />
                  <h3 className="text-white font-medium mb-1">Episode Previews</h3>
                  <p className="text-gray-400 text-sm">Watch episode previews and trailers</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesDetail;
