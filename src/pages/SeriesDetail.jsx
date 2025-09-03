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
      console.log('🚀 SeriesDetail mounted with series:', series);
      
      // ADD THIS DEBUG CODE
      console.log('🔍 ALL SERIES KEYS:', Object.keys(series));
      console.log('🔍 SERIES FIELDS CONTAINING "season":', Object.keys(series).filter(key => 
        key.toLowerCase().includes('season')
      ));
      
      // Check for any field that might contain episode data
      Object.keys(series).forEach(key => {
        if (typeof series[key] === 'string' && series[key].includes('Episode')) {
          console.log(`🎬 FOUND EPISODE DATA IN FIELD "${key}":`, series[key].substring(0, 200) + '...');
        }
      });
      // END DEBUG CODE
      
      setIsLoadingSeasons(true);
      try {
        // First, try to fetch full series data using the series ID
        let fullSeriesData = series;
        
        if (series.id || series.recordId || series.record_id) {
          const seriesId = series.id || series.recordId || series.record_id;
          console.log('🔍 Fetching full series data for ID:', seriesId);
          
          const fetchedData = await getSeriesById(seriesId);
          if (fetchedData) {
            fullSeriesData = fetchedData;
            console.log('✅ Fetched full series data:', fullSeriesData);
          }
        }
        
        // Check if we have seasons data in the fetched/original series data
        if (fullSeriesData.isSeries && fullSeriesData.seasons && Object.keys(fullSeriesData.seasons).length > 0) {
          console.log('📺 Processing real seasons data:', fullSeriesData.seasons);
          
          setSeriesData(fullSeriesData);
          const seasons = Object.entries(fullSeriesData.seasons).map(([seasonKey, seasonData]) => ({
            id: seasonKey,
            seasonNumber: seasonData.seasonNumber,
            episodes: seasonData.episodes || [],
            totalEpisodes: seasonData.totalEpisodes || seasonData.episodes?.length || 0
          })).sort((a, b) => a.seasonNumber - b.seasonNumber);
          
          setAvailableSeasons(seasons);
          if (seasons.length > 0) {
            const latestSeason = seasons[seasons.length - 1];
            setActiveSeason(latestSeason);
            setSeasonEpisodes(latestSeason.episodes);
            console.log('🎬 Set active season:', latestSeason.seasonNumber, 'with episodes:', latestSeason.episodes.length);
          }
        } else {
          console.log('⚠️ No real seasons data found, series may not have episode data yet');
          
          // Set the series data as-is and show empty state
          setSeriesData(fullSeriesData);
          setAvailableSeasons([]);
          setActiveSeason(null);
          setSeasonEpisodes([]);
        }
      } catch (error) {
        console.error('💥 Error loading series data:', error);
        showToast('Error loading series data', 'error');
        
        // Set basic data even if there's an error
        setSeriesData(series);
        setAvailableSeasons([]);
        setActiveSeason(null);
        setSeasonEpisodes([]);
      } finally {
        setIsLoadingSeasons(false);
      }
    };
    
    fetchSeriesData();
  }, [series]);

  // Download handler
  const handleDownload = useCallback(async (episode, quality = null, isPackage = false) => {
    console.log('🔽 Download triggered:', { episode, quality, isPackage });
    
    const downloadKey = isPackage 
      ? `package-${episode.seasonNumber || 'unknown'}-${episode.quality}`
      : `${episode?.id || episode?.episodeNumber}-${quality}`;
    
    setDownloadingLinks(prev => new Set([...prev, downloadKey]));
    
    try {
      let downloadUrl = null;
      
      if (isPackage) {
        // Handle season package downloads
        downloadUrl = episode.url;
        console.log('📦 Package download URL:', downloadUrl);
        
        if (downloadUrl) {
          // Open download URL in new tab
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          showToast(`Starting: ${episode.name || `Season ${episode.seasonNumber} ${episode.quality}`}`, 'success');
        } else {
          showToast('Download URL not available', 'error');
        }
      } else {
        // Handle individual episode downloads
        if (!quality) {
          showToast('Please select a quality first', 'error');
          return;
        }
        
        // Find the specific download link for the selected quality
        const selectedLink = episode.downloadLinks?.find(link => link.quality === quality);
        console.log('🎬 Selected episode link:', selectedLink);
        
        if (selectedLink && selectedLink.url) {
          downloadUrl = selectedLink.url;
          
          // Open download URL in new tab
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          showToast(`Starting: Episode ${episode.episodeNumber} - ${quality}`, 'success');
        } else {
          showToast('Download link not available for selected quality', 'error');
        }
      }
      
    } catch (error) {
      console.error('💥 Download failed:', error);
      showToast('Download failed', 'error');
    } finally {
      // Reset download state after 3 seconds
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
    : [];

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
                      disabled={availableSeasons.length === 0}
                      className="flex items-center justify-between w-full p-2.5 bg-black border border-gray-700 rounded text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>
                        {activeSeason 
                          ? `S${activeSeason.seasonNumber} (${activeSeason.totalEpisodes})` 
                          : availableSeasons.length === 0 
                            ? 'No Seasons' 
                            : 'Select Season'
                        }
                      </span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showSeasonDropdown && availableSeasons.length > 0 && (
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
                    disabled={seasonEpisodes.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-black border border-gray-700 rounded text-white font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowUpDown size={14} />
                    <span>{sortOrder === 'desc' ? 'Latest' : 'Oldest'}</span>
                  </button>
                </div>

                {/* Season Information - Dynamic based on real data */}
                {activeSeason && (
                  <div className="bg-black border border-gray-700 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium text-sm">Season {activeSeason.seasonNumber} Information</h3>
                      <div className="flex gap-1.5">
                        {currentSeriesData?.qualities?.map((quality, index) => (
                          <span key={index} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                            {quality}
                          </span>
                        )) || (
                          <>
                            <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">HD</span>
                            <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">Multi-Audio</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs">
                      {currentSeriesData?.title || 'Series'} Season {activeSeason.seasonNumber} Complete 
                      {currentSeriesData?.languages?.length > 0 
                        ? ` (${currentSeriesData.languages.join(' + ')})` 
                        : ' Multi-Audio'
                      } Series - Available in multiple qualities
                      {activeSeason.totalEpisodes > 0 && ` • ${activeSeason.totalEpisodes} Episodes`}
                    </p>
                  </div>
                )}

                {/* Episodes List - Handle empty episodes */}
                <div className="space-y-2 pb-16">
                  {isLoadingSeasons ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-gray-400 text-sm">Loading episodes...</p>
                    </div>
                  ) : sortedEpisodes.length > 0 ? (
                    sortedEpisodes.map((episode, index) => {
                      const episodeNumber = episode.episodeNumber;
                      const downloadKey = `episode-${episodeNumber}-${episodeQualities[`episode-${episodeNumber}`]}`;
                      const isDownloading = downloadingLinks.has(downloadKey);
                      const hasQualitySelected = episodeQualities[`episode-${episodeNumber}`];
                      
                      return (
                        <div key={episode.id || `episode-${index}`} className="flex items-center justify-between p-2.5">
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-sm">Episode {episodeNumber < 10 ? `0${episodeNumber}` : episodeNumber}</h4>
                            <p className="text-gray-400 text-xs">{episode.downloadLinks?.length || 0} qualities available</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Quality Selector */}
                            <select
                              value={episodeQualities[`episode-${episodeNumber}`] || ''}
                              onChange={(e) => {
                                setEpisodeQualities(prev => ({
                                  ...prev,
                                  [`episode-${episodeNumber}`]: e.target.value
                                }));
                              }}
                              className="bg-black text-white border border-gray-700 rounded px-3 py-2 text-sm min-w-[140px] appearance-none cursor-pointer"
                            >
                              <option value="">Select quality</option>
                              {episode.downloadLinks?.map((link, linkIndex) => (
                                <option key={linkIndex} value={link.quality}>
                                  {link.quality} ({link.size})
                                </option>
                              ))}
                            </select>
                            
                            {/* Download Button */}
                            <button
                              onClick={() => {
                                console.log('🔽 Episode download clicked:', { 
                                  episodeNumber, 
                                  episode, 
                                  selectedQuality: episodeQualities[`episode-${episodeNumber}`]
                                });
                                
                                const quality = episodeQualities[`episode-${episodeNumber}`];
                                if (!quality) {
                                  showToast('Select quality first', 'error');
                                  return;
                                }
                                
                                const selectedLink = episode.downloadLinks?.find(link => link.quality === quality);
                                console.log('🎬 Found download link:', selectedLink);
                                
                                if (selectedLink) {
                                  handleDownload(episode, quality, false);
                                } else {
                                  showToast('Download link not found', 'error');
                                }
                              }}
                              disabled={isDownloading || !hasQualitySelected}
                              className={`${hasQualitySelected ? 'bg-red-600 hover:bg-red-700' : 'bg-black border border-gray-700 hover:bg-gray-800'} disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-all flex items-center gap-2`}
                            >
                              <Download size={14} />
                              {isDownloading ? 'Downloading...' : 'Download'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Tv size={24} className="text-gray-500" />
                      </div>
                      <h3 className="text-white font-medium mb-1">No Episodes Available</h3>
                      <p className="text-gray-400 text-sm mb-4">Episodes for this series are not yet available in our database.</p>
                      <div className="text-xs text-gray-500">
                        Series ID: {currentSeriesData.id || currentSeriesData.recordId || 'Unknown'}
                      </div>
                    </div>
                  )}
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

                {isLoadingSeasons ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-gray-400 text-sm">Loading season packages...</p>
                  </div>
                ) : currentSeriesData?.seasonZipLinks?.length > 0 ? (
                  <div className="space-y-2">
                    {currentSeriesData.seasonZipLinks.map((zipLink, zipIndex) => {
                      const downloadKey = `package-${zipLink.seasonNumber || 'unknown'}-${zipLink.quality}`;
                      const isDownloading = downloadingLinks.has(downloadKey);
                      
                      return (
                        <div key={zipIndex} className="bg-black border border-gray-700 rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 flex-1">
                              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                <Package size={14} className="text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-white font-medium text-sm">
                                  {zipLink.name || `Season ${zipLink.seasonNumber || 'Package'} Complete`}
                                </h3>
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
                              onClick={() => {
                                console.log('🔽 Package download clicked:', zipLink);
                                handleDownload(zipLink, null, true);
                              }}
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
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package size={24} className="text-gray-500" />
                    </div>
                    <h3 className="text-white font-medium mb-1">No Season Packages Available</h3>
                    <p className="text-gray-400 text-sm mb-4">Season zip packages are not yet available for this series.</p>
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
