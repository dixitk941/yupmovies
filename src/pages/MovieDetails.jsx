import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info, Play, ChevronDown } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { doc, collection, getDocs, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SECURITY_KEY = "6f1d8a3b9c5e7f2a4d6b8e0f1a3c7d9e2b4f6a8c1d3e5f7a0b2c4d6e8f0a1b3";

const SeriesDetail = ({ series, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeTab, setActiveTab] = useState('episodes'); // Default to episodes for series
  const [scrollPosition, setScrollPosition] = useState(0);
  const [expandGenres, setExpandGenres] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [seasonFullDownloads, setSeasonFullDownloads] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [downloadingLinks, setDownloadingLinks] = useState(new Set());
  
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const screenshotTimerRef = useRef(null);
  const backdropRef = useRef(null);
  const seasonDropdownRef = useRef(null);
  
  // ADDED: Parse download links from string format (like in MovieDetail)
  const parseDownloadLinks = useCallback((linksString) => {
    if (!linksString || typeof linksString !== 'string') return [];
    
    try {
      const links = [];
      
      // Pattern to match: url,description,size
      const linkPattern = /(https:\/\/[^,]+),([^,]*),([^,]*)/g;
      let match;
      
      while ((match = linkPattern.exec(linksString)) !== null) {
        const [, url, description, size] = match;
        
        // Extract quality from description
        let quality = 'HD';
        const qualityMatch = description.match(/(480p|720p|1080p|4K|2160p)/i);
        if (qualityMatch) {
          quality = qualityMatch[1].toUpperCase();
          if (quality === '2160P') quality = '4K';
        }
        
        links.push({
          url: url.trim(),
          quality: quality,
          size: size.trim(),
          description: description.trim()
        });
      }
      
      // Sort by quality preference
      const qualityOrder = { '480P': 1, '720P': 2, '1080P': 3, '4K': 4, 'HD': 2.5 };
      return links.sort((a, b) => (qualityOrder[a.quality] || 5) - (qualityOrder[b.quality] || 5));
      
    } catch (error) {
      console.error('Error parsing download links:', error);
      return [];
    }
  }, []);

  // Extract year from title if available
  const year = React.useMemo(() => {
    if (!series?.title) return '';
    const yearMatch = series.title.match(/\((\d{4})\)/);
    return yearMatch ? yearMatch[1] : '';
  }, [series?.title]);
  
  // Helper function to safely get categories as array
  const getCategories = useCallback(() => {
    if (!series?.category) return [];
    
    if (typeof series.category === 'string') {
      return series.category.split(',').map(cat => cat.trim());
    } else if (Array.isArray(series.category)) {
      return series.category;
    } else {
      return [];
    }
  }, [series?.category]);
  
  // Create a helper function for image error handling
  const handleImageError = (e) => {
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
    e.target.onerror = null;
  };
  
  // Generate a semi-unique user token (not personally identifiable)
  const generateUserToken = () => {
    const browserInfo = 
      navigator.userAgent.substring(0, 10) + 
      window.screen.width + 
      window.screen.height;
    
    return CryptoJS.SHA256(browserInfo).toString().substring(0, 16);
  };
  
  // Generate a unique ID from series title
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
      
      navigator.sendBeacon && 
        navigator.sendBeacon(
          'https://my-blog-five-amber-64.vercel.app/api/log-activity', 
          JSON.stringify(activityData)
        );
    } catch (e) {
      // Silent fail for analytics
    }
  };
  
  // UPDATED: Enhanced toast notification with types (from MovieDetail)
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

  // UPDATED: Direct download handler (no redirects)
  const handleDirectDownload = async (linkData, index, episodeNumber = null, isFullSeason = false) => {
    if (!linkData || (!linkData.url && !linkData)) {
      showToast("Download link not available", 'error');
      return;
    }

    // Handle both string links and object links
    const downloadUrl = typeof linkData === 'string' ? linkData : linkData.url;
    const quality = typeof linkData === 'object' ? linkData.quality : 'HD';
    const size = typeof linkData === 'object' ? linkData.size : '';

    if (!downloadUrl) {
      showToast("Invalid download link", 'error');
      return;
    }

    // Add to downloading state
    setDownloadingLinks(prev => new Set([...prev, index]));

    try {
      showToast(`Starting download: ${quality} ${size ? `(${size})` : ''}`, 'info');
      
      // Create a temporary anchor element for direct download
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = downloadUrl;
      downloadAnchor.target = '_blank';
      downloadAnchor.rel = 'noopener noreferrer';
      
      // Extract filename from URL or create one
      const urlParts = downloadUrl.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 
                     `${series.title}_S${activeSeason?.season}${episodeNumber ? `E${episodeNumber}` : ''}_${quality}.mp4`;
      downloadAnchor.download = filename;
      
      // Add to DOM temporarily
      document.body.appendChild(downloadAnchor);
      
      // Trigger download
      downloadAnchor.click();
      
      // Remove from DOM
      document.body.removeChild(downloadAnchor);
      
      // Log download activity
      logActivity('direct_download_initiated', { 
        quality: quality,
        size: size,
        seriesTitle: series.title,
        season: activeSeason?.season,
        episode: episodeNumber,
        fullSeason: isFullSeason,
        timestamp: new Date().toISOString()
      });
      
      // Show success message
      setTimeout(() => {
        if (isFullSeason) {
          showToast(`Download started: ${series.title} Season ${activeSeason?.season} (${quality})`, 'success');
        } else if (episodeNumber) {
          showToast(`Download started: S${activeSeason?.season}E${episodeNumber} (${quality})`, 'success');
        } else {
          showToast(`Download started: ${quality}`, 'success');
        }
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

  // ADDED: Quality badge component (from MovieDetail)
  const QualityBadge = ({ quality, size, isDownloading, index }) => {
    const displayQuality = quality || 'HD';
    const displaySize = size || '';
    
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
    
    const cleanSize = (sizeStr) => {
      if (!sizeStr || sizeStr === 'Unknown') return '';
      
      const match = sizeStr.match(/(\d+(?:\.\d+)?)(MB|GB)/i);
      if (match) {
        return `${match[1]}${match[2].toUpperCase()}`;
      }
      
      if (sizeStr.length <= 8) return sizeStr;
      return sizeStr.substring(0, 8) + '...';
    };
    
    return (
      <div className="flex flex-col items-center text-center min-w-0">
        <div className={`bg-gradient-to-br ${getQualityColor(displayQuality)} rounded-md px-2 py-1 text-xs font-bold mb-1 border backdrop-blur-sm min-w-[40px]`}>
          {getQualityIcon(displayQuality)}
        </div>
        
        {displaySize && (
          <div className="text-xs text-gray-300 font-medium truncate max-w-[70px]">
            {cleanSize(displaySize)}
          </div>
        )}
        
        {isDownloading && (
          <div className="text-xs text-green-400 animate-pulse mt-1">
            Starting...
          </div>
        )}
      </div>
    );
  };
  
  // Fetch available seasons from Firestore
  useEffect(() => {
    if (!series?.id) return;
    
    const fetchSeasons = async () => {
      setIsLoadingSeasons(true);
      try {
        const seasonsRef = collection(db, 'series', series.id, 'seasons');
        const seasonsQuery = query(seasonsRef, orderBy('season', 'asc'));
        const snapshot = await getDocs(seasonsQuery);
        
        if (snapshot.empty) {
          console.log('No seasons found for this series');
          setAvailableSeasons([]);
          setIsLoadingSeasons(false);
          return;
        }
        
        const seasons = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setAvailableSeasons(seasons);
        
        if (seasons.length > 0) {
          setActiveSeason(seasons[0]);
          loadSeasonEpisodes(seasons[0].id, seasons[0].season);
        }
        
        if (isMobile && seasons.length > 0) {
          setActiveTab('episodes');
        }
        
      } catch (error) {
        console.error('Error fetching seasons:', error);
        showToast('Error loading seasons data', 'error');
      } finally {
        setIsLoadingSeasons(false);
      }
    };
    
    fetchSeasons();
  }, [series, isMobile]);
  
  // UPDATED: Load episodes for a specific season with download link parsing
  const loadSeasonEpisodes = useCallback(async (seasonId, seasonNumber) => {
    if (!series?.id || !seasonId) return;
    
    setIsLoadingEpisodes(true);
    
    try {
      const episodesRef = collection(db, 'series', series.id, 'seasons', seasonId, 'episodes');
      const episodesQuery = query(episodesRef, orderBy('episode', 'asc'));
      const snapshot = await getDocs(episodesQuery);
      
      if (snapshot.empty) {
        console.log(`No episodes found for Season ${seasonNumber}`);
        setSeasonEpisodes([]);
        setIsLoadingEpisodes(false);
        return;
      }
      
      // Process episodes data and parse download links
      const episodes = snapshot.docs.map(doc => {
        const data = doc.data();
        let downloadLinks = [];
        
        // Parse download links if available
        if (data.download_links || data.links) {
          downloadLinks = parseDownloadLinks(data.download_links || data.links);
        } else if (data.link) {
          // Single link fallback
          downloadLinks = [{
            url: data.link,
            quality: data.quality || 'HD',
            size: data.size || '',
            description: `Episode ${data.episode}`
          }];
        }
        
        return {
          id: doc.id,
          ...data,
          number: data.episode,
          downloadLinks // Add parsed download links
        };
      });
      
      setSeasonEpisodes(episodes);
      
      // UPDATED: Parse full season download links
      const seasonDoc = await getDoc(doc(db, 'series', series.id, 'seasons', seasonId));
      if (seasonDoc.exists()) {
        const seasonData = seasonDoc.data();
        if (seasonData.fullSeasonDownloads) {
          // If already structured
          setSeasonFullDownloads(seasonData.fullSeasonDownloads);
        } else if (seasonData.full_season_links) {
          // Parse from string format
          const parsedLinks = parseDownloadLinks(seasonData.full_season_links);
          setSeasonFullDownloads(parsedLinks);
        } else {
          setSeasonFullDownloads([]);
        }
      } else {
        setSeasonFullDownloads([]);
      }
      
    } catch (error) {
      console.error(`Error fetching episodes for season ${seasonNumber}:`, error);
      showToast('Error loading episodes data', 'error');
      setSeasonEpisodes([]);
      setSeasonFullDownloads([]);
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [series, parseDownloadLinks]);
  
  // Handle season change
  const handleSeasonChange = useCallback((season) => {
    setActiveSeason(season);
    setShowSeasonDropdown(false);
    loadSeasonEpisodes(season.id, season.season);
  }, [loadSeasonEpisodes]);
  
  // Parse screenshots
  useEffect(() => {
    if (!series) return;

    try {
      if (series.movie_screenshots) {
        if (typeof series.movie_screenshots === 'string') {
          const imgRegex = /<img[^>]+src="([^">]+)"/g;
          const extracted = [];
          let match;
          
          while ((match = imgRegex.exec(series.movie_screenshots)) !== null) {
            extracted.push(match[1]);
          }
          
          setScreenshots(extracted.length > 0 ? extracted : []);
        } else if (Array.isArray(series.movie_screenshots)) {
          setScreenshots(series.movie_screenshots);
        }
      } else {
        setScreenshots([]);
      }
    } catch (error) {
      console.error('Error parsing screenshots:', error);
      setScreenshots([]);
    }
  }, [series]);
  
  // Handle screen size detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
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
  
  // UPDATED: Function to render episodes list with direct download
  const renderEpisodes = useCallback(() => {
    if (!series) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Info size={40} className="mx-auto mb-4 text-gray-600" />
          <p>Series data not available</p>
        </div>
      );
    }
    
    if (isLoadingSeasons) {
      return (
        <div className="text-center py-8 text-gray-400">
          <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading seasons...</p>
        </div>
      );
    }
    
    if (!availableSeasons || availableSeasons.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Info size={40} className="mx-auto mb-4 text-gray-600" />
          <p>No seasons available for this series</p>
        </div>
      );
    }
    
    if (isLoadingEpisodes) {
      return (
        <div className="space-y-4">
          <div className="relative mb-6" ref={seasonDropdownRef}>
            <button
              className="flex items-center justify-between w-full sm:w-64 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700 focus:outline-none hover:border-purple-500/50 transition-colors duration-300"
              onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
            >
              <span className="flex items-center">
                <Play size={16} className="mr-2 text-red-500" />
                Season {activeSeason?.season}
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
                    Season {season.season}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center py-8 text-gray-400">
            <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mr-3"></div>
            <p>Loading episodes...</p>
          </div>
        </div>
      );
    }
    
    // Render episodes normally when data is available
    return (
      <div className="space-y-4">
        {/* Season selector dropdown */}
        <div className="relative mb-6" ref={seasonDropdownRef}>
          <button
            className="flex items-center justify-between w-full sm:w-64 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700 focus:outline-none hover:border-purple-500/50 transition-colors duration-300"
            onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
          >
            <span className="flex items-center">
              <Play size={16} className="mr-2 text-red-500" />
              Season {activeSeason?.season}
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
                  Season {season.season}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* UPDATED: Full season download section with direct download */}
        {seasonFullDownloads.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-900/20 via-purple-900/15 to-red-900/20 border border-red-500/20 rounded-xl">
            <h3 className="text-sm mb-3 flex items-center">
              <Download size={16} className="mr-2 text-purple-500" /> 
              Complete Season {activeSeason?.season} Download
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {seasonFullDownloads.map((download, index) => (
                <button
                  key={index}
                  onClick={() => handleDirectDownload(download, `season-${index}`, null, true)}
                  disabled={downloadingLinks.has(`season-${index}`)}
                  className={`relative overflow-hidden group transform transition-all duration-300 hover:scale-105 focus:scale-105 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                    downloadingLinks.has(`season-${index}`) ? 'animate-pulse' : ''
                  }`}
                >
                  <div className="bg-gradient-to-br from-red-600 to-purple-600 rounded-lg px-3 py-3 text-white shadow-lg shadow-red-900/30 border border-red-500/30">
                    <div className="flex flex-col items-center text-center gap-2">
                      <QualityBadge 
                        quality={download.quality} 
                        size={download.size} 
                        isDownloading={downloadingLinks.has(`season-${index}`)}
                        index={index}
                      />
                      <div className="flex items-center gap-1">
                        <Download size={12} className="text-white" />
                        <span className="text-xs font-medium">
                          {downloadingLinks.has(`season-${index}`) ? 'Starting...' : 'Download'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 group-active:opacity-20 transition-opacity duration-300 rounded-lg"></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* UPDATED: Individual episodes with direct download */}
        {seasonEpisodes && seasonEpisodes.length > 0 ? (
          <div className="space-y-3">
            {seasonEpisodes.map((episode) => (
              <div 
                key={episode.id} 
                className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800/30 hover:border-purple-500/20 transition-colors duration-300"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-red-600 to-purple-600 w-10 h-10 flex items-center justify-center rounded-md mr-3 shadow-md shadow-purple-900/20">
                      {episode.number}
                    </div>
                    <div>
                      <h4 className="font-medium">Episode {episode.number}</h4>
                      <div className="text-sm text-gray-400 flex items-center mt-1">
                        <span>HD Quality Available</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Episode download links */}
                {episode.downloadLinks && episode.downloadLinks.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {episode.downloadLinks.map((downloadLink, linkIndex) => (
                      <button
                        key={linkIndex}
                        onClick={() => handleDirectDownload(downloadLink, `ep-${episode.number}-${linkIndex}`, episode.number, false)}
                        disabled={downloadingLinks.has(`ep-${episode.number}-${linkIndex}`)}
                        className={`relative overflow-hidden group transform transition-all duration-300 hover:scale-105 focus:scale-105 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                          downloadingLinks.has(`ep-${episode.number}-${linkIndex}`) ? 'animate-pulse' : ''
                        }`}
                      >
                        <div className="bg-gradient-to-br from-red-600 to-purple-600 rounded-lg px-2 py-2 text-white shadow-lg shadow-red-900/30 border border-red-500/30">
                          <div className="flex flex-col items-center text-center gap-1">
                            <QualityBadge 
                              quality={downloadLink.quality} 
                              size={downloadLink.size} 
                              isDownloading={downloadingLinks.has(`ep-${episode.number}-${linkIndex}`)}
                              index={linkIndex}
                            />
                            <div className="flex items-center gap-1">
                              <Download size={10} className="text-white" />
                              <span className="text-xs font-medium">
                                {downloadingLinks.has(`ep-${episode.number}-${linkIndex}`) ? 'Starting...' : 'Download'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 group-active:opacity-20 transition-opacity duration-300 rounded-lg"></div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Info size={20} className="mx-auto mb-2" />
                    <span className="text-sm">No download links available</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Info size={40} className="mx-auto mb-4 text-gray-600" />
            <p>No episodes available for this season</p>
          </div>
        )}
      </div>
    );
  }, [
    activeSeason, 
    availableSeasons, 
    handleDirectDownload, 
    handleSeasonChange, 
    isLoadingEpisodes, 
    isLoadingSeasons, 
    seasonEpisodes, 
    seasonFullDownloads, 
    series, 
    showSeasonDropdown,
    downloadingLinks
  ]);

  if (!series) {
    return <div className="text-center py-10">Series data not available</div>;
  }

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
              {series.title}
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
                  src={series.featured_image || series.image} 
                  alt={series.title} 
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
                    {series.title}
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
                  {series.title}
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
                onClick={() => setActiveTab('episodes')}
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
                onClick={() => setActiveTab('details')}
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
                  onClick={() => setActiveTab('screenshots')}
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
                    {renderEpisodes()}
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
                    {series.description && (
                      <div className="mb-5">
                        <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                          <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                          Description
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {series.description}
                        </p>
                      </div>
                    )}

                    {/* Additional Information */}
                    <div className="mb-5">
                      <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full mr-2"></span>
                        Series Information
                      </h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        {availableSeasons.length > 0 && (
                          <div className="flex items-center">
                            <Play size={16} className="mr-2 text-yellow-500" />
                            <span className="font-medium text-gray-400 mr-1">Seasons:</span>
                            {availableSeasons.length}
                          </div>
                        )}
                        {series.director && (
                          <div className="flex items-center">
                            <Award size={16} className="mr-2 text-yellow-500" />
                            <span className="font-medium text-gray-400 mr-1">Director:</span>
                            {series.director}
                          </div>
                        )}
                        {series.cast && (
                          <div className="flex items-center">
                            <Star size={16} className="mr-2 text-yellow-500" />
                            <span className="font-medium text-gray-400 mr-1">Cast:</span>
                            {series.cast}
                          </div>
                        )}
                        {series.duration && (
                          <div className="flex items-center">
                            <Clock size={16} className="mr-2 text-yellow-500" />
                            <span className="font-medium text-gray-400 mr-1">Duration:</span>
                            {series.duration}
                          </div>
                        )}
                        {series.language && (
                          <div className="flex items-center">
                            <Globe size={16} className="mr-2 text-yellow-500" />
                            <span className="font-medium text-gray-400 mr-1">Language:</span>
                            {series.language}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick link to episodes */}
                    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-gray-800/30">
                      <p className="text-sm text-gray-400">
                        Ready to start watching? Browse all episodes and download options:
                      </p>
                      <button
                        className="mt-3 px-4 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 rounded-md text-sm flex items-center transition-all duration-300 shadow-md shadow-purple-900/20"
                        onClick={() => setActiveTab('episodes')}
                      >
                        <ChevronRight size={16} className="mr-2" />
                        Browse Episodes
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
