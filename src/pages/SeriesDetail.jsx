import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Star, ThumbsUp, ChevronLeft, ChevronRight, Calendar, Clock, Globe, Bookmark, Share2, Award, Info, Play, ChevronDown } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { parseEpisodes, parseFullSeasonDownloads } from '../services/movieService';

const SECURITY_KEY = "6f1d8a3b9c5e7f2a4d6b8e0f1a3c7d9e2b4f6a8c1d3e5f7a0b2c4d6e8f0a1b3";

const SeriesDetail = ({ series, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'screenshots', 'episodes'
  const [scrollPosition, setScrollPosition] = useState(0);
  const [expandGenres, setExpandGenres] = useState(false);
  const [activeSeason, setActiveSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [seasonFullDownloads, setSeasonFullDownloads] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const screenshotTimerRef = useRef(null);
  const backdropRef = useRef(null);
  const seasonDropdownRef = useRef(null);
  
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
    // Use a data URI instead of an external placeholder service
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
    // Prevent further error events for this element
    e.target.onerror = null;
  };
  
  // Encrypt download link
  const encryptLink = useCallback((link) => {
    if (!link) return '';
    return CryptoJS.AES.encrypt(link, SECURITY_KEY).toString();
  }, []);
  
  // IMPORTANT: Define loadSeasonData before any useEffect that references it
  // Load data for the selected season
  const loadSeasonData = useCallback((seasonNumber) => {
    if (!series) return;
    
    const seasonKey = `Season ${seasonNumber}`;
    if (series[seasonKey]) {
      try {
        // Specifically extract the season data as a string
        const seasonText = series[seasonKey];
        
        // Use imported parseEpisodes with the exact season text
        const parsedEpisodes = parseEpisodes(seasonText);
        setSeasonEpisodes(parsedEpisodes);
        
        // Use imported parseFullSeasonDownloads with the exact season text
        const fullSeasonLinks = parseFullSeasonDownloads(seasonText);
        setSeasonFullDownloads(fullSeasonLinks);
        
        // Debug information
        console.log(`Season ${seasonNumber} data:`, {
          rawData: seasonText ? seasonText.substring(0, 100) + '...' : 'null',
          episodes: parsedEpisodes,
          fullSeason: fullSeasonLinks
        });
      } catch (error) {
        console.error(`Error parsing season ${seasonNumber} data:`, error);
        setSeasonEpisodes([]);
        setSeasonFullDownloads([]);
      }
    } else {
      console.log(`No data found for Season ${seasonNumber}`);
      setSeasonEpisodes([]);
      setSeasonFullDownloads([]);
    }
  }, [series]);
  
  const handleSeasonChange = useCallback((season) => {
    setActiveSeason(season);
    setShowSeasonDropdown(false);
    loadSeasonData(season);
  }, [loadSeasonData]);
  
  // Find available seasons (NOW THIS CAN REFERENCE loadSeasonData safely)
  useEffect(() => {
    if (!series) return;
    
    // Debug the series data structure
    console.log('Series data structure:', {
      title: series.title,
      availableSeasonKeys: Object.keys(series).filter(key => key.startsWith('Season')),
      hasSeasons: Object.keys(series).some(key => key.startsWith('Season') && series[key] !== null)
    });
    
    const seasons = [];
    for (let i = 1; i <= 14; i++) {
      const seasonKey = `Season ${i}`;
      if (series[seasonKey] && series[seasonKey] !== null) {
        seasons.push(i);
      }
    }
    
    setAvailableSeasons(seasons);
    
    // Set default active season to the first available one
    if (seasons.length > 0) {
      setActiveSeason(seasons[0]);
      loadSeasonData(seasons[0]);
    }
    
    // Set episodes tab active by default for series on mobile
    if (isMobile && seasons.length > 0) {
      setActiveTab('episodes');
    }
  }, [series, isMobile, loadSeasonData]);

  // Parse screenshots
  useEffect(() => {
    if (!series) return;

    // Parse screenshots from the series data
    try {
      if (series.movie_screenshots) {
        if (typeof series.movie_screenshots === 'string') {
          // Parse image URLs from HTML string
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

  // Function to render episodes list
  const renderEpisodes = useCallback(() => {
    if (!series) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Info size={40} className="mx-auto mb-4 text-gray-600" />
          <p>Series data not available</p>
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
    
    if (!seasonEpisodes || seasonEpisodes.length === 0) {
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
                Season {activeSeason}
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
                    key={season}
                    className="w-full text-left px-4 py-2 hover:bg-[#252525] flex items-center"
                    onClick={() => handleSeasonChange(season)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${activeSeason === season ? 'bg-red-500' : 'bg-gray-600'}`}></span>
                    Season {season}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Full season download section */}
          {seasonFullDownloads && seasonFullDownloads.length > 0 && (
            <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg border border-gray-800/50">
              <h3 className="text-lg mb-3 flex items-center">
                <Download size={18} className="mr-2 text-purple-500" /> 
                Complete Season {activeSeason} Download
              </h3>
              <div className="flex flex-wrap gap-2">
                {seasonFullDownloads.map((download, index) => (
                  <a
                    key={index}
                    href={`/download?link=${encryptLink(download.url)}`}
                    className="inline-flex items-center bg-[#252525] hover:bg-[#303030] px-4 py-2 rounded-full text-sm transition-all duration-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={14} className="mr-2" />
                    {download.quality} {download.size && `(${download.size})`}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-center py-8 text-gray-400">
            <Info size={40} className="mx-auto mb-4 text-gray-600" />
            <p>No episodes available for this season</p>
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
              Season {activeSeason}
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
                  key={season}
                  className="w-full text-left px-4 py-2 hover:bg-[#252525] flex items-center"
                  onClick={() => handleSeasonChange(season)}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${activeSeason === season ? 'bg-red-500' : 'bg-gray-600'}`}></span>
                  Season {season}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Full season download section */}
        {seasonFullDownloads.length > 0 && (
          <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg border border-gray-800/50">
            <h3 className="text-lg mb-3 flex items-center">
              <Download size={18} className="mr-2 text-purple-500" /> 
              Complete Season {activeSeason} Download
            </h3>
            <div className="flex flex-wrap gap-2">
              {seasonFullDownloads.map((download, index) => (
                <a
                  key={index}
                  href={`/download?link=${encryptLink(download.url)}`}
                  className="inline-flex items-center bg-[#252525] hover:bg-[#303030] px-4 py-2 rounded-full text-sm transition-all duration-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={14} className="mr-2" />
                  {download.quality} {download.size && `(${download.size})`}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Individual episodes */}
        <div className="space-y-3">
          {seasonEpisodes.map((episode) => (
            <div 
              key={episode.number} 
              className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800/30 hover:border-purple-500/20 transition-colors duration-300"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-gradient-to-r from-red-600 to-purple-600 w-10 h-10 flex items-center justify-center rounded-md mr-3 shadow-md shadow-purple-900/20">
                    {episode.number}
                  </div>
                  <div>
                    <h4 className="font-medium">Episode {episode.number}</h4>
                    <div className="text-sm text-gray-400 flex items-center mt-1">
                      <span className="mr-3">{episode.quality || 'HD'}</span>
                      {episode.size && <span>{episode.size}</span>}
                    </div>
                  </div>
                </div>
                
                <a
                  href={`/download?link=${encryptLink(episode.link)}`}
                  className="bg-[#252525] hover:bg-[#303030] p-2 rounded-md transition-all duration-300 hover:scale-105"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={20} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [activeSeason, availableSeasons, encryptLink, handleSeasonChange, seasonEpisodes, seasonFullDownloads, showSeasonDropdown]);

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
        
        <div className="relative h-[40vh] sm:h-[45vh] md:h-[55vh] lg:h-[60vh] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse"></div>
          
          <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
            <img 
              src={series.featured_image || series.image} 
              alt={series.title} 
              className="w-full h-full object-cover transition-opacity duration-700 opacity-0 onload-visible"
              onLoad={(e) => {
                e.target.classList.add('opacity-100');
                e.target.classList.remove('opacity-0');
              }}
              onError={handleImageError}
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black via-black/90 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/90 to-transparent"></div>
          
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-black/70 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-black/70 to-transparent"></div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
              <div className="flex-1">
                <div className="inline-block mb-2.5 px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium backdrop-blur-sm">
                  <Play size={12} className="inline mr-1" /> TV Series
                </div>
                
                <h2 
                  id="series-details-title" 
                  className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-2 md:mb-3 drop-shadow-lg"
                >
                  {series.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs md:text-sm text-gray-300 md:mb-2">
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
              </div>
              
              <div className="flex items-center gap-2.5 md:gap-3">
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <Bookmark size={isMobile ? 16 : 18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <ThumbsUp size={isMobile ? 16 : 18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
                
                <button className="relative flex items-center justify-center bg-white/15 hover:bg-white/25 p-2.5 rounded-full transition-all duration-200 overflow-hidden group">
                  <Share2 size={isMobile ? 16 : 18} className="text-white relative z-10" />
                  <span className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-150 rounded-full transition-transform duration-500"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-800 sticky top-0 z-20 bg-black/90 backdrop-blur-sm">
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

        <div 
          ref={contentRef}
          className="overflow-y-auto h-[calc(100vh-56px-40vh)] md:h-[calc(100vh-56px-45vh)] lg:h-[calc(100vh-56px-55vh)] overscroll-contain" 
        >
          <div className="p-4 md:p-6 lg:p-8">
            {activeTab === 'details' && (
              <div className="animate-fadeIn">
                {getCategories().length > 0 && (
                  <div className="mb-6">
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

                <div className="mb-6">
                  <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                    <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-2"></span>
                    Available Seasons
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {availableSeasons.map((season) => (
                      <button
                        key={season}
                        className={`px-4 py-2 rounded-full text-sm
                          ${activeSeason === season 
                            ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white shadow-md shadow-purple-900/20' 
                            : 'bg-[#252525] hover:bg-[#303030] text-gray-300'
                        } transition-all duration-300`}
                        onClick={() => handleSeasonChange(season)}
                      >
                        Season {season}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-[#1a1a1a] rounded-lg border border-gray-800/30">
                    <p className="text-sm text-gray-400">
                      To access all episodes and download links, go to the Episodes tab
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

                {series.description && (
                  <div className="mb-6">
                    <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-2"></span>
                      Description
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {series.description}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="text-sm uppercase text-gray-400 mb-3 flex items-center">
                    <span className="w-1 h-4 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full mr-2"></span>
                    Additional Information
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300">
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
              </div>
            )}

            {activeTab === 'episodes' && (
              <div className="animate-fadeIn">
                {renderEpisodes()}
              </div>
            )}

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
                    />
                  </div>
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
