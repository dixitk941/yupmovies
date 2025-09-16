import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Film, Tv, Play, Star, Grid, List, Filter } from 'lucide-react';
import { platforms } from '../data/mockData';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';
import SeriesDetail from './SeriesDetail';
import { SearchSkeleton, CardSkeleton, GridSkeleton, RowSkeleton, ButtonSkeleton, LoadingDots } from '../components/Skeleton';

// Platform Icons
import netflixIcon from '../assets/netflixsvg.svg';
import primeVideoIcon from '../assets/primevideo.svg';
import animeIcon from '../assets/anime.svg';
import kDramaIcon from '../assets/k-drama.svg';
import mxPlayerIcon from '../assets/mxplayer.webp';
import Bollywood from '../assets/bollywood.svg';
import HollyIcon from '../assets/hollywood.svg';

// **OPTIMIZED IMPORTS WITH REAL-TIME DATABASE SEARCH**
import { getAllMovies, searchMovies, searchMoviesDB, getCacheStats as getMovieStats } from '../services/movieService';
import { getAllSeries, searchSeries, searchSeriesDB, getSeriesCacheStats } from '../services/seriesService';
import { getAllAnime, searchAnime, searchAnimeDB, getAnimeCacheStats } from '../services/animeService';
import { getAllBollyMovies, getAllBollySeries, searchBollyMovies, searchBollySeries } from '../services/bollywoodService';

// **NEW IMPORTS FOR OPTIMIZATION**
import { useDirectDatabaseSearch, useLazyDownloadLinks } from '../hooks/useDirectDatabaseSearch';
import SimpleOptimizedImage from '../components/SimpleOptimizedImage';

// **PRODUCTION-SAFE LOGGING**
import logger from '../utils/logger';

// **OPTIMIZED BATCH LOADING CONFIGURATION**
const CONFIG = {
  INITIAL_BATCH_SIZE: 500, // First batch - increased for better UX
  ITEMS_PER_PAGE: 100, // Pagination size
  PRELOAD_IMAGES_COUNT: 20, // Number of images to preload
  SEARCH_MIN_LENGTH: 2, // Reduced for better UX - search with 2+ characters
  CACHE_PRELOAD_DELAY: 100
};

// **FILTER CONFIGURATION**
const FILTERS = [
  { id: 'all', label: 'All', icon: '🎬' },
  { id: 'dual-audio', label: 'Dual Audio', icon: '🎭' },
  { id: '1080p', label: '1080p', icon: '💻' },
  { id: '4k', label: '4K', icon: '🎯' },
  { id: '720p', label: '720p', icon: '📱' },
  { id: 'english', label: 'English', icon: '🇺🇸' },
  { id: 'hollywood', label: 'Hollywood', icon: '🎬' },
  { id: 'bollywood', label: 'Bollywood', icon: '🎪' },
  { id: 'netflix', label: 'Netflix', icon: '🔴' },
  { id: 'amazon-prime', label: 'Amazon Prime', icon: '📦' },
  { id: 'anime', label: 'Anime', icon: '🎌' },
  { id: 'kdrama', label: 'K-Drama', icon: '🇰🇷' },
  { id: 'web-dl', label: 'WEB-DL', icon: '🌐' },
  { id: 'bluray', label: 'Blu-Ray', icon: '💿' }
];

// **CINEMA TYPE TOGGLE COMPONENT**
const CinemaToggle = memo(({ cinemaType, setCinemaType }) => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-[300px] h-[60px] bg-gradient-to-r from-gray-900 to-black rounded-2xl overflow-hidden shadow-xl border border-gray-700/50 hover:shadow-2xl hover:shadow-red-900/20 transition-all duration-500 cursor-pointer group">
        {/* Background Images */}
        <div className="absolute inset-0 flex">
          <div 
            className={`w-1/2 h-full transition-all duration-500 ${cinemaType === 'hollywood' ? 'opacity-80 scale-105' : 'opacity-10 scale-95'}`}
            style={{
              backgroundImage: `url(${HollyIcon})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: cinemaType === 'hollywood' ? 'brightness(1.2) contrast(1.1)' : 'brightness(0.5) grayscale(0.7)'
            }}
          />
          <div 
            className={`w-1/2 h-full transition-all duration-500 ${cinemaType === 'bollywood' ? 'opacity-80 scale-105' : 'opacity-10 scale-95'}`}
            style={{
              backgroundImage: `url(${Bollywood})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: cinemaType === 'bollywood' ? 'brightness(1.2) contrast(1.1)' : 'brightness(0.5) grayscale(0.7)'
            }}
          />
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60"></div>
        
        {/* Toggle Buttons */}
        <div className="relative h-full flex">
          <button
            onClick={() => setCinemaType('hollywood')}
            className={`flex-1 h-full flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
              cinemaType === 'hollywood' 
                ? 'bg-gradient-to-r from-red-600/20 to-red-500/10' 
                : 'hover:bg-white/5'
            }`}
          >
            {/* Active Indicator */}
            {cinemaType === 'hollywood' && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 to-transparent animate-pulse"></div>
            )}
            <span className={`relative z-10 font-bold tracking-wide transition-all duration-300 ${
              cinemaType === 'hollywood' 
                ? 'text-white text-lg scale-110 drop-shadow-lg' 
                : 'text-gray-300 text-base hover:text-white'
            }`}>
              HOLLYWOOD
            </span>
          </button>
          
          <button
            onClick={() => setCinemaType('bollywood')}
            className={`flex-1 h-full flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
              cinemaType === 'bollywood' 
                ? 'bg-gradient-to-l from-orange-600/20 to-orange-500/10' 
                : 'hover:bg-white/5'
            }`}
          >
            {/* Active Indicator */}
            {cinemaType === 'bollywood' && (
              <div className="absolute inset-0 bg-gradient-to-l from-orange-600/30 to-transparent animate-pulse"></div>
            )}
            <span className={`relative z-10 font-bold tracking-wide transition-all duration-300 ${
              cinemaType === 'bollywood' 
                ? 'text-white text-lg scale-110 drop-shadow-lg' 
                : 'text-gray-300 text-base hover:text-white'
            }`}>
              BOLLYWOOD
            </span>
          </button>
        </div>
        
        {/* Bottom Indicator Bar */}
        <div className="absolute bottom-0 left-0 w-1/2 h-1 transition-all duration-500 ease-out"
             style={{ 
               transform: cinemaType === 'bollywood' ? 'translateX(100%)' : 'translateX(0)',
               background: cinemaType === 'bollywood' 
                 ? 'linear-gradient(90deg, #ea580c, #f97316)' 
                 : 'linear-gradient(90deg, #dc2626, #ef4444)'
             }}>
        </div>
        
        {/* Glow Effect */}
        <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
          cinemaType === 'hollywood' 
            ? 'shadow-[0_0_30px_rgba(220,38,38,0.3)]' 
            : 'shadow-[0_0_30px_rgba(234,88,12,0.3)]'
        } group-hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]`}>
        </div>
      </div>
    </div>
  );
});
// **COMPACT CINEMA TYPE TOGGLE COMPONENT**
const CompactCinemaToggle = memo(({ cinemaType, setCinemaType }) => {
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="relative w-[80px] h-[40px] bg-gray-800 rounded-lg overflow-hidden border border-gray-600 transition-all duration-300">
        {/* Background Images */}
        <div className="absolute inset-0 flex">
          <div 
            className={`w-1/2 h-full transition-all duration-300 ${cinemaType === 'hollywood' ? 'opacity-60 scale-105' : 'opacity-20 scale-95'}`}
            style={{
              backgroundImage: `url(${HollyIcon})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: cinemaType === 'hollywood' ? 'brightness(1.2) contrast(1.1)' : 'brightness(0.5) grayscale(0.7)'
            }}
          />
          <div 
            className={`w-1/2 h-full transition-all duration-300 ${cinemaType === 'bollywood' ? 'opacity-60 scale-105' : 'opacity-20 scale-95'}`}
            style={{
              backgroundImage: `url(${Bollywood})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: cinemaType === 'bollywood' ? 'brightness(1.2) contrast(1.1)' : 'brightness(0.5) grayscale(0.7)'
            }}
          />
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40"></div>
        
        {/* Active Background Indicator */}
        <div 
          className={`absolute top-0 h-full w-1/2 transition-all duration-300 ease-out rounded-md ${
            cinemaType === 'hollywood' 
              ? 'left-0 bg-gradient-to-r from-red-600/30 to-red-500/20' 
              : 'left-1/2 bg-gradient-to-r from-orange-600/30 to-orange-500/20'
          }`}
        />
        
        {/* Toggle Buttons */}
        <div className="relative h-full flex z-10">
          <button
            onClick={() => setCinemaType('hollywood')}
            className="flex-1 h-full flex items-center justify-center transition-all duration-200 hover:bg-white/10 relative z-10"
          >
            <span className={`text-[10px] font-bold transition-all duration-200 ${
              cinemaType === 'hollywood' ? 'text-white drop-shadow-md' : 'text-gray-400'
            }`}>
              HW
            </span>
          </button>
          
          <button
            onClick={() => setCinemaType('bollywood')}
            className="flex-1 h-full flex items-center justify-center transition-all duration-200 hover:bg-white/10 relative z-10"
          >
            <span className={`text-[10px] font-bold transition-all duration-200 ${
              cinemaType === 'bollywood' ? 'text-white drop-shadow-md' : 'text-gray-400'
            }`}>
              BW
            </span>
          </button>
        </div>
      </div>
      
      {/* Label */}
      <span className="text-white text-[8px] whitespace-nowrap">
        {cinemaType === 'hollywood' ? 'Hollywood' : 'Bollywood'}
      </span>
    </div>
  );
});

CompactCinemaToggle.displayName = 'CompactCinemaToggle';

// **GLOBAL REAL-TIME DATABASE SEARCH HOOK** - Searches across all content types
const useGlobalRealTimeSearch = (searchQuery, isSearchActive) => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const searchAbortController = useRef(null);
  
  // Memoize the global database search function
  const performGlobalDatabaseSearch = useCallback(async (query) => {
    if (!query || query.length < CONFIG.SEARCH_MIN_LENGTH || !isSearchActive) {
      setSearchResults([]);
      return;
    }
    
    // Cancel previous search if still running
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    
    // Create new abort controller for this search
    searchAbortController.current = new AbortController();
    
    setIsSearching(true);
    setSearchError(null);
    logger.log(`🔍 GLOBAL REAL-TIME SEARCH: "${query}" (All Content Types)`);
    
    try {
      // Search ALL content types from both Hollywood and Bollywood
      const searchPromises = [
        // Hollywood content
        searchMoviesDB(query, { 
          limit: 10,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ 
          ...item, 
          contentType: 'movies',
          sourceTable: 'movies',
          cinemaType: 'hollywood'
        }))),
        
        searchSeriesDB(query, { 
          limit: 10,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ 
          ...item, 
          contentType: 'series',
          sourceTable: 'series',
          cinemaType: 'hollywood'
        }))),
        
        searchAnimeDB(query, { 
          limit: 10,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ 
          ...item, 
          contentType: 'anime',
          sourceTable: 'anime',
          cinemaType: 'hollywood'
        }))),
        
        // Bollywood content
        searchBollyMovies(query, { 
          limit: 10,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ 
          ...item, 
          contentType: 'movies'
          // sourceTable and cinemaType already added by bollywoodService
        }))),
        
        searchBollySeries(query, { 
          limit: 10,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ 
          ...item, 
          contentType: 'series'
          // sourceTable and cinemaType already added by bollywoodService
        })))
      ];
      
      logger.log('🔄 Searching across all content types (Hollywood + Bollywood)...');
      const [movieResults, seriesResults, animeResults, bollyMovieResults, bollySeriesResults] = await Promise.all(searchPromises);
      
      // Combine and sort results by relevance/date
      const allResults = [...movieResults, ...seriesResults, ...animeResults, ...bollyMovieResults, ...bollySeriesResults]
        .sort((a, b) => {
          // Sort by modified date (newest first)
          const dateA = new Date(a.modifiedDate || a.modified_date || a.date || 0);
          const dateB = new Date(b.modifiedDate || b.modified_date || b.date || 0);
          return dateB - dateA;
        })
        .slice(0, 30); // Limit total results to 30
      
      logger.log(`✅ GLOBAL SEARCH: found ${allResults.length} results total`);
      logger.log(`  - Hollywood: ${movieResults.length} movies, ${seriesResults.length} series, ${animeResults.length} anime`);
      logger.log(`  - Bollywood: ${bollyMovieResults.length} movies, ${bollySeriesResults.length} series`);
      setSearchResults(allResults);
      
      setSearchError(null);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.log('🔄 Search aborted - new search started');
        return;
      }
      logger.error('❌ Global database search failed:', error);
      setSearchError(error.message || 'Search failed');
      
      // Return fallback cache search results if database search fails
      try {
        logger.log('🔄 Falling back to cache search...');
        const fallbackResults = [];
        
        // Simple cache search implementation
        // Note: This would require implementing cache search functions
        // For now, just return empty results
        setSearchResults(fallbackResults);
      } catch (fallbackError) {
        logger.error('❌ Fallback cache search also failed:', fallbackError);
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [isSearchActive]); // Remove cinemaType dependency for global search
  
  // Debounced search effect - only when search is active
  useEffect(() => {
    if (!isSearchActive) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    
    if (!searchQuery || searchQuery.length < CONFIG.SEARCH_MIN_LENGTH) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const debounceTimeout = setTimeout(() => {
      logger.log(`🔍 Triggering global search for "${searchQuery}"`);
      performGlobalDatabaseSearch(searchQuery);
    }, 300); // Faster response for real-time feel
    
    return () => {
      clearTimeout(debounceTimeout);
      // Cancel search when component unmounts or query changes
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
    };
  }, [searchQuery, performGlobalDatabaseSearch, isSearchActive]);
  
  // Generate suggestions from recent search results
  const suggestions = useMemo(() => {
    if (!searchResults || searchResults.length === 0 || !searchQuery) return [];
    
    return searchResults
      .slice(0, 5)
      .map(item => item?.title)
      .filter(title => title && title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchResults, searchQuery]);

  // Update search history only when we have successful results
  useEffect(() => {
    if (searchQuery && searchQuery.length >= CONFIG.SEARCH_MIN_LENGTH && searchResults.length > 0) {
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h !== searchQuery);
        return [searchQuery, ...filtered].slice(0, 10);
      });
    }
  }, [searchQuery, searchResults.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
    };
  }, []);

  return { 
    searchResults, 
    isSearching, 
    suggestions, 
    searchHistory,
    searchError
  };
};

// **REAL-TIME SEARCH BAR WITH CLICK-TO-ACTIVATE** 
const RealTimeSearchBar = memo(({ 
  searchQuery, 
  onSearchChange, 
  searchResults = [], 
  isSearching = false,
  suggestions = [],
  searchHistory = [],
  onResultSelect,
  searchError = null,
  isSearchActive = false,
  onSearchActivate,
  onSearchDeactivate
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        setIsFocused(false);
        // Deactivate search when clicking outside
        onSearchDeactivate?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearchDeactivate]);

  useEffect(() => {
    setShowDropdown(false); // Always keep dropdown hidden
  }, [isFocused, searchResults.length, isSearching, searchQuery, isSearchActive]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    onSearchChange(value);
    setActiveTab('results');
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Activate search when clicking/focusing on search bar
    onSearchActivate?.();
  };

  const handleResultClick = async (result) => {
    onResultSelect(result);
    setShowDropdown(false);
    setIsFocused(false);
    // Keep search active after selecting a result
  };

  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-400 text-black px-1 rounded font-semibold">
          {part}
        </span>
      ) : part
    );
  };

  // Component moved outside function for proper React scoping

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative group">
      <div className="relative w-[285px] h-[40px] transform translate-x-[20px]">
  {/* Input */}
  <input
    type="text"
    placeholder="search here..."
      className="w-full h-full bg-[#242424] backdrop-blur-sm border-0 rounded-[8px] pl-10 pr-4 text-white placeholder-gray-400 text-[12px] focus:outline-none transition-all duration-300"

    value={searchQuery}
    onChange={handleInputChange}
    onFocus={handleFocus}
  />

  {/* Search Icon */}
  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
    <Search size={18} />
  </div>
</div>

        
        {/* Clear Button - Always Visible */}
        <button
          onClick={() => {
            onSearchChange('');
            setShowDropdown(false);
          }}
          className={`absolute right-[1px] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all duration-200 ${!searchQuery ? 'opacity-0' : 'opacity-100'}`}
        >
          <X size={16} />
        </button>

        {/* Search status indicator */}
        {isSearching && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <LoadingDots size="sm" color="white" />
          </div>
        )}
      </div>

      {/* Search Dropdown - Disabled */}
      {false && showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-3 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl max-h-96 overflow-hidden z-50"
        >
          {isSearching ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SearchSkeleton key={i} />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {/* Group results by content type */}
              {(() => {
                const groupedResults = {
                  movies: searchResults.filter(r => r.contentType === 'movies'),
                  series: searchResults.filter(r => r.contentType === 'series'),
                  anime: searchResults.filter(r => r.contentType === 'anime')
                };

                return (
                  <>
                    {/* Movies Section */}
                    {groupedResults.movies.length > 0 && (
                      <div>
                        <div className="px-4 py-3 bg-gray-800/70 text-gray-300 text-xs font-semibold border-b border-gray-700 uppercase tracking-wide">
                          MOVIES ({groupedResults.movies.length})
                        </div>
                        {groupedResults.movies.slice(0, 3).map((result, index) => (
                          <button
                            key={`movie-${result.id || index}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full p-4 hover:bg-gray-800/50 text-left flex items-center space-x-4 border-b border-gray-800/50 last:border-b-0 transition-colors duration-200"
                          >
                            <div className="w-12 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                              <SimpleOptimizedImage
                                src={result.poster || result.featuredImage || result.featured_image}
                                alt={result.title}
                                className="w-full h-full object-cover"
                                lazy={true}
                                fallbackSrc="https://via.placeholder.com/120x160/1f1f1f/ffffff?text=No+Image"
                                onError={(e) => {
                                  logger.log('🖼️ Movie image load error for:', result.title, 'URL:', result.poster || result.featuredImage || result.featured_image);
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-semibold truncate mb-1">
                                {highlightMatch(result.title, searchQuery)}
                              </div>
                              <div className="text-gray-400 text-xs truncate">
                                {result.releaseYear} • Movie • {result.categories?.slice(0, 1).join(', ')}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Series Section */}
                    {groupedResults.series.length > 0 && (
                      <div>
                        <div className="px-4 py-3 bg-gray-800/70 text-gray-300 text-xs font-semibold border-b border-gray-700 uppercase tracking-wide">
                          TV SERIES ({groupedResults.series.length})
                        </div>
                        {groupedResults.series.slice(0, 3).map((result, index) => (
                          <button
                            key={`series-${result.id || index}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full p-3 hover:bg-gray-800 text-left flex items-center space-x-3 border-b border-gray-800 last:border-b-0"
                          >
                            <div className="w-12 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                              <SimpleOptimizedImage
                                src={result.poster || result.featuredImage || result.featured_image}
                                alt={result.title}
                                className="w-full h-full object-cover"
                                lazy={true}
                                fallbackSrc="https://via.placeholder.com/120x160/1f1f1f/ffffff?text=No+Image"
                                onError={(e) => {
                                  logger.log('🖼️ Series image load error for:', result.title, 'URL:', result.poster || result.featuredImage || result.featured_image);
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium truncate">
                                {highlightMatch(result.title, searchQuery)}
                              </div>
                              <div className="text-gray-400 text-xs truncate">
                                {result.releaseYear} • Series • {result.categories?.slice(0, 1).join(', ')}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Anime Section */}
                    {groupedResults.anime.length > 0 && (
                      <div>
                        <div className="px-3 py-2 bg-gray-800 text-gray-300 text-xs font-medium border-b border-gray-700">
                          ANIME ({groupedResults.anime.length})
                        </div>
                        {groupedResults.anime.slice(0, 3).map((result, index) => (
                          <button
                            key={`anime-${result.id || index}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full p-3 hover:bg-gray-800 text-left flex items-center space-x-3 border-b border-gray-800 last:border-b-0"
                          >
                            <div className="w-12 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                              <SimpleOptimizedImage
                                src={result.poster || result.featuredImage || result.featured_image}
                                alt={result.title}
                                className="w-full h-full object-cover"
                                lazy={true}
                                fallbackSrc="https://via.placeholder.com/120x160/1f1f1f/ffffff?text=No+Image"
                                onError={(e) => {
                                  logger.log('🖼️ Anime image load error for:', result.title, 'URL:', result.poster || result.featuredImage || result.featured_image);
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium truncate">
                                {highlightMatch(result.title, searchQuery)}
                              </div>
                              <div className="text-gray-400 text-xs truncate">
                                {result.releaseYear} • Anime • {result.categories?.slice(0, 1).join(', ')}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});
RealTimeSearchBar.displayName = 'RealTimeSearchBar';

// Memoized sub-components for better performance with skeleton loading
const MovieSkeleton = memo(() => (
  <CardSkeleton 
    className="flex-shrink-0"
    style={{ width: '112px', aspectRatio: '2/3' }}
  />
));
MovieSkeleton.displayName = 'MovieSkeleton';

const TabLoadingState = memo(({ contentType, cacheStats }) => (
  <div className="space-y-8 px-4 md:px-8">
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-6xl mx-auto px-4">
        <GridSkeleton count={12} />
        {cacheStats && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-4">
            <LoadingDots size="xs" color="gray" />
            <span>
              {contentType.charAt(0).toUpperCase() + contentType.slice(1)} 
              ({cacheStats.cached} cached)
              {cacheStats.isLoading && ' • Loading more...'}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
));
TabLoadingState.displayName = 'TabLoadingState';

// **DESKTOP BLOCKING COMPONENT** - Show when desktop access is detected
const DesktopBlockingPage = memo(() => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white px-4">
    <div className="flex flex-col items-center max-w-lg text-center space-y-8">
      {/* Mobile Icon */}
      <div className="relative">
        <svg 
          width="120" 
          height="120" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#ef4444" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="animate-pulse"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      </div>
      
      {/* Error Message */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-red-400 mb-4">
          📱 Mobile Only
        </h1>
        
        <p className="text-xl text-gray-300 mb-6 leading-relaxed">
          This application is exclusively designed for mobile devices.
        </p>
        
        <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-red-300">
            🚫 Desktop Access Restricted
          </h2>
          <p className="text-sm text-gray-300">
            For the best experience and security, please access this site using:
          </p>
          <ul className="text-sm text-gray-300 space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <span className="text-green-400">✓</span>
              <span>📱 Mobile Phone (Android/iOS)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-400">✓</span>
              <span>📱 Tablet (iPad/Android Tablet)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-red-400">✗</span>
              <span>💻 Desktop/Laptop Computer</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-gray-800 bg-opacity-50 rounded-lg p-6 space-y-3">
        <h3 className="text-lg font-semibold text-blue-300">
          📲 How to Access
        </h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>1. Open your mobile browser (Chrome, Safari, Firefox)</p>
          <p>2. Navigate to this website from your mobile device</p>
          <p>3. Enjoy the full mobile experience!</p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-xs text-gray-500 text-center">
        <p>This restriction helps us provide optimal performance and security for mobile users.</p>
      </div>
    </div>
  </div>
));
DesktopBlockingPage.displayName = 'DesktopBlockingPage';

// **CLEAN MINIMAL SCROLLABLE ROW**
const ScrollableRow = memo(({ title, subtitle, items, showNumbers = false, onContentSelect, showContentTypes = false }) => {
  const scrollRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const intersectionRef = useRef(null);

  // Intersection observer for performance
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (intersectionRef.current) {
      observer.observe(intersectionRef.current);
    }

    return () => observer.disconnect();
  }, [items, isVisible]);

  if (!isVisible && items.length > 0) {
    return (
      <div ref={intersectionRef} className="mb-8 h-48 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <LoadingDots size="md" color="gray" />
          <span className="text-base text-gray-300 font-medium">Loading section...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8" ref={intersectionRef}>
      <div className="mb-4 px-4 md:px-8">
        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      
      <div
        ref={scrollRef}
        className="flex space-x-3 overflow-x-auto scrollbar-hide pb-4 px-4 md:px-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((content, idx) => (
          <div key={content.id || `${content.title}-${idx}`} className="flex-shrink-0 relative">
            <MovieCard
              movie={content}
              onClick={onContentSelect}
              index={idx}
              showNumber={showNumbers}
              useOptimizedImage={true}
            />
            {showContentTypes && (
              <div className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                content.contentType === 'movies' ? 'bg-blue-500/70' : 
                content.contentType === 'series' ? 'bg-purple-500/70' : 
                'bg-orange-500/70'
              }`}>
                {content.contentType === 'movies' ? 'Movie' : 
                 content.contentType === 'series' ? 'Series' : 
                 'Anime'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
ScrollableRow.displayName = 'ScrollableRow';

// **GRID LAYOUT FOR SEARCH RESULTS**
const GridRow = memo(({ title, subtitle, items, showNumbers = false, onContentSelect, showContentTypes = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const intersectionRef = useRef(null);

  // Intersection observer for performance
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (intersectionRef.current) {
      observer.observe(intersectionRef.current);
    }

    return () => observer.disconnect();
  }, [items, isVisible]);

  if (!isVisible && items.length > 0) {
    return (
      <div ref={intersectionRef} className="mb-8 h-48 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <LoadingDots size="md" color="gray" />
          <span className="text-base text-gray-300 font-medium">Loading section...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8" ref={intersectionRef}>
      <div className="mb-4 px-4 md:px-8">
        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pb-4 px-4 md:px-8">
        {items.map((content, idx) => (
          <div key={content.id || `${content.title}-${idx}`} className="relative">
            <MovieCard
              movie={content}
              onClick={onContentSelect}
              index={idx}
              showNumber={showNumbers}
              useOptimizedImage={true}
            />
            {showContentTypes && (
              <div className={`absolute top-1 z-10 text-black right-1 text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                content.contentType === 'movies' ? 'bg-white' : 
                content.contentType === 'series' ? 'bg-white' : 
                'bg-white'
              }`}>
                {content.contentType === 'movies' ? 'Movie' : 
                 content.contentType === 'series' ? 'Series' : 
                 'Anime'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
GridRow.displayName = 'GridRow';

const BottomBar = memo(({ 
  contentType, 
  onContentTypeChange, 
  moviesLoading, 
  seriesLoading, 
  animeLoading,
  cacheStats 
}) => (
  <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50 transition-all duration-300 transform md:hidden">
    {/* Desktop version - now hidden with md:hidden class on parent */}
    <div className="hidden md:hidden justify-center px-6 py-4">
      <div className="flex bg-gray-900 rounded-lg p-1">
        <button
          className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-colors text-white ${
            contentType === 'movies' ? 'font-bold' : ''
          }`}
          onClick={() => onContentTypeChange('movies')}
        >
          <span>🎬</span>
          <span className="font-medium">Movies</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-colors text-white ${
            contentType === 'series' ? 'font-bold' : ''
          }`}
          onClick={() => onContentTypeChange('series')}
        >
          <span>📺</span>
          <span className="font-medium">TV Shows</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-colors text-white ${
            contentType === 'anime' ? 'font-bold' : ''
          }`}
          onClick={() => onContentTypeChange('anime')}
        >
          <span>🎌</span>
          <span className="font-medium">Anime</span>
        </button>
      </div>
    </div>

    {/* Mobile version */}
    <nav className="flex md:hidden items-center justify-around px-4 py-3">
      <button
        className={`flex flex-col items-center p-2 text-white ${
          contentType === 'movies' ? 'font-bold' : ''
        }`}
        onClick={() => onContentTypeChange('movies')}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" 
          className={contentType === 'movies' ? 'opacity-100' : 'opacity-70'}>
          <g opacity={contentType === 'movies' ? '1' : '0.7'}>
            <path d="M26.9999 13.0002H12.7612L26.2499 9.43891C26.3776 9.40527 26.4974 9.34667 26.6023 9.26651C26.7072 9.18634 26.7952 9.08619 26.8612 8.97184C26.9272 8.85749 26.9699 8.73119 26.9869 8.60025C27.0038 8.4693 26.9947 8.3363 26.9599 8.20891L25.9399 4.45891C25.7996 3.95439 25.4661 3.52549 25.0117 3.26509C24.5574 3.00469 24.0187 2.93376 23.5124 3.06766L4.47619 8.09266C4.22272 8.15845 3.98493 8.27416 3.77673 8.43299C3.56854 8.59182 3.39412 8.79059 3.26369 9.01766C3.13253 9.24195 3.04779 9.49031 3.01451 9.74799C2.98123 10.0057 3.00008 10.2674 3.06994 10.5177L3.99994 13.9452C3.99994 13.9627 3.99994 13.9814 3.99994 14.0002V25.0002C3.99994 25.5306 4.21065 26.0393 4.58573 26.4144C4.9608 26.7894 5.46951 27.0002 5.99994 27.0002H25.9999C26.5304 27.0002 27.0391 26.7894 27.4142 26.4144C27.7892 26.0393 27.9999 25.5306 27.9999 25.0002V14.0002C27.9999 13.7349 27.8946 13.4806 27.707 13.2931C27.5195 13.1055 27.2652 13.0002 26.9999 13.0002ZM24.0199 5.00016L24.7699 7.75891L21.9424 8.50891L18.4274 6.47891L24.0199 5.00016ZM15.6837 7.20016L19.1987 9.23016L14.5812 10.4489L11.0662 8.42141L15.6837 7.20016ZM5.75869 12.7777L5.00869 10.0177L8.32119 9.14266L11.8362 11.1752L5.75869 12.7777ZM25.9999 25.0002H5.99994V15.0002H25.9999V25.0002Z" 
              fill="white" />
          </g>
        </svg>
        <span className="text-xs mt-1">Movies</span>
      </button>
      <button
        className={`flex flex-col items-center p-2 text-white ${
          contentType === 'series' ? 'font-bold' : ''
        }`}
        onClick={() => onContentTypeChange('series')}
      >
        <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg"
          className={contentType === 'series' ? 'opacity-100' : 'opacity-70'}>
          <g opacity={contentType === 'series' ? '1' : '0.7'}>
            <path d="M27.5 8.00007H18.9137L23.2075 3.70757C23.3951 3.51993 23.5006 3.26543 23.5006 3.00007C23.5006 2.7347 23.3951 2.48021 23.2075 2.29257C23.0199 2.10493 22.7654 1.99951 22.5 1.99951C22.2346 1.99951 21.9801 2.10493 21.7925 2.29257L16.5 7.58632L11.2075 2.29257C11.1146 2.19966 11.0043 2.12596 10.8829 2.07567C10.7615 2.02539 10.6314 1.99951 10.5 1.99951C10.3686 1.99951 10.2385 2.02539 10.1171 2.07567C9.99571 2.12596 9.88541 2.19966 9.7925 2.29257C9.60486 2.48021 9.49944 2.7347 9.49944 3.00007C9.49944 3.26543 9.60486 3.51993 9.7925 3.70757L14.0863 8.00007H5.5C4.96957 8.00007 4.46086 8.21078 4.08579 8.58585C3.71071 8.96093 3.5 9.46963 3.5 10.0001V25.0001C3.5 25.5305 3.71071 26.0392 4.08579 26.4143C4.46086 26.7894 4.96957 27.0001 5.5 27.0001H27.5C28.0304 27.0001 28.5391 26.7894 28.9142 26.4143C29.2893 26.0392 29.5 25.5305 29.5 25.0001V10.0001C29.5 9.46963 29.2893 8.96093 28.9142 8.58585C28.5391 8.21078 28.0304 8.00007 27.5 8.00007ZM27.5 25.0001H5.5V10.0001H27.5V25.0001Z" fill="white"/>
          </g>
        </svg>
        <span className="text-xs mt-1">Series</span>
      </button>
      <button
        className={`flex flex-col items-center p-2 text-white ${
          contentType === 'anime' ? 'font-bold' : ''
        }`}
        onClick={() => onContentTypeChange('anime')}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
          className={contentType === 'anime' ? 'opacity-100' : 'opacity-70'}>
          <g opacity={contentType === 'anime' ? '1' : '0.7'}>
            <path d="M22.7113 26.7624C22.7447 26.8564 22.7591 26.956 22.7535 27.0556C22.748 27.1552 22.7226 27.2527 22.6789 27.3423C22.6352 27.432 22.5741 27.512 22.4991 27.5778C22.4242 27.6435 22.3368 27.6937 22.2422 27.7253C22.1476 27.7569 22.0477 27.7693 21.9482 27.7618C21.8488 27.7542 21.7518 27.727 21.663 27.6816C21.5743 27.6361 21.4954 27.5734 21.4312 27.4972C21.3669 27.4209 21.3185 27.3326 21.2887 27.2374L20.2887 24.2374C20.2553 24.1434 20.2409 24.0438 20.2465 23.9442C20.252 23.8446 20.2774 23.7471 20.3211 23.6575C20.3648 23.5678 20.4259 23.4878 20.5009 23.422C20.5758 23.3563 20.6632 23.3061 20.7578 23.2745C20.8524 23.2429 20.9523 23.2305 21.0518 23.238C21.1512 23.2456 21.2482 23.2728 21.337 23.3182C21.4257 23.3637 21.5046 23.4264 21.5688 23.5026C21.6331 23.5789 21.6815 23.6672 21.7113 23.7624L22.7113 26.7624ZM16 23.2499C15.8011 23.2499 15.6103 23.3289 15.4697 23.4696C15.329 23.6102 15.25 23.801 15.25 23.9999V27.9999C15.25 28.1988 15.329 28.3896 15.4697 28.5302C15.6103 28.6709 15.8011 28.7499 16 28.7499C16.1989 28.7499 16.3897 28.6709 16.5303 28.5302C16.671 28.3896 16.75 28.1988 16.75 27.9999V23.9999C16.75 23.801 16.671 23.6102 16.5303 23.4696C16.3897 23.3289 16.1989 23.2499 16 23.2499ZM11.2375 23.2887C11.0489 23.2257 10.8429 23.2402 10.665 23.3291C10.4871 23.4179 10.3518 23.5738 10.2887 23.7624L9.28875 26.7624C9.25531 26.8564 9.24094 26.956 9.24649 27.0556C9.25204 27.1552 9.2774 27.2527 9.32108 27.3423C9.36475 27.432 9.42587 27.512 9.50086 27.5778C9.57584 27.6435 9.66319 27.6937 9.75779 27.7253C9.85238 27.7569 9.95233 27.7693 10.0518 27.7618C10.1512 27.7542 10.2482 27.727 10.337 27.6816C10.4257 27.6361 10.5046 27.5734 10.5688 27.4972C10.6331 27.4209 10.6815 27.3326 10.7113 27.2374L11.7113 24.2374C11.7742 24.0488 11.7597 23.8428 11.6708 23.6649C11.582 23.487 11.4261 23.3517 11.2375 23.2887ZM30.75 13.9999C30.75 15.9212 29.1325 17.6737 26.195 18.9324C23.4587 20.1049 19.8387 20.7499 16 20.7499C12.1613 20.7499 8.54125 20.1049 5.805 18.9324C2.8675 17.6737 1.25 15.9212 1.25 13.9999C1.25 11.3549 4.3825 9.04365 9.44875 7.92865C10.1424 6.80782 11.1112 5.88295 12.263 5.24192C13.4147 4.6009 14.7113 4.26499 16.0294 4.26612C17.3475 4.26724 18.6435 4.60537 19.7941 5.24836C20.9448 5.89136 21.912 6.81788 22.6038 7.9399C27.6375 9.0599 30.75 11.3662 30.75 13.9999ZM9.75 12.1049V12.4799C9.74927 12.761 9.84396 13.034 10.0186 13.2543C10.1932 13.4745 10.4374 13.629 10.7113 13.6924C12.4478 14.0753 14.2218 14.2623 16 14.2499C17.7776 14.2638 19.5512 14.0785 21.2875 13.6974C21.5613 13.634 21.8056 13.4795 21.9802 13.2593C22.1548 13.039 22.2495 12.766 22.2488 12.4849V11.9999C22.2488 10.3423 21.5903 8.75259 20.4182 7.58048C19.2461 6.40838 17.6564 5.7499 15.9987 5.7499H15.915C12.5162 5.7949 9.75 8.6449 9.75 12.1049ZM29.25 13.9999C29.25 12.3337 26.9525 10.6737 23.4 9.6849C23.6328 10.4345 23.7508 11.215 23.75 11.9999V12.4899C23.7511 13.1098 23.5413 13.7117 23.1551 14.1966C22.769 14.6816 22.2294 15.0208 21.625 15.1587C19.7781 15.5658 17.8912 15.7641 16 15.7499C14.1088 15.7642 12.2219 15.5659 10.375 15.1587C9.7706 15.0208 9.23102 14.6816 8.84487 14.1966C8.45872 13.7117 8.24895 13.1098 8.25 12.4899V12.1062C8.2501 11.2806 8.38002 10.4601 8.635 9.6749C5.06125 10.6624 2.75 12.3274 2.75 13.9999C2.75 15.2649 4.07875 16.5599 6.39625 17.5536C8.94875 18.6474 12.36 19.2499 16 19.2499C19.64 19.2499 23.0513 18.6474 25.6038 17.5536C27.9212 16.5599 29.25 15.2649 29.25 13.9999Z" 
              fill="white" />
          </g>
        </svg>
        <span className="text-xs mt-1">Anime</span>
      </button>
    </nav>
  </div>
));
BottomBar.displayName = 'BottomBar';

// **CUSTOM EXIT CONFIRMATION MODAL COMPONENT**
const ExitConfirmationModal = ({ showExitConfirmation, setShowExitConfirmation }) => {
  if (!showExitConfirmation) return null;

  const handleStay = () => {
    setShowExitConfirmation(false);
  };

  const handleLeave = () => {
    setShowExitConfirmation(false);
    
    // Temporarily disable beforeunload protection
    const tempHandler = (e) => {
      e.stopImmediatePropagation();
    };
    
    window.addEventListener('beforeunload', tempHandler);
    
    // Small delay to ensure state is updated
    setTimeout(() => {
      // Remove our protection
      window.removeEventListener('beforeunload', tempHandler);
      
      // Navigate away - try multiple methods
      try {
        // Method 1: Replace current page
        window.location.replace('https://google.com');
      } catch (e) {
        try {
          // Method 2: Regular navigation
          window.location.href = 'https://google.com';
        } catch (e2) {
          // Method 3: Close tab if possible (only works if opened by script)
          window.close();
        }
      }
    }, 100);
  };

  // Handle escape key
  useEffect(() => {
    if (showExitConfirmation) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleStay();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showExitConfirmation]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fadeIn">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm mx-4 text-center shadow-2xl transform scale-100 transition-transform duration-200">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#ef4444" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2">
          Are you sure you want to exit?
        </h3>
        
        {/* Message */}
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          You'll lose your current browsing progress and any unsaved preferences.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStay}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Stay Here
          </button>
          <button
            onClick={handleLeave}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Exit Site
          </button>
        </div>
        
        {/* Small help text */}
        <p className="text-gray-500 text-xs mt-3">
          Press Escape to stay on the site
        </p>
      </div>
    </div>
  );
};

function Home() {
  const [contentType, setContentType] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false); // New state for search activation
  const [cinemaType, setCinemaType] = useState('hollywood'); // 'hollywood' or 'bollywood'
  
  // **OPTIMIZED PAGINATION - Load More Approach**
  const MOVIES_PER_PAGE = 20; // Items to load per batch
  const [displayedCount, setDisplayedCount] = useState(MOVIES_PER_PAGE); // How many items to show
  
  // **OPTIMIZED BATCH LOADING STATE**
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [allAnime, setAllAnime] = useState([]);
  const [allBollyMovies, setAllBollyMovies] = useState([]);
  const [allBollySeries, setAllBollySeries] = useState([]);
  
  // Individual loading states
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [animeLoading, setAnimeLoading] = useState(false);
  const [bollyMoviesLoading, setBollyMoviesLoading] = useState(false);
  const [bollySeriesLoading, setBollySeriesLoading] = useState(false);
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredContent, setFilteredContent] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  
  // Track which data has been fetched
  const [moviesLoaded, setMoviesLoaded] = useState(false);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [animeLoaded, setAnimeLoaded] = useState(false);
  const [bollyMoviesLoaded, setBollyMoviesLoaded] = useState(false);
  const [bollySeriesLoaded, setBollySeriesLoaded] = useState(false);
  
  // **MOBILE DEVICE DETECTION** - Block desktop access
  const [isMobileDevice, setIsMobileDevice] = useState(true); // Default to true to prevent flash
  const [deviceCheckComplete, setDeviceCheckComplete] = useState(false);
  
  // Cache statistics
  const [cacheStats, setCacheStats] = useState({
    movies: 0,
    series: 0,
    anime: 0
  });
  
  const [selectedMovie, setSelectedMovie] = useState(null);
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);
  
  // **EXIT CONFIRMATION STATE**
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  // **PREVENT MULTIPLE SIMULTANEOUS FETCHES**
  const fetchingRef = useRef({
    movies: false,
    series: false,
    anime: false,
    bollyMovies: false,
    bollySeries: false
  });
  const prevContentTypeRef = useRef(contentType);
  const prevCinemaTypeRef = useRef(cinemaType);
  const pageRef = useRef(1);

  // Reset displayed count when content type changes
  useEffect(() => {
    if (prevContentTypeRef.current !== contentType) {
      console.log('� Content type changed, resetting displayed count');
      setDisplayedCount(MOVIES_PER_PAGE);
      prevContentTypeRef.current = contentType;
    }
  }, [contentType]);

  // Clear filters when cinema type changes
  useEffect(() => {
    if (prevCinemaTypeRef.current !== cinemaType) {
      console.log('🎬 Cinema type changed, clearing filters');
      setActiveFilter('all');
      setFilteredContent([]);
      setFilterLoading(false);
      prevCinemaTypeRef.current = cinemaType;
    }
  }, [cinemaType]);

  // Debug displayedCount changes
  useEffect(() => {
    console.log('🔄 DisplayedCount changed to:', displayedCount);
  }, [displayedCount]);

  // **GLOBAL REAL-TIME SEARCH WITH ACTIVATION CONTROL**
  const { 
    searchResults, 
    isSearching, 
    suggestions, 
    searchHistory,
    searchError
  } = useGlobalRealTimeSearch(searchQuery, isSearchActive);

  // Remove these platforms from filters (case-insensitive) - memoized to prevent recreation
  const platformList = useMemo(() => {
    const removePlatforms = ["zee5", "sonyliv", "voot", "mx player"];
    return platforms.filter(
      p => !removePlatforms.some(name => p.name.toLowerCase().includes(name))
    );
  }, []);

  // **UPDATE CACHE STATS** - Debounced to prevent frequent updates
  const updateCacheStats = useCallback(() => {
    try {
      const movieStats = getMovieStats();
      const seriesStats = getSeriesCacheStats();
      const animeStats = getAnimeCacheStats();
      
      const newStats = {
        movies: movieStats?.totalMovies || 0,
        series: seriesStats?.totalSeries || 0,
        anime: animeStats?.totalAnime || 0
      };
      
      // Only update if stats have actually changed
      setCacheStats(prevStats => {
        if (JSON.stringify(prevStats) === JSON.stringify(newStats)) {
          return prevStats; // No change, return same object reference
        }
        logger.log('📊 Cache stats updated:', newStats);
        return newStats;
      });
    } catch (error) {
      logger.warn('Error updating cache stats:', error);
    }
  }, []);

  useEffect(() => {
    const controlNavbar = () => {
      if (!headerRef.current) return;
      if (window.scrollY > 200) {
        headerRef.current.classList.add('bg-opacity-95', 'backdrop-blur-md');
        headerRef.current.classList.remove('bg-opacity-0');
      } else {
        headerRef.current.classList.remove('bg-opacity-95', 'backdrop-blur-md');
        headerRef.current.classList.add('bg-opacity-0');
      }
      if (window.scrollY > 100 && window.scrollY > lastScrollY.current) {
        headerRef.current.classList.add('-translate-y-full');
      } else {
        headerRef.current.classList.remove('-translate-y-full');
      }
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, []);

  // **EXIT CONFIRMATION** - Custom UI prompt that distinguishes between refresh and actual exit
  useEffect(() => {
    let isRefreshing = false;
    let isInternalNavigation = false;
    
    // Track user interaction
    let hasUserInteracted = false;
    
    // Mark user interaction
    const markUserInteraction = () => {
      hasUserInteracted = true;
    };
    
    // Add interaction listeners
    document.addEventListener('click', markUserInteraction, { once: true });
    document.addEventListener('scroll', markUserInteraction, { once: true });
    document.addEventListener('keydown', markUserInteraction, { once: true });
    
    // Check if we should show exit confirmation
    const shouldShowExitConfirmation = () => {
      return hasUserInteracted && 
             !isRefreshing && 
             !isInternalNavigation && 
             (allMovies.length > 0 || allSeries.length > 0 || allAnime.length > 0 || searchQuery);
    };
    
    // Detect refresh actions
    const handleKeyDown = (event) => {
      // F5, Ctrl+R, Ctrl+Shift+R
      if (event.keyCode === 116 || 
          (event.ctrlKey && event.keyCode === 82) ||
          (event.ctrlKey && event.shiftKey && event.keyCode === 82)) {
        isRefreshing = true;
        // Reset after a delay
        setTimeout(() => { isRefreshing = false; }, 1000);
      }
    };
    
    // Handle beforeunload event (page unload/refresh)
    const handleBeforeUnload = (event) => {
      // Don't show confirmation for refresh actions
      if (isRefreshing || isInternalNavigation) {
        return;
      }
      
      // Show browser's native confirmation dialog for actual page unload
      if (shouldShowExitConfirmation()) {
        const message = 'Are you sure you want to leave? Your browsing progress will be lost.';
        event.preventDefault();
        event.returnValue = message; // Required for Chrome
        return message; // Required for other browsers
      }
    };
    
    // Handle hash/route changes (internal navigation)
    const handleHashChange = () => {
      isInternalNavigation = true;
      setTimeout(() => { isInternalNavigation = false; }, 100);
    };
    
    // Handle popstate (back/forward buttons) - Use custom modal for this
    const handlePopState = (event) => {
      if (shouldShowExitConfirmation()) {
        // Prevent actual navigation by pushing state back
        window.history.pushState({ modalOpen: true }, '');
        // Show our custom modal for back button
        setShowExitConfirmation(true);
      }
    };
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset flags when page becomes visible again
        isRefreshing = false;
        isInternalNavigation = false;
      }
    };
    
    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Push initial state for popstate handling
    if (window.history.state?.modalOpen !== true) {
      window.history.pushState({ modalOpen: true }, '');
    }
    
    // Cleanup function
    return () => {
      document.removeEventListener('click', markUserInteraction);
      document.removeEventListener('scroll', markUserInteraction);
      document.removeEventListener('keydown', markUserInteraction);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [allMovies.length, allSeries.length, allAnime.length, searchQuery]);

  // **MOBILE DEVICE DETECTION** - Check if device is mobile only
  useEffect(() => {
    const checkMobileDevice = () => {
      // Multiple detection methods for accuracy
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
      
      // Screen size check (mobile/tablet typically <= 1024px width)
      const isMobileScreen = window.innerWidth <= 1024;
      
      // Touch capability check
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check for mobile orientation API
      const hasOrientationAPI = 'orientation' in window;
      
      // Device pixel ratio check (mobile devices often have higher DPR)
      const hasHighDPR = window.devicePixelRatio > 1;
      
      // Combine checks - device is considered mobile if it meets multiple criteria
      const isMobile = (
        isMobileUserAgent || 
        (isMobileScreen && isTouchDevice) ||
        (isMobileScreen && hasOrientationAPI) ||
        (isTouchDevice && hasHighDPR && isMobileScreen)
      );
      
      console.log('📱 Device Detection:', {
        userAgent: isMobileUserAgent,
        screenSize: isMobileScreen,
        touchDevice: isTouchDevice,
        orientationAPI: hasOrientationAPI,
        highDPR: hasHighDPR,
        finalDecision: isMobile,
        screenWidth: window.innerWidth
      });
      
      setIsMobileDevice(isMobile);
      setDeviceCheckComplete(true);
    };

    // Check immediately
    checkMobileDevice();
    
    // Also check on window resize in case user resizes browser
    window.addEventListener('resize', checkMobileDevice);
    
    return () => {
      window.removeEventListener('resize', checkMobileDevice);
    };
  }, []);

  // **OPTIMIZED BATCH FETCH FUNCTIONS**
  const fetchMovies = useCallback(async () => {
    if (moviesLoaded || moviesLoading || fetchingRef.current.movies) {
      logger.log('🎬 Movies already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.movies = true;
    setMoviesLoading(true);
    logger.log('🎬 Starting optimized movie loading...');
    
    try {
      // This now loads in progressive batches (500 initially, then more in background)
      const movies = await getAllMovies(CONFIG.INITIAL_BATCH_SIZE);
      logger.log(`✅ Loaded ${movies.length} movies in optimized batches`);
      
      // Add sourceTable property to movies for proper content type detection
      const moviesWithSource = movies.map(movie => ({
        ...movie,
        sourceTable: 'movies',
        cinemaType: 'hollywood'
      }));
      
      setAllMovies(moviesWithSource);
      setMoviesLoaded(true);
      
      // Update cache stats after successful load
      setTimeout(() => {
        try {
          updateCacheStats();
        } catch (error) {
          logger.warn('Cache stats update after movie load failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      logger.error('❌ Error loading movies:', error);
    } finally {
      setMoviesLoading(false);
      fetchingRef.current.movies = false;
    }
  }, []); // Remove all dependencies to prevent recreation

  const fetchSeries = useCallback(async () => {
    if (seriesLoaded || seriesLoading || fetchingRef.current.series) {
      logger.log('📺 Series already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.series = true;
    setSeriesLoading(true);
    logger.log('📺 Starting optimized series loading...');
    
    try {
      const series = await getAllSeries(CONFIG.INITIAL_BATCH_SIZE);
      logger.log(`✅ Loaded ${series.length} series in optimized batches`);
      
      // Add sourceTable property to series for proper content type detection
      const seriesWithSource = series.map(serie => ({
        ...serie,
        sourceTable: 'series',
        cinemaType: 'hollywood'
      }));
      
      setAllSeries(seriesWithSource);
      setSeriesLoaded(true);
      
      // Update cache stats after successful load
      setTimeout(() => {
        try {
          updateCacheStats();
        } catch (error) {
          logger.warn('Cache stats update after series load failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      logger.error('❌ Error loading series:', error);
    } finally {
      setSeriesLoading(false);
      fetchingRef.current.series = false;
    }
  }, []); // Remove all dependencies to prevent recreation

  const fetchAnime = useCallback(async () => {
    if (animeLoaded || animeLoading || fetchingRef.current.anime) {
      logger.log('🌟 Anime already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.anime = true;
    setAnimeLoading(true);
    logger.log('🌟 Starting optimized anime loading...');
    
    try {
      const anime = await getAllAnime(CONFIG.INITIAL_BATCH_SIZE);
      logger.log(`✅ Loaded ${anime.length} anime in optimized batches`);
      
      // Add sourceTable property to anime for proper content type detection
      const animeWithSource = anime.map(animeItem => ({
        ...animeItem,
        sourceTable: 'anime',
        cinemaType: 'hollywood'
      }));
      
      setAllAnime(animeWithSource);
      setAnimeLoaded(true);
      
      // Update cache stats after successful load
      setTimeout(() => {
        try {
          updateCacheStats();
        } catch (error) {
          logger.warn('Cache stats update after anime load failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      logger.error('❌ Error loading anime:', error);
    } finally {
      setAnimeLoading(false);
      fetchingRef.current.anime = false;
    }
  }, []); // Remove all dependencies to prevent recreation

  // **FETCH BOLLYWOOD MOVIES FUNCTION**
  const fetchBollyMovies = useCallback(async () => {
    if (bollyMoviesLoaded || bollyMoviesLoading || fetchingRef.current.bollyMovies) {
      logger.log('🎬 Bollywood movies already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.bollyMovies = true;
    setBollyMoviesLoading(true);
    logger.log('🎬 Starting optimized Bollywood movie loading...');
    
    try {
      // This now loads in progressive batches
      const bollyMovies = await getAllBollyMovies(CONFIG.INITIAL_BATCH_SIZE);
      logger.log(`✅ Loaded ${bollyMovies.length} Bollywood movies in optimized batches`);
      setAllBollyMovies(bollyMovies);
      setBollyMoviesLoaded(true);
      
    } catch (error) {
      logger.error('❌ Error loading Bollywood movies:', error);
    } finally {
      setBollyMoviesLoading(false);
      fetchingRef.current.bollyMovies = false;
    }
  }, []); // Remove all dependencies to prevent recreation

  // **FETCH BOLLYWOOD SERIES FUNCTION**
  const fetchBollySeries = useCallback(async () => {
    if (bollySeriesLoaded || bollySeriesLoading || fetchingRef.current.bollySeries) {
      logger.log('📺 Bollywood series already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.bollySeries = true;
    setBollySeriesLoading(true);
    logger.log('📺 Starting optimized Bollywood series loading...');
    
    try {
      const bollySeries = await getAllBollySeries(CONFIG.INITIAL_BATCH_SIZE);
      logger.log(`✅ Loaded ${bollySeries.length} Bollywood series in optimized batches`);
      setAllBollySeries(bollySeries);
      setBollySeriesLoaded(true);
      
    } catch (error) {
      logger.error('❌ Error loading Bollywood series:', error);
    } finally {
      setBollySeriesLoading(false);
      fetchingRef.current.bollySeries = false;
    }
  }, []); // Remove all dependencies to prevent recreation

  // **BATCH LOADING ON CONTENT TYPE CHANGE**
  useEffect(() => {
    // Use refs to check current state to avoid stale closures
    if (cinemaType === 'hollywood') {
      const shouldFetchMovies = contentType === 'movies' && !moviesLoaded && !moviesLoading;
      const shouldFetchSeries = contentType === 'series' && !seriesLoaded && !seriesLoading;  
      const shouldFetchAnime = contentType === 'anime' && !animeLoaded && !animeLoading;
      
      if (shouldFetchMovies) {
        logger.log('🎬 Content type changed to movies, fetching...');
        fetchMovies().catch(logger.error);
      } else if (shouldFetchSeries) {
        logger.log('📺 Content type changed to series, fetching...');
        fetchSeries().catch(logger.error);
      } else if (shouldFetchAnime) {
        logger.log('🌟 Content type changed to anime, fetching...');
        fetchAnime().catch(logger.error);
      }
    } else if (cinemaType === 'bollywood') {
      const shouldFetchBollyMovies = contentType === 'movies' && !bollyMoviesLoaded && !bollyMoviesLoading;
      const shouldFetchBollySeries = contentType === 'series' && !bollySeriesLoaded && !bollySeriesLoading;
      
      if (shouldFetchBollyMovies) {
        logger.log('🎬 Content type changed to Bollywood movies, fetching...');
        fetchBollyMovies().catch(logger.error);
      } else if (shouldFetchBollySeries) {
        logger.log('📺 Content type changed to Bollywood series, fetching...');
        fetchBollySeries().catch(logger.error);
      }
    }
  }, [contentType, cinemaType]); // Depend on contentType and cinemaType

  // Effect to handle cinema type change
  useEffect(() => {
    if (prevCinemaTypeRef.current !== cinemaType) {
      console.log(`🔄 Cinema type changed from ${prevCinemaTypeRef.current} to ${cinemaType}`);
      setDisplayedCount(MOVIES_PER_PAGE); // Reset displayed count
      prevCinemaTypeRef.current = cinemaType;
      
      // Load appropriate content based on new cinema type
      if (cinemaType === 'bollywood') {
        if (contentType === 'movies' && !bollyMoviesLoaded) {
          fetchBollyMovies().catch(logger.error);
        } else if (contentType === 'series' && !bollySeriesLoaded) {
          fetchBollySeries().catch(logger.error);
        }
      } else {
        // Hollywood content
        if (contentType === 'movies' && !moviesLoaded) {
          fetchMovies().catch(logger.error);
        } else if (contentType === 'series' && !seriesLoaded) {
          fetchSeries().catch(logger.error);
        } else if (contentType === 'anime' && !animeLoaded) {
          fetchAnime().catch(logger.error);
        }
      }
    }
  }, [cinemaType, contentType]);

  // **FILTER HELPER FUNCTIONS**
  const logCategoryInfo = (label, results) => {
    if (results.length === 0) {
      console.log(`🔍 No ${label} content found`);
      return;
    }
    
    // Log the first few items' categories to help with debugging
    const sampleItems = results.slice(0, 3);
    console.log(`🔍 ${label} content samples (${results.length} total):`, 
      sampleItems.map(item => ({
        title: item.title,
        contentType: item.contentType,
        categories: typeof item.categories === 'string' ? item.categories : 
                   Array.isArray(item.categories) ? item.categories.join(', ') : 
                   'No categories'
      }))
    );
  };

  // **FILTER FUNCTIONS - Direct database queries - ALWAYS ACROSS ALL CONTENT TYPES**
  const applyFilter = useCallback(async (filterId) => {
    if (filterId === 'all') {
      setActiveFilter('all');
      setFilteredContent([]);
      setFilterLoading(false); // Ensure loading is false for 'all'
      setDisplayedCount(MOVIES_PER_PAGE);
      return;
    }

    // Immediately set loading states
    setFilterLoading(true);
    setActiveFilter(filterId);
    setFilteredContent([]); // Clear previous results immediately
    
    try {
      let results = [];
      
      // Add loading indicator to the specific filter
      console.log(`🔍 Fetching ${filterId} content from ALL content types (movies, series, anime)...`);
      
      // Ensure we always load data from all content types regardless of current tab
      // Start loading all content types if they haven't been loaded yet
      const loadMoviesPromise = !moviesLoaded ? fetchMovies() : Promise.resolve();
      const loadSeriesPromise = !seriesLoaded ? fetchSeries() : Promise.resolve();
      const loadAnimePromise = !animeLoaded ? fetchAnime() : Promise.resolve();
      
      // Wait for any pending content loads to finish
      await Promise.all([loadMoviesPromise, loadSeriesPromise, loadAnimePromise]);
      
      switch (filterId) {
        case 'netflix':
          // Query Netflix content based on cinema type
          try {
            const { default: supabaseNetflix } = await import('../services/supabaseClient.js');
            
            let queries = [];
            
            if (cinemaType === 'hollywood') {
              // Hollywood Netflix content only
              queries = await Promise.all([
                supabaseNetflix
                  .from('movies')
                  .select('*')
                  .or('categories.ilike.%Netflix%,categories.ilike.%NETFLIX%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabaseNetflix
                  .from('series')
                  .select('*')
                  .or('categories.ilike.%Netflix%,categories.ilike.%NETFLIX%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabaseNetflix
                  .from('anime')
                  .select('*')
                  .or('categories.ilike.%Netflix%,categories.ilike.%NETFLIX%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200)
              ]);
              
              const [netflixMoviesQuery, netflixSeriesQuery, netflixAnimeQuery] = queries;
              const netflixMovies = netflixMoviesQuery.data || [];
              const netflixSeries = netflixSeriesQuery.data || [];
              const netflixAnime = netflixAnimeQuery.data || [];
              
              console.log('📊 Direct Netflix search results (Hollywood):', {
                movies: netflixMovies.length,
                series: netflixSeries.length, 
                anime: netflixAnime.length
              });
              
              results = [
                ...netflixMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'movies', cinemaType: 'hollywood' })),
                ...netflixSeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'series', cinemaType: 'hollywood' })),
                ...netflixAnime.map(item => ({ ...item, contentType: 'anime', sourceTable: 'anime', cinemaType: 'hollywood' }))
              ];
            } else {
              // Bollywood Netflix content only
              queries = await Promise.all([
                supabaseNetflix
                  .from('bolly_movies')
                  .select('*')
                  .or('categories.ilike.%Netflix%,categories.ilike.%NETFLIX%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabaseNetflix
                  .from('bolly_series')
                  .select('*')
                  .or('categories.ilike.%Netflix%,categories.ilike.%NETFLIX%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200)
              ]);
              
              const [netflixBollyMoviesQuery, netflixBollySeriesQuery] = queries;
              const netflixBollyMovies = netflixBollyMoviesQuery.data || [];
              const netflixBollySeries = netflixBollySeriesQuery.data || [];
              
              console.log('📊 Direct Netflix search results (Bollywood):', {
                bollyMovies: netflixBollyMovies.length,
                bollySeries: netflixBollySeries.length
              });
              
              results = [
                ...netflixBollyMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
                ...netflixBollySeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
              ];
            }
            
            // Log sample categories for debugging
            logCategoryInfo(`Netflix (${cinemaType})`, results);
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log(`🔄 Network failed, filtering cached data for Netflix content (${cinemaType})...`);
            // Filter cached content based on cinema type
            let allCachedContent = [];
            if (cinemaType === 'hollywood') {
              allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            } else {
              allCachedContent = [...allBollyMovies, ...allBollySeries];
            }
            
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes('netflix');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: (allMovies.includes(item) || allBollyMovies.includes(item)) ? 'movies' : 
                          (allSeries.includes(item) || allBollySeries.includes(item)) ? 'series' : 'anime',
              sourceTable: allMovies.includes(item) ? 'movies' :
                          allSeries.includes(item) ? 'series' :
                          allAnime.includes(item) ? 'anime' :
                          allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series',
              cinemaType: cinemaType
            }));
            
            console.log(`📊 Cached Netflix results (${cinemaType}):`, filteredFromCache.length);
            logCategoryInfo(`Cached Netflix (${cinemaType})`, results);
          }
          break;
        
        case 'amazon-prime':
        case 'prime':
          // Query Amazon Prime Video content based on cinema type
          try {
            const { default: supabasePrime } = await import('../services/supabaseClient.js');
            
            let queries = [];
            
            if (cinemaType === 'hollywood') {
              // Hollywood Amazon Prime content only
              queries = await Promise.all([
                supabasePrime
                  .from('movies')
                  .select('*')
                  .or('categories.ilike.%Amazon Prime Video%,categories.ilike.%Prime Video%,categories.ilike.%Prime%,categories.ilike.%Amazon%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabasePrime
                  .from('series')
                  .select('*')
                  .or('categories.ilike.%Amazon Prime Video%,categories.ilike.%Prime Video%,categories.ilike.%Prime%,categories.ilike.%Amazon%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabasePrime
                  .from('anime')
                  .select('*')
                  .or('categories.ilike.%Amazon Prime Video%,categories.ilike.%Prime Video%,categories.ilike.%Prime%,categories.ilike.%Amazon%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200)
              ]);
              
              const [amazonPrimeMoviesQuery, amazonPrimeSeriesQuery, amazonPrimeAnimeQuery] = queries;
              const amazonPrimeMovies = amazonPrimeMoviesQuery.data || [];
              const amazonPrimeSeries = amazonPrimeSeriesQuery.data || [];
              const amazonPrimeAnime = amazonPrimeAnimeQuery.data || [];
              
              console.log('📊 Direct Amazon Prime Video search results (Hollywood):', {
                movies: amazonPrimeMovies.length,
                series: amazonPrimeSeries.length, 
                anime: amazonPrimeAnime.length
              });
              
              results = [
                ...amazonPrimeMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'movies', cinemaType: 'hollywood' })),
                ...amazonPrimeSeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'series', cinemaType: 'hollywood' })),
                ...amazonPrimeAnime.map(item => ({ ...item, contentType: 'anime', sourceTable: 'anime', cinemaType: 'hollywood' }))
              ];
            } else {
              // Bollywood Amazon Prime content only
              queries = await Promise.all([
                supabasePrime
                  .from('bolly_movies')
                  .select('*')
                  .or('categories.ilike.%Amazon Prime Video%,categories.ilike.%Prime Video%,categories.ilike.%Prime%,categories.ilike.%Amazon%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabasePrime
                  .from('bolly_series')
                  .select('*')
                  .or('categories.ilike.%Amazon Prime Video%,categories.ilike.%Prime Video%,categories.ilike.%Prime%,categories.ilike.%Amazon%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200)
              ]);
              
              const [amazonPrimeBollyMoviesQuery, amazonPrimeBollySeriesQuery] = queries;
              const amazonPrimeBollyMovies = amazonPrimeBollyMoviesQuery.data || [];
              const amazonPrimeBollySeries = amazonPrimeBollySeriesQuery.data || [];
              
              console.log('📊 Direct Amazon Prime Video search results (Bollywood):', {
                bollyMovies: amazonPrimeBollyMovies.length,
                bollySeries: amazonPrimeBollySeries.length
              });
              
              results = [
                ...amazonPrimeBollyMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
                ...amazonPrimeBollySeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
              ];
            }
            
            // Log sample categories for debugging
            logCategoryInfo(`Amazon Prime Video (${cinemaType})`, results);
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log(`🔄 Network failed, filtering cached data for Amazon Prime Video content (${cinemaType})...`);
            // Filter cached content based on cinema type
            let allCachedContent = [];
            if (cinemaType === 'hollywood') {
              allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            } else {
              allCachedContent = [...allBollyMovies, ...allBollySeries];
            }
            
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes('amazon prime video') || categories.includes('prime video');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: (allMovies.includes(item) || allBollyMovies.includes(item)) ? 'movies' : 
                          (allSeries.includes(item) || allBollySeries.includes(item)) ? 'series' : 'anime',
              sourceTable: allMovies.includes(item) ? 'movies' :
                          allSeries.includes(item) ? 'series' :
                          allAnime.includes(item) ? 'anime' :
                          allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series',
              cinemaType: cinemaType
            }));
            
            console.log(`📊 Cached Amazon Prime Video results (${cinemaType}):`, filteredFromCache.length);
            logCategoryInfo(`Cached Amazon Prime Video (${cinemaType})`, results);
          }
          break;
        
        case 'apple-tv':
          // Search for Apple TV content in categories
          const [appleMovies, appleSeries, appleAnime] = await Promise.all([
            searchMoviesDB('apple', { genre: 'apple', limit: 200 }),
            searchSeriesDB('apple', { genre: 'apple', limit: 200 }),
            searchAnimeDB('apple', { genre: 'apple', limit: 200 })
          ]);
          results = [
            ...appleMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...appleSeries.map(item => ({ ...item, contentType: 'series' })),
            ...appleAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        case '720p':
          // Try direct database query first, fallback to cached data if network fails
          try {
            const { default: supabase720 } = await import('../services/supabaseClient.js');
            const [movies720pQuery, series720pQuery, anime720pQuery] = await Promise.all([
              supabase720
                .from('movies')
                .select('*')
                .ilike('categories', '%720p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase720
                .from('series')
                .select('*')
                .ilike('categories', '%720p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase720
                .from('anime')
                .select('*')
                .ilike('categories', '%720p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            const movies720p = movies720pQuery.data || [];
            const series720p = series720pQuery.data || [];
            const anime720p = anime720pQuery.data || [];
            
            console.log('📊 Direct 720p search results:', {
              movies: movies720p.length,
              series: series720p.length, 
              anime: anime720p.length
            });
            
            results = [
              ...movies720p.map(item => ({ ...item, contentType: 'movies' })),
              ...series720p.map(item => ({ ...item, contentType: 'series' })),
              ...anime720p.map(item => ({ ...item, contentType: 'anime' }))
            ];
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log('🔄 Network failed, filtering ALL cached data for 720p content...');
            // Always use all cached content regardless of current content type
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes('720p');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allMovies.includes(item) ? 'movies' : 
                          allSeries.includes(item) ? 'series' : 'anime'
            }));
            
            console.log('📊 Cached 720p results across ALL content:', filteredFromCache.length);
          }
          break;
        
        case '1080p':
          // Try direct database query first, fallback to cached data if network fails
          try {
            const { default: supabase1080 } = await import('../services/supabaseClient.js');
            const [movies1080pQuery, series1080pQuery, anime1080pQuery] = await Promise.all([
              supabase1080
                .from('movies')
                .select('*')
                .ilike('categories', '%1080p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase1080
                .from('series')
                .select('*')
                .ilike('categories', '%1080p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase1080
                .from('anime')
                .select('*')
                .ilike('categories', '%1080p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            const movies1080p = movies1080pQuery.data || [];
            const series1080p = series1080pQuery.data || [];
            const anime1080p = anime1080pQuery.data || [];
            
            console.log('📊 Direct 1080p search results:', {
              movies: movies1080p.length,
              series: series1080p.length, 
              anime: anime1080p.length
            });
            
            results = [
              ...movies1080p.map(item => ({ ...item, contentType: 'movies' })),
              ...series1080p.map(item => ({ ...item, contentType: 'series' })),
              ...anime1080p.map(item => ({ ...item, contentType: 'anime' }))
            ];
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log('🔄 Network failed, filtering ALL cached data for 1080p content...');
            // Always use all cached content regardless of current content type
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes('1080p');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allMovies.includes(item) ? 'movies' : 
                          allSeries.includes(item) ? 'series' : 'anime'
            }));
            
            console.log('📊 Cached 1080p results across ALL content:', filteredFromCache.length);
          }
          break;
        
        case '4k':
          // Try direct database query for 4K content across all types
          try {
            const { default: supabase4k } = await import('../services/supabaseClient.js');
            const [movies4kQuery, series4kQuery, anime4kQuery] = await Promise.all([
              supabase4k
                .from('movies')
                .select('*')
                .or('categories.ilike.%4k%,categories.ilike.%2160p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase4k
                .from('series')
                .select('*')
                .or('categories.ilike.%4k%,categories.ilike.%2160p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase4k
                .from('anime')
                .select('*')
                .or('categories.ilike.%4k%,categories.ilike.%2160p%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            const movies4k = movies4kQuery.data || [];
            const series4k = series4kQuery.data || [];
            const anime4k = anime4kQuery.data || [];
            
            console.log('📊 Direct 4K search results:', {
              movies: movies4k.length,
              series: series4k.length, 
              anime: anime4k.length
            });
            
            results = [
              ...movies4k.map(item => ({ ...item, contentType: 'movies' })),
              ...series4k.map(item => ({ ...item, contentType: 'series' })),
              ...anime4k.map(item => ({ ...item, contentType: 'anime' }))
            ];
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log('🔄 Network failed, filtering ALL cached data for 4K content...');
            // Always use all cached content regardless of current content type
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes('4k') || categories.includes('2160p');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allMovies.includes(item) ? 'movies' : 
                          allSeries.includes(item) ? 'series' : 'anime'
            }));
            
            console.log('📊 Cached 4K results across ALL content:', filteredFromCache.length);
          }
          break;
        
        case 'english':
          // English content search based on cinema type
          try {
            const { default: supabaseEnglish } = await import('../services/supabaseClient.js');
            
            if (cinemaType === 'hollywood') {
              // Hollywood English content
              const [englishMoviesQuery, englishSeriesQuery, englishAnimeQuery] = await Promise.all([
                supabaseEnglish
                  .from('movies')
                  .select('*')
                  .or('categories.ilike.%English%,categories.ilike.%english%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabaseEnglish
                  .from('series')
                  .select('*')
                  .or('categories.ilike.%English%,categories.ilike.%english%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabaseEnglish
                  .from('anime')
                  .select('*')
                  .or('categories.ilike.%English%,categories.ilike.%english%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200)
              ]);
              
              results = [
                ...(englishMoviesQuery.data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'movies', cinemaType: 'hollywood' })),
                ...(englishSeriesQuery.data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'series', cinemaType: 'hollywood' })),
                ...(englishAnimeQuery.data || []).map(item => ({ ...item, contentType: 'anime', sourceTable: 'anime', cinemaType: 'hollywood' }))
              ];
            } else {
              // Bollywood English content
              const [englishBollyMoviesQuery, englishBollySeriesQuery] = await Promise.all([
                supabaseEnglish
                  .from('bolly_movies')
                  .select('*')
                  .or('categories.ilike.%English%,categories.ilike.%english%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabaseEnglish
                  .from('bolly_series')
                  .select('*')
                  .or('categories.ilike.%English%,categories.ilike.%english%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200)
              ]);
              
              results = [
                ...(englishBollyMoviesQuery.data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
                ...(englishBollySeriesQuery.data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
              ];
            }
            
            console.log('📊 Direct English search results:', {
              totalResults: results.length,
              cinemaType,
              breakdown: cinemaType === 'hollywood' ? {
                movies: results.filter(item => item.contentType === 'movies').length,
                series: results.filter(item => item.contentType === 'series').length,
                anime: results.filter(item => item.contentType === 'anime').length
              } : {
                movies: results.filter(item => item.contentType === 'movies').length,
                series: results.filter(item => item.contentType === 'series').length
              }
            });
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log('🔄 Network failed, filtering cached data for English content...');
            // Filter cached content based on cinema type
            const allCachedContent = cinemaType === 'hollywood' 
              ? [...allMovies, ...allSeries, ...allAnime] 
              : [...allBollyMovies, ...allBollySeries];
              
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) 
                ? item.categories.join(' ').toLowerCase() 
                : (item.categories || '').toLowerCase();
              return categories.includes('english');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: (allMovies.includes(item) || allBollyMovies.includes(item)) ? 'movies' 
                         : (allSeries.includes(item) || allBollySeries.includes(item)) ? 'series' 
                         : 'anime',
              sourceTable: allMovies.includes(item) ? 'movies' 
                         : allSeries.includes(item) ? 'series' 
                         : allAnime.includes(item) ? 'anime' 
                         : allBollyMovies.includes(item) ? 'bolly_movies' 
                         : 'bolly_series',
              cinemaType
            }));
            
            console.log('📊 Cached English results:', {
              totalResults: filteredFromCache.length,
              cinemaType
            });
          }
          break;
        
        case 'dual-audio':
          // Try direct database query first, fallback to cached data if network fails
          console.log('🔍 Searching for Dual Audio content across ALL content types...');
          
          try {
            const { default: supabase } = await import('../services/supabaseClient.js');
            
            const [dualMoviesQuery, dualSeriesQuery, dualAnimeQuery] = await Promise.all([
              supabase
                .from('movies')
                .select('*')
                .or('categories.ilike.%Dual Audio Movies%,categories.ilike.%Dual Audio%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase
                .from('series')
                .select('*')
                .or('categories.ilike.%Dual Audio Series%,categories.ilike.%Dual Audio%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase
                .from('anime')
                .select('*')
                .ilike('categories', '%dual audio%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            const dualMovies = dualMoviesQuery.data || [];
            const dualSeries = dualSeriesQuery.data || [];
            const dualAnime = dualAnimeQuery.data || [];
            
            console.log('📊 Direct Dual Audio search results:', {
              movies: dualMovies.length,
              series: dualSeries.length, 
              anime: dualAnime.length,
              sampleCategories: dualMovies.slice(0, 2).map(m => m.categories),
              queries: {
                moviesError: dualMoviesQuery.error,
                seriesError: dualSeriesQuery.error,
                animeError: dualAnimeQuery.error
              }
            });
            
            results = [
              ...dualMovies.map(item => ({ ...item, contentType: 'movies' })),
              ...dualSeries.map(item => ({ ...item, contentType: 'series' })),
              ...dualAnime.map(item => ({ ...item, contentType: 'anime' }))
            ];
            
            // If network query failed, fallback to filtering cached data
            if (results.length === 0 && (dualMoviesQuery.error || dualSeriesQuery.error || dualAnimeQuery.error)) {
              throw new Error('Network request failed, using cached data');
            }
            
          } catch (error) {
            console.log('🔄 Network failed, filtering ALL cached data for Dual Audio content...');
            
            // Filter from all cached content across all types
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes('dual audio');
            });
            
            console.log('📊 Cached Dual Audio results:', {
              totalCached: allCachedContent.length,
              filtered: filteredFromCache.length,
              sampleCategories: filteredFromCache.slice(0, 2).map(m => m.categories)
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allMovies.includes(item) ? 'movies' : 
                          allSeries.includes(item) ? 'series' : 'anime'
            }));
          }
          break;
        
        case 'kdrama':
          // K-Drama search based on cinema type (K-Dramas are typically Hollywood/international content)
          try {
            const { default: supabaseKdrama } = await import('../services/supabaseClient.js');
            
            if (cinemaType === 'hollywood') {
              // Hollywood K-Drama content
              const [koreanSeriesMoviesQuery, koreanSeriesSeriesQuery, koreanSeriesAnimeQuery] = await Promise.all([
                supabaseKdrama
                  .from('movies')
                  .select('*')
                  .or('categories.ilike.%Korean Series%,categories.ilike.%K-Drama%,categories.ilike.%Korean%,categories.ilike.%KDrama%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(500),
                supabaseKdrama
                  .from('series')
                  .select('*')
                  .or('categories.ilike.%Korean Series%,categories.ilike.%K-Drama%,categories.ilike.%Korean%,categories.ilike.%KDrama%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(500),
                supabaseKdrama
                  .from('anime')
                  .select('*')
                  .or('categories.ilike.%Korean Series%,categories.ilike.%K-Drama%,categories.ilike.%Korean%,categories.ilike.%KDrama%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(500)
              ]);
              
              const koreanSeriesMovies = koreanSeriesMoviesQuery.data || [];
              const koreanSeriesSeries = koreanSeriesSeriesQuery.data || [];
              const koreanSeriesAnime = koreanSeriesAnimeQuery.data || [];
              
              console.log('📊 Direct K-Drama search results (Hollywood):', {
                movies: koreanSeriesMovies.length,
                series: koreanSeriesSeries.length,
                anime: koreanSeriesAnime.length
              });
              
              results = [
                ...koreanSeriesMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'movies', cinemaType: 'hollywood' })),
                ...koreanSeriesSeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'series', cinemaType: 'hollywood' })),
                ...koreanSeriesAnime.map(item => ({ ...item, contentType: 'anime', sourceTable: 'anime', cinemaType: 'hollywood' }))
              ];
            } else {
              // Bollywood K-Drama related content (unlikely but check for Korean-inspired content)
              const [koreanBollyMoviesQuery, koreanBollySeriesQuery] = await Promise.all([
                supabaseKdrama
                  .from('bolly_movies')
                  .select('*')
                  .or('categories.ilike.%Korean Series%,categories.ilike.%K-Drama%,categories.ilike.%Korean%,categories.ilike.%KDrama%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(500),
                supabaseKdrama
                  .from('bolly_series')
                  .select('*')
                  .or('categories.ilike.%Korean Series%,categories.ilike.%K-Drama%,categories.ilike.%Korean%,categories.ilike.%KDrama%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(500)
              ]);
              
              const koreanBollyMovies = koreanBollyMoviesQuery.data || [];
              const koreanBollySeries = koreanBollySeriesQuery.data || [];
              
              console.log('📊 Direct K-Drama search results (Bollywood):', {
                bollyMovies: koreanBollyMovies.length,
                bollySeries: koreanBollySeries.length
              });
              
              results = [
                ...koreanBollyMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
                ...koreanBollySeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
              ];
            }
            
            // Log sample categories for debugging
            logCategoryInfo(`K-Drama (${cinemaType})`, results);
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log('🔄 Network failed, filtering cached data for K-Drama content...');
            // Filter cached content based on cinema type
            const allCachedContent = cinemaType === 'hollywood' 
              ? [...allMovies, ...allSeries, ...allAnime] 
              : [...allBollyMovies, ...allBollySeries];
              
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) 
                ? item.categories.join(' ').toLowerCase() 
                : (item.categories || '').toLowerCase();
              return categories.includes('korean series') || categories.includes('k-drama') || categories.includes('kdrama') || categories.includes('korean');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: (allMovies.includes(item) || allBollyMovies.includes(item)) ? 'movies' 
                         : (allSeries.includes(item) || allBollySeries.includes(item)) ? 'series' 
                         : 'anime',
              sourceTable: allMovies.includes(item) ? 'movies' 
                         : allSeries.includes(item) ? 'series' 
                         : allAnime.includes(item) ? 'anime' 
                         : allBollyMovies.includes(item) ? 'bolly_movies' 
                         : 'bolly_series',
              cinemaType
            }));
            
            console.log('📊 Cached K-Drama results:', {
              totalResults: filteredFromCache.length,
              cinemaType
            });
          }
          break;
          
        case 'mxplayer':
          // MX Player Original content search (Bollywood only)
          try {
            const { default: supabaseMX } = await import('../services/supabaseClient.js');
            
            // MX Player content from Bollywood tables only
            const [mxBollyMoviesQuery, mxBollySeriesQuery] = await Promise.all([
              supabaseMX
                .from('bolly_movies')
                .select('*')
                .or('categories.ilike.%MX Original%,categories.ilike.%MX Player%,categories.ilike.%MXPlayer%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabaseMX
                .from('bolly_series')
                .select('*')
                .or('categories.ilike.%MX Original%,categories.ilike.%MX Player%,categories.ilike.%MXPlayer%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            const mxBollyMovies = mxBollyMoviesQuery.data || [];
            const mxBollySeries = mxBollySeriesQuery.data || [];
            
            console.log('📊 Direct MX Player search results (Bollywood):', {
              bollyMovies: mxBollyMovies.length,
              bollySeries: mxBollySeries.length
            });
            
            results = [
              ...mxBollyMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
              ...mxBollySeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
            ];
            
            // Log sample categories for debugging
            logCategoryInfo('MX Player Original (Bollywood)', results);
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log('🔄 Network failed, filtering cached data for MX Player content (Bollywood)...');
            // Filter cached Bollywood content for MX Player
            const allCachedContent = [...allBollyMovies, ...allBollySeries];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes('mx original') || categories.includes('mx player') || categories.includes('mxplayer');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allBollyMovies.includes(item) ? 'movies' : 'series',
              sourceTable: allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series',
              cinemaType: 'bollywood'
            }));
            
            console.log('📊 Cached MX Player results (Bollywood):', filteredFromCache.length);
            logCategoryInfo('Cached MX Player (Bollywood)', results);
          }
          break;
          
        // Regional language filters for Bollywood content
        case 'punjabi':
          try {
            const { default: supabasePunjabi } = await import('../services/supabaseClient.js');
            const [punjabiMoviesQuery, punjabiSeriesQuery] = await Promise.all([
              supabasePunjabi
                .from('bolly_movies')
                .select('*')
                .or('categories.ilike.%Punjabi%,categories.ilike.%punjabi%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabasePunjabi
                .from('bolly_series')
                .select('*')
                .or('categories.ilike.%Punjabi%,categories.ilike.%punjabi%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            results = [
              ...(punjabiMoviesQuery.data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
              ...(punjabiSeriesQuery.data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
            ];
          } catch (error) {
            console.log('🔄 Fallback to cached Punjabi content...');
            const allCachedContent = [...allBollyMovies, ...allBollySeries];
            results = allCachedContent.filter(item => {
              const categories = (item.categories || '').toLowerCase();
              return categories.includes('punjabi');
            }).map(item => ({ ...item, contentType: allBollyMovies.includes(item) ? 'movies' : 'series', sourceTable: allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series', cinemaType: 'bollywood' }));
          }
          break;
          
        case 'gujarati':
          try {
            const { default: supabaseGujarati } = await import('../services/supabaseClient.js');
            const [gujaratiMoviesQuery, gujaratiSeriesQuery] = await Promise.all([
              supabaseGujarati
                .from('bolly_movies')
                .select('*')
                .or('categories.ilike.%Gujarati%,categories.ilike.%gujarati%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabaseGujarati
                .from('bolly_series')
                .select('*')
                .or('categories.ilike.%Gujarati%,categories.ilike.%gujarati%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            results = [
              ...(gujaratiMoviesQuery.data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
              ...(gujaratiSeriesQuery.data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
            ];
          } catch (error) {
            console.log('🔄 Fallback to cached Gujarati content...');
            const allCachedContent = [...allBollyMovies, ...allBollySeries];
            results = allCachedContent.filter(item => {
              const categories = (item.categories || '').toLowerCase();
              return categories.includes('gujarati');
            }).map(item => ({ ...item, contentType: allBollyMovies.includes(item) ? 'movies' : 'series', sourceTable: allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series', cinemaType: 'bollywood' }));
          }
          break;
          
        case 'marathi':
          try {
            const { default: supabaseMarathi } = await import('../services/supabaseClient.js');
            const [marathiMoviesQuery, marathiSeriesQuery] = await Promise.all([
              supabaseMarathi
                .from('bolly_movies')
                .select('*')
                .or('categories.ilike.%Marathi%,categories.ilike.%marathi%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabaseMarathi
                .from('bolly_series')
                .select('*')
                .or('categories.ilike.%Marathi%,categories.ilike.%marathi%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            results = [
              ...(marathiMoviesQuery.data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
              ...(marathiSeriesQuery.data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
            ];
          } catch (error) {
            console.log('🔄 Fallback to cached Marathi content...');
            const allCachedContent = [...allBollyMovies, ...allBollySeries];
            results = allCachedContent.filter(item => {
              const categories = (item.categories || '').toLowerCase();
              return categories.includes('marathi');
            }).map(item => ({ ...item, contentType: allBollyMovies.includes(item) ? 'movies' : 'series', sourceTable: allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series', cinemaType: 'bollywood' }));
          }
          break;
          
        case 'bengali':
          try {
            const { default: supabaseBengali } = await import('../services/supabaseClient.js');
            const [bengaliMoviesQuery, bengaliSeriesQuery] = await Promise.all([
              supabaseBengali
                .from('bolly_movies')
                .select('*')
                .or('categories.ilike.%Bengali%,categories.ilike.%bengali%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabaseBengali
                .from('bolly_series')
                .select('*')
                .or('categories.ilike.%Bengali%,categories.ilike.%bengali%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200)
            ]);
            
            results = [
              ...(bengaliMoviesQuery.data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
              ...(bengaliSeriesQuery.data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
            ];
          } catch (error) {
            console.log('🔄 Fallback to cached Bengali content...');
            const allCachedContent = [...allBollyMovies, ...allBollySeries];
            results = allCachedContent.filter(item => {
              const categories = (item.categories || '').toLowerCase();
              return categories.includes('bengali');
            }).map(item => ({ ...item, contentType: allBollyMovies.includes(item) ? 'movies' : 'series', sourceTable: allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series', cinemaType: 'bollywood' }));
          }
          break;
          
        case '1080p-60fps':
          try {
            const { default: supabase1080p60 } = await import('../services/supabaseClient.js');
            let queries = [];
            
            if (cinemaType === 'hollywood') {
              queries = await Promise.all([
                supabase1080p60.from('movies').select('*').or('categories.ilike.%1080p 60fps%,categories.ilike.%1080p60fps%').eq('status', 'publish').order('modified_date', { ascending: false }).limit(200),
                supabase1080p60.from('series').select('*').or('categories.ilike.%1080p 60fps%,categories.ilike.%1080p60fps%').eq('status', 'publish').order('modified_date', { ascending: false }).limit(200),
                supabase1080p60.from('anime').select('*').or('categories.ilike.%1080p 60fps%,categories.ilike.%1080p60fps%').eq('status', 'publish').order('modified_date', { ascending: false }).limit(200)
              ]);
              results = [
                ...(queries[0].data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'movies', cinemaType: 'hollywood' })),
                ...(queries[1].data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'series', cinemaType: 'hollywood' })),
                ...(queries[2].data || []).map(item => ({ ...item, contentType: 'anime', sourceTable: 'anime', cinemaType: 'hollywood' }))
              ];
            } else {
              queries = await Promise.all([
                supabase1080p60.from('bolly_movies').select('*').or('categories.ilike.%1080p 60fps%,categories.ilike.%1080p60fps%').eq('status', 'publish').order('modified_date', { ascending: false }).limit(200),
                supabase1080p60.from('bolly_series').select('*').or('categories.ilike.%1080p 60fps%,categories.ilike.%1080p60fps%').eq('status', 'publish').order('modified_date', { ascending: false }).limit(200)
              ]);
              results = [
                ...(queries[0].data || []).map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
                ...(queries[1].data || []).map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
              ];
            }
          } catch (error) {
            console.log('🔄 Fallback to cached 1080p 60FPS content...');
            const allCachedContent = cinemaType === 'hollywood' ? [...allMovies, ...allSeries, ...allAnime] : [...allBollyMovies, ...allBollySeries];
            results = allCachedContent.filter(item => {
              const categories = (item.categories || '').toLowerCase();
              return categories.includes('1080p 60fps') || categories.includes('1080p60fps');
            }).map(item => ({ ...item, contentType: (allMovies.includes(item) || allBollyMovies.includes(item)) ? 'movies' : (allSeries.includes(item) || allBollySeries.includes(item)) ? 'series' : 'anime', sourceTable: allMovies.includes(item) ? 'movies' : allSeries.includes(item) ? 'series' : allAnime.includes(item) ? 'anime' : allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series', cinemaType }));
          }
          break;
          
        case 'anime':
          // Anime search based on cinema type
          try {
            const { default: supabaseAnime } = await import('../services/supabaseClient.js');
            
            if (cinemaType === 'hollywood') {
              // Hollywood anime content (from anime table) - GET ALL ANIME
              const [hollywoodAnimeQuery] = await Promise.all([
                supabaseAnime
                  .from('anime')
                  .select('*')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  // No limit - get ALL anime content
              ]);
              
              const hollywoodAnime = hollywoodAnimeQuery.data || [];
              
              console.log('📊 Direct Anime search results (Hollywood):', {
                anime: hollywoodAnime.length
              });
              
              results = [
                ...hollywoodAnime.map(item => ({ ...item, contentType: 'anime', sourceTable: 'anime', cinemaType: 'hollywood' }))
              ];
            } else {
              // Bollywood anime-related content (animated movies/series)
              const [bollywoodAnimeMoviesQuery, bollywoodAnimeSeriesQuery] = await Promise.all([
                supabaseAnime
                  .from('bolly_movies')
                  .select('*')
                  .or('categories.ilike.%anime%,categories.ilike.%animated%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200),
                supabaseAnime
                  .from('bolly_series')
                  .select('*')
                  .or('categories.ilike.%anime%,categories.ilike.%animated%')
                  .eq('status', 'publish')
                  .order('modified_date', { ascending: false })
                  .limit(200)
              ]);
              
              const bollywoodAnimeMovies = bollywoodAnimeMoviesQuery.data || [];
              const bollywoodAnimeSeries = bollywoodAnimeSeriesQuery.data || [];
              
              console.log('📊 Direct Anime search results (Bollywood):', {
                animeMovies: bollywoodAnimeMovies.length,
                animeSeries: bollywoodAnimeSeries.length
              });
              
              results = [
                ...bollywoodAnimeMovies.map(item => ({ ...item, contentType: 'movies', sourceTable: 'bolly_movies', cinemaType: 'bollywood' })),
                ...bollywoodAnimeSeries.map(item => ({ ...item, contentType: 'series', sourceTable: 'bolly_series', cinemaType: 'bollywood' }))
              ];
            }
            
            // Log sample categories for debugging
            logCategoryInfo('Anime', results);
            
            if (results.length === 0) throw new Error('No results from network');
            
          } catch (error) {
            console.log('🔄 Network failed, filtering ALL cached data for Anime content...');
            // Always use all cached content from both Hollywood and Bollywood
            const allCachedContent = [...allAnime, ...allBollyMovies, ...allBollySeries];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return allAnime.includes(item) || categories.includes('anime') || categories.includes('animated');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allAnime.includes(item) ? 'anime' : 
                          allBollyMovies.includes(item) ? 'movies' : 'series',
              sourceTable: allAnime.includes(item) ? 'anime' :
                          allBollyMovies.includes(item) ? 'bolly_movies' : 'bolly_series',
              cinemaType: allAnime.includes(item) ? 'hollywood' : 'bollywood'
            }));
            
            console.log('📊 Cached Anime results across ALL content:', filteredFromCache.length);
            logCategoryInfo('Cached Anime', results);
          }
          break;
        
        case 'hollywood':
          // Direct database query for Hollywood content across all content types
          const { default: supabaseHollywood } = await import('../services/supabaseClient.js');
          const [hollywoodMoviesQuery, hollywoodSeriesQuery, hollywoodAnimeQuery] = await Promise.all([
            supabaseHollywood
              .from('movies')
              .select('*')
              .ilike('categories', '%Hollywood%')
              .eq('status', 'publish')
              .order('modified_date', { ascending: false })
              .limit(200),
            supabaseHollywood
              .from('series')
              .select('*')
              .ilike('categories', '%Hollywood%')
              .eq('status', 'publish')
              .order('modified_date', { ascending: false })
              .limit(200),
            supabaseHollywood
              .from('anime')
              .select('*')
              .ilike('categories', '%Hollywood%')
              .eq('status', 'publish')
              .order('modified_date', { ascending: false })
              .limit(200)
          ]);
          
          const hollywoodMovies = hollywoodMoviesQuery.data || [];
          const hollywoodSeries = hollywoodSeriesQuery.data || [];
          const hollywoodAnime = hollywoodAnimeQuery.data || [];
          
          console.log('📊 Direct Hollywood search results:', {
            movies: hollywoodMovies.length,
            series: hollywoodSeries.length,
            anime: hollywoodAnime.length
          });
          
          results = [
            ...hollywoodMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...hollywoodSeries.map(item => ({ ...item, contentType: 'series' })),
            ...hollywoodAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        case 'bollywood':
          // Search for Bollywood content in categories across all content types
          const [bollywoodMovies, bollywoodSeries, bollywoodAnime] = await Promise.all([
            searchMoviesDB('bollywood', { genre: 'bollywood', limit: 200 }),
            searchSeriesDB('bollywood', { genre: 'bollywood', limit: 200 }),
            searchAnimeDB('bollywood', { genre: 'bollywood', limit: 200 })
          ]);
          results = [
            ...bollywoodMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...bollywoodSeries.map(item => ({ ...item, contentType: 'series' })),
            ...bollywoodAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        case 'web-dl':
          // Search for WEB-DL content in categories across all content types
          const [webdlMovies, webdlSeries, webdlAnime] = await Promise.all([
            searchMoviesDB('web-dl', { genre: 'web-dl', limit: 200 }),
            searchSeriesDB('web-dl', { genre: 'web-dl', limit: 200 }),
            searchAnimeDB('web-dl', { genre: 'web-dl', limit: 200 })
          ]);
          results = [
            ...webdlMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...webdlSeries.map(item => ({ ...item, contentType: 'series' })),
            ...webdlAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        case 'bluray':
          // Search for Blu-Ray content in categories across all content types
          const [blurayMovies, bluraySeries, blurayAnime] = await Promise.all([
            searchMoviesDB('blu-ray', { genre: 'blu-ray', limit: 200 }),
            searchSeriesDB('blu-ray', { genre: 'blu-ray', limit: 200 }),
            searchAnimeDB('blu-ray', { genre: 'blu-ray', limit: 200 })
          ]);
          results = [
            ...blurayMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...bluraySeries.map(item => ({ ...item, contentType: 'series' })),
            ...blurayAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        default:
          // For any other filter, try to search across all content types
          const [defaultMovies, defaultSeries, defaultAnime] = await Promise.all([
            searchMoviesDB(filterId, { genre: filterId, limit: 200 }),
            searchSeriesDB(filterId, { genre: filterId, limit: 200 }),
            searchAnimeDB(filterId, { genre: filterId, limit: 200 })
          ]);
          
          results = [
            ...defaultMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...defaultSeries.map(item => ({ ...item, contentType: 'series' })),
            ...defaultAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          
          // If no results from DB, try searching in cached data
          if (results.length === 0) {
            console.log(`🔍 No direct DB results for "${filterId}", searching in ALL cached content...`);
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = Array.isArray(item.categories) ? item.categories.join(' ').toLowerCase() : 
                              (item.categories || '').toLowerCase();
              return categories.includes(filterId.toLowerCase());
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allMovies.includes(item) ? 'movies' : 
                          allSeries.includes(item) ? 'series' : 'anime'
            }));
            
            console.log(`📊 Cached ${filterId} results:`, filteredFromCache.length);
          }
      }
      
      // Remove duplicates based on record_id only (more lenient deduplication)
      const uniqueResults = results
        .filter((item, index, arr) => {
          // Only remove if exact same record_id exists
          return arr.findIndex(i => i.record_id === item.record_id) === index;
        })
        .sort((a, b) => new Date(b.modified_date || b.date) - new Date(a.modified_date || a.date));
      
      console.log(`✅ Filter ${filterId} completed: ${uniqueResults.length} unique items found from ${results.length} total results across ALL content types`);
      console.log('📊 Sample results by content type:', {
        'movies': uniqueResults.filter(item => item.contentType === 'movies').slice(0, 2).map(r => r.title),
        'series': uniqueResults.filter(item => item.contentType === 'series').slice(0, 2).map(r => r.title),
        'anime': uniqueResults.filter(item => item.contentType === 'anime').slice(0, 2).map(r => r.title)
      });
      
      // Count items by content type for more informative display
      const movieCount = uniqueResults.filter(item => item.contentType === 'movies').length;
      const seriesCount = uniqueResults.filter(item => item.contentType === 'series').length;
      const animeCount = uniqueResults.filter(item => item.contentType === 'anime').length;
      
      console.log(`📊 Filter breakdown: ${movieCount} movies, ${seriesCount} series, ${animeCount} anime`);
      
      setFilteredContent(uniqueResults);
      setDisplayedCount(MOVIES_PER_PAGE); // Reset to initial count
      
    } catch (error) {
      console.error('❌ Database filter error:', error);
      setFilteredContent([]);
      // Show user-friendly error
      console.log(`🔄 Filter ${filterId} failed, showing empty results`);
    } finally {
      setFilterLoading(false);
    }
  }, [MOVIES_PER_PAGE, allMovies, allSeries, allAnime, fetchMovies, fetchSeries, fetchAnime, moviesLoaded, seriesLoaded, animeLoaded, cinemaType]);

  // Handle filter change
  const handleFilterChange = useCallback((filterId) => {
    // Load all content types if they haven't been loaded yet
    if (!moviesLoaded) {
      fetchMovies().catch(console.error);
    }
    if (!seriesLoaded) {
      fetchSeries().catch(console.error);
    }
    if (!animeLoaded) {
      fetchAnime().catch(console.error);
    }
    
    // Apply the filter
    applyFilter(filterId);
  }, [applyFilter, fetchMovies, fetchSeries, fetchAnime, moviesLoaded, seriesLoaded, animeLoaded]);

  // **FILTER BAR COMPONENT**
  const FilterBar = memo(() => {
    return (
      <>
        {/* PLATFORM FILTER SECTION LIKE SCREENSHOT */}
        <div className="mx-4 mt-[-1px] bg-[#242424] bg-opacity-90 rounded-[10px] my-2">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-5">
              {/* Netflix */}
              <button
                className={`flex flex-col items-center space-y-1 transition-all duration-200 ${
                  activeFilter === 'netflix' ? 'opacity-100 scale-105' : ''
                }`}
                onClick={() => handleFilterChange('netflix')}
                disabled={filterLoading && activeFilter === 'netflix'}
              >
                <div className="w-[40px] h-[40px] rounded-t-lg rounded-b-lg flex items-center justify-center overflow-hidden relative">
                  <img src={netflixIcon} alt="Netflix" className="w-full h-full object-cover" />
                  {filterLoading && activeFilter === 'netflix' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <LoadingDots size="xs" color="white" />
                    </div>
                  )}
                </div>
                <span className="text-white text-[8px]">Netflix</span>
              </button>

              {/* Prime Video */}
              <button
                className={`flex flex-col items-center space-y-1 transition-all duration-200 ${
                  activeFilter === 'amazon-prime' ? 'opacity-100 scale-105' : ''
                }`}
                onClick={() => handleFilterChange('amazon-prime')}
                disabled={filterLoading && activeFilter === 'amazon-prime'}
              >
                <div className="w-[40px] h-[40px] bg-[#00A8E1] rounded-t-lg rounded-b-lg flex items-center justify-center overflow-hidden relative">
                  <img src={primeVideoIcon} alt="Prime Video" className="w-full h-full object-cover" />
                  {filterLoading && activeFilter === 'amazon-prime' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <LoadingDots size="xs" color="white" />
                    </div>
                  )}
                </div>
                <span className="text-white text-[8px]">Prime</span>
              </button>

              {/* Anime */}
              <button
                className={`flex flex-col items-center space-y-1 transition-all duration-200 ${
                  activeFilter === 'anime' ? 'opacity-100 scale-105' : ''
                }`}
                onClick={() => handleFilterChange('anime')}
                disabled={filterLoading && activeFilter === 'anime'}
              >
                <div className="w-[40px] h-[40px] bg-orange-500 rounded-t-lg rounded-b-lg flex items-center justify-center p-0 overflow-hidden relative">
                  <img src={animeIcon} alt="Anime" className="w-full h-full object-cover" />
                  {filterLoading && activeFilter === 'anime' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <LoadingDots size="xs" color="white" />
                    </div>
                  )}
                </div>
                <span className="text-white text-[8px]">Anime</span>
              </button>

              {/* K Drama (Hollywood) / MX Player (Bollywood) */}
              {cinemaType === 'hollywood' ? (
                <button
                  className={`flex flex-col items-center space-y-1 transition-all duration-200 ${
                    activeFilter === 'kdrama' ? 'opacity-100 scale-105' : ''
                  }`}
                  onClick={() => handleFilterChange('kdrama')}
                  disabled={filterLoading && activeFilter === 'kdrama'}
                >
                  <div className="w-[40px] h-[40px] bg-gray-700 rounded-t-lg rounded-b-lg flex items-center justify-center overflow-hidden relative">
                    <img src={kDramaIcon} alt="K-Drama" className="w-full h-full object-cover" />
                    {filterLoading && activeFilter === 'kdrama' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <LoadingDots size="xs" color="white" />
                      </div>
                    )}
                  </div>
                  <span className="text-white text-[8px] whitespace-nowrap">K Drama</span>
                </button>
              ) : (
                <button
                  className={`flex flex-col items-center space-y-1 transition-all duration-200 ${
                    activeFilter === 'mxplayer' ? 'opacity-100 scale-105' : ''
                  }`}
                  onClick={() => handleFilterChange('mxplayer')}
                  disabled={filterLoading && activeFilter === 'mxplayer'}
                >
                  <div className="w-[40px] h-[40px] bg-gray-700 rounded-t-lg rounded-b-lg flex items-center justify-center overflow-hidden relative">
                    <img src={mxPlayerIcon} alt="MX Player" className="w-full h-full object-cover" />
                    {filterLoading && activeFilter === 'mxplayer' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <LoadingDots size="xs" color="white" />
                      </div>
                    )}
                  </div>
                  <span className="text-white text-[8px] whitespace-nowrap">MX Player</span>
                </button>
              )}
            </div>
            
            {/* Compact Cinema Toggle in right corner */}
            <div className="flex items-center">
              <CompactCinemaToggle cinemaType={cinemaType} setCinemaType={setCinemaType} />
            </div>
          </div>
        </div>

        {/* NAVIGATION BAR - HIDDEN ON MOBILE 
        <div className="hidden md:block bg-black bg-opacity-80 border-b border-gray-800">
          <div className="flex items-center justify-center px-4 py-3">
            <div className="flex items-center space-x-8">
              <button
                className={`text-sm font-medium transition-colors px-4 py-2 rounded-full ${
                  contentType === 'movies' 
                    ? 'bg-red-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => handleContentTypeChange('movies')}
              >
                Movies
              </button>
              <button
                className={`text-sm font-medium transition-colors px-4 py-2 rounded-full ${
                  contentType === 'series' 
                    ? 'bg-red-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => handleContentTypeChange('series')}
              >
                TV Shows
              </button>
              <button
                className={`text-sm font-medium transition-colors px-4 py-2 rounded-full ${
                  contentType === 'anime' 
                    ? 'bg-red-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => handleContentTypeChange('anime')}
              >
                Anime
              </button>
            </div>
          </div>
        </div>   */}

        {/* QUALITY & DUAL AUDIO FILTER BAR */}
        <div className="bg-black mt-[-5px] bg-opacity-70 ">
          <div className="overflow-x-auto scrollbar-hide px-4 py-2">
            <div className="flex items-center space-x-2 min-w-max">
              {/* All */}
                <button
                  className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                    activeFilter === 'all' 
                      ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                      : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                  }`}
                  onClick={() => handleFilterChange('all')}
                  disabled={filterLoading && activeFilter === 'all'}
                >
                  {filterLoading && activeFilter === 'all' ? (
                    <LoadingDots size="xs" color="white" />
                  ) : (
                    'All'
                  )}
                </button>

              {/* 1080p */}
              <button
                className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                  activeFilter === '1080p' 
                    ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                    : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                }`}
                onClick={() => handleFilterChange('1080p')}
                disabled={filterLoading && activeFilter === '1080p'}
              >
                {filterLoading && activeFilter === '1080p' ? (
                  <LoadingDots size="xs" color="white" />
                ) : (
                  '1080P'
                )}
              </button>

              {/* 4K */}
              <button
                className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                  activeFilter === '4k' 
                    ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                    : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                }`}
                onClick={() => handleFilterChange('4k')}
                disabled={filterLoading && activeFilter === '4k'}
              >
                {filterLoading && activeFilter === '4k' ? (
                  <LoadingDots size="xs" color="white" />
                ) : (
                  '4K'
                )}
              </button>

              {/* English */}
              <button
                className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                  activeFilter === 'english' 
                    ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                    : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                }`}
                onClick={() => handleFilterChange('english')}
                disabled={filterLoading && activeFilter === 'english'}
              >
                {filterLoading && activeFilter === 'english' ? (
                  <LoadingDots size="xs" color="white" />
                ) : (
                  'English'
                )}
              </button>

              {/* Dual Audio */}
              <button
                className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                  activeFilter === 'dual-audio' 
                    ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                    : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                }`}
                onClick={() => handleFilterChange('dual-audio')}
                disabled={filterLoading && activeFilter === 'dual-audio'}
              >
                {filterLoading && activeFilter === 'dual-audio' ? (
                  <LoadingDots size="xs" color="white" />
                ) : (
                  'Dual Audio'
                )}
              </button>

              {/* Bollywood-specific filters */}
              {cinemaType === 'bollywood' && (
                <>
                  {/* 720p */}
                  <button
                    className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                      activeFilter === '720p' 
                        ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                        : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                    }`}
                    onClick={() => handleFilterChange('720p')}
                    disabled={filterLoading && activeFilter === '720p'}
                  >
                    {filterLoading && activeFilter === '720p' ? (
                      <LoadingDots size="xs" color="white" />
                    ) : (
                      '720P'
                    )}
                  </button>

                  {/* 1080p 60FPS */}
                  <button
                    className={`w-24 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                      activeFilter === '1080p-60fps' 
                        ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                        : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                    }`}
                    onClick={() => handleFilterChange('1080p-60fps')}
                    disabled={filterLoading && activeFilter === '1080p-60fps'}
                  >
                    {filterLoading && activeFilter === '1080p-60fps' ? (
                      <LoadingDots size="xs" color="white" />
                    ) : (
                      '1080P 60FPS'
                    )}
                  </button>

                  {/* Punjabi */}
                  <button
                    className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                      activeFilter === 'punjabi' 
                        ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                        : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                    }`}
                    onClick={() => handleFilterChange('punjabi')}
                    disabled={filterLoading && activeFilter === 'punjabi'}
                  >
                    {filterLoading && activeFilter === 'punjabi' ? (
                      <LoadingDots size="xs" color="white" />
                    ) : (
                      'Punjabi'
                    )}
                  </button>

                  {/* Gujarati */}
                  <button
                    className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                      activeFilter === 'gujarati' 
                        ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                        : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                    }`}
                    onClick={() => handleFilterChange('gujarati')}
                    disabled={filterLoading && activeFilter === 'gujarati'}
                  >
                    {filterLoading && activeFilter === 'gujarati' ? (
                      <LoadingDots size="xs" color="white" />
                    ) : (
                      'Gujarati'
                    )}
                  </button>

                  {/* Marathi */}
                  <button
                    className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                      activeFilter === 'marathi' 
                        ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                        : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                    }`}
                    onClick={() => handleFilterChange('marathi')}
                    disabled={filterLoading && activeFilter === 'marathi'}
                  >
                    {filterLoading && activeFilter === 'marathi' ? (
                      <LoadingDots size="xs" color="white" />
                    ) : (
                      'Marathi'
                    )}
                  </button>

                  {/* Bengali */}
                  <button
                    className={`w-20 h-[30px] transition-colors rounded border flex items-center justify-center flex-shrink-0 ${
                      activeFilter === 'bengali' 
                        ? 'bg-[#242424] text-white border-[#242424] text-sm font-bold' 
                        : 'text-gray-300 border-white hover:text-white hover:border-gray-500 text-xs font-medium'
                    }`}
                    onClick={() => handleFilterChange('bengali')}
                    disabled={filterLoading && activeFilter === 'bengali'}
                  >
                    {filterLoading && activeFilter === 'bengali' ? (
                      <LoadingDots size="xs" color="white" />
                    ) : (
                      'Bengali'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* FILTER STATUS INFO 
        {activeFilter !== 'all' && (
          <div className="bg-black bg-opacity-70 border-b border-gray-800 px-4 py-2">
            <div className="flex items-center justify-center">
              {filterLoading ? (
                <span className="text-xs text-yellow-400 flex items-center gap-2">
                  <LoadingDots size="xs" color="yellow" />
                  Fetching from all content types...
                </span>
              ) : filteredContent.length > 0 ? (
                <div className="text-xs text-green-400 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span>✅ {filteredContent.length} items found</span>
                    <span className="bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      Cross-content filter
                    </span>
                  </div>
                  <div className="mt-1 flex gap-3 justify-center">
                    <span className="bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full">
                      {filteredContent.filter(item => item.contentType === 'movies').length} movies
                    </span>
                    <span className="bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full">
                      {filteredContent.filter(item => item.contentType === 'series').length} series
                    </span>
                    <span className="bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded-full">
                      {filteredContent.filter(item => item.contentType === 'anime').length} anime
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-500">
                  No results found
                </span> 
              )}  
            </div>
          </div>
        )}  */}
      </>
    );
  });
  FilterBar.displayName = 'FilterBar';

  // **OPTIMIZED INITIAL LOAD - Start with movies**
  useEffect(() => {
    // Only run once on mount - ensure we have initial content
    if (!moviesLoaded && !moviesLoading) {
      console.log('🎬 Initial load: fetching movies on component mount');
      fetchMovies().catch(console.error);
    }
  }, []); // Empty dependency array for mount-only effect

  // **SEPARATE EFFECT FOR CACHE STATS UPDATE**  
  useEffect(() => {
    // Initial update
    updateCacheStats();
    
    // Set up interval with longer delay to prevent frequent refreshing
    const statsInterval = setInterval(() => {
      try {
        updateCacheStats();
      } catch (error) {
        console.warn('Cache stats update failed:', error);
      }
    }, 30000); // Increased to 30 seconds to reduce instability
    
    return () => clearInterval(statsInterval);
  }, [updateCacheStats]); // Add updateCacheStats as dependency

  // Enhanced content detection function to include anime
  const isSeriesContent = (content) => {
    if (!content) return false;
    
    // First check the source table - this is the most reliable indicator
    if (content.sourceTable) {
      // For Bollywood content, be more careful about series detection
      if (content.sourceTable === 'bolly_series') {
        // Check if it has actual series indicators
        const hasSeasons = content.seasons && Object.keys(content.seasons).length > 0;
        const hasEpisodes = content.episodes && Array.isArray(content.episodes) && content.episodes.length > 0;
        const categories = Array.isArray(content.categories) ? content.categories.join(' ').toLowerCase() : 
                          (content.categories || '').toLowerCase();
        const hasSeriesKeywords = content.categories && (
          categories.includes('web series') ||
          categories.includes('tv series') ||
          categories.includes('series')
        );
        
        // Only treat as series if it has clear series indicators
        if (hasSeasons || hasEpisodes || hasSeriesKeywords) {
          console.log('🎬 Detected as Bollywood series:', content.title, { hasSeasons, hasEpisodes, hasSeriesKeywords });
          return true;
        } else {
          console.log('🎬 Bollywood item in series table but no series indicators, treating as movie:', content.title);
          return false;
        }
      }
      
      // For other content types, trust the source table
      return content.sourceTable === 'series' || content.sourceTable === 'anime';
    }
    
    // Check the contentType property (set by filters or content type)
    if (content.contentType) {
      return content.contentType === 'series' || content.contentType === 'anime';
    }
    
    // Check explicit series or anime flag
    if (content.isSeries === true || content.isAnime === true) return true;
    
    // For Bollywood content, check if we're in series content type mode
    if (content.cinemaType === 'bollywood') {
      // Only return true for series if we have clear series indicators
      return !!(content.seasons && Object.keys(content.seasons).length > 0) ||
             !!(content.episodes && Array.isArray(content.episodes));
    }
    
    // Check for seasons object (but only if it has substantial content)
    if (content.seasons && Object.keys(content.seasons).length > 0) {
      // Verify it's actually series data by checking for episodes
      const hasEpisodes = Object.values(content.seasons).some(season => 
        season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0
      );
      if (hasEpisodes) return true;
    }
    
    // Check for old season format (Season 1, Season 2, etc.)
    const hasSeasonKeys = Object.keys(content).some(key => 
      key.startsWith('Season ') || key.startsWith('season_')
    );
    if (hasSeasonKeys) return true;
    
    // Be more conservative with categories - only if explicitly marked as series
    if (content.categories && Array.isArray(content.categories)) {
      const hasSeriesCategory = content.categories.some(cat => 
        cat.toLowerCase() === 'series' || 
        cat.toLowerCase() === 'tv show' ||
        cat.toLowerCase() === 'anime' ||
        cat.toLowerCase().includes('tv series')
      );
      if (hasSeriesCategory) return true;
    }
    
    return false;
  };

  const handleContentSelect = useCallback((content) => {
    // Determine the actual source table based on where the content came from
    let actualSourceTable;
    
    // If content already has a sourceTable property (from our services), trust it but validate for Bollywood
    if (content.sourceTable) {
      actualSourceTable = content.sourceTable;
      
      // Special handling for Bollywood content - check if it's misclassified
      if (content.sourceTable === 'bolly_series') {
        const hasSeasons = content.seasons && Object.keys(content.seasons).length > 0;
        const hasEpisodes = content.episodes && Array.isArray(content.episodes) && content.episodes.length > 0;
        const categories = Array.isArray(content.categories) ? content.categories.join(' ').toLowerCase() : 
                          (content.categories || '').toLowerCase();
        const hasSeriesKeywords = content.categories && (
          categories.includes('web series') ||
          categories.includes('tv series') ||
          categories.includes('series')
        );
        
        // If it doesn't have series indicators, treat it as a movie
        if (!hasSeasons && !hasEpisodes && !hasSeriesKeywords) {
          actualSourceTable = 'bolly_movies';
          console.log('🎯 Overriding sourceTable from bolly_series to bolly_movies for:', content.title);
        } else {
          console.log('🎯 Confirmed as bolly_series for:', content.title);
        }
      } else {
        console.log('🎯 Using existing sourceTable:', content.sourceTable, 'for:', content.title);
      }
    } else if (cinemaType === 'bollywood') {
      // For Bollywood content without sourceTable, determine from current data source
      const isFromBollyMovies = allBollyMovies.some(item => item.id === content.id);
      const isFromBollySeries = allBollySeries.some(item => item.id === content.id);
      
      if (isFromBollyMovies) {
        actualSourceTable = 'bolly_movies';
      } else if (isFromBollySeries) {
        actualSourceTable = 'bolly_series';
      } else {
        // Fallback to current content type
        actualSourceTable = contentType === 'series' ? 'bolly_series' : 'bolly_movies';
      }
    } else {
      // For Hollywood content without sourceTable
      const isFromMovies = allMovies.some(item => item.id === content.id);
      const isFromSeries = allSeries.some(item => item.id === content.id);
      const isFromAnime = allAnime.some(item => item.id === content.id);
      
      if (isFromMovies) {
        actualSourceTable = 'movies';
      } else if (isFromSeries) {
        actualSourceTable = 'series';
      } else if (isFromAnime) {
        actualSourceTable = 'anime';
      } else {
        // Fallback to current content type
        actualSourceTable = contentType === 'anime' ? 'anime' : contentType === 'series' ? 'series' : 'movies';
      }
    }
    
    // Add cinema type information to the content so detail components know which service to use
    const enhancedContent = {
      ...content,
      cinemaType: cinemaType, // 'hollywood' or 'bollywood'
      sourceTable: actualSourceTable
    };
    
    console.log('🎯 Content selected:', {
      title: content.title,
      cinemaType: cinemaType,
      actualSourceTable: actualSourceTable,
      isSeriesContent: isSeriesContent(enhancedContent)
    });
    
    setSelectedMovie(enhancedContent);
  }, [cinemaType, contentType, allBollyMovies, allBollySeries, allMovies, allSeries, allAnime]);

  const handleSearchChange = useCallback((value) => {
    const previousValue = searchQuery;
    console.log('🔍 Search changed from:', previousValue, 'to:', value);
    
    setSearchQuery(value);
    
    // Reset displayed count when search changes
    if (value !== previousValue) {
      console.log('🔍 Search actually changed, resetting displayed count');
      setDisplayedCount(MOVIES_PER_PAGE);
    }
    
    // Keep search active if user is typing
    if (value && value.length >= CONFIG.SEARCH_MIN_LENGTH) {
      setIsSearchActive(true);
    }
  }, []);

  // Search activation handlers
  const handleSearchActivate = useCallback(() => {
    console.log('🔴 Real-time search ACTIVATED');
    setIsSearchActive(true);
  }, []);

  const handleSearchDeactivate = useCallback(() => {
    console.log('⚪ Real-time search DEACTIVATED');
    setIsSearchActive(false);
    // Optionally clear search results when deactivating
    // setSearchQuery('');
  }, []);

  const handleContentTypeChange = (newType) => {
    // Always reset filter when clicking content type (even if same type)
    setActiveFilter('all');
    setFilteredContent([]);
    setDisplayedCount(MOVIES_PER_PAGE);
    
    if (newType === contentType) {
      console.log(`📱 Clicked same content type (${newType}), filters cleared`);
      return;
    }
    
    setContentType(newType);
    setSearchQuery(''); // Clear search when switching types
    setIsSearchActive(false); // Deactivate search when switching content types
    console.log(`📱 Content type changed to ${newType}, search deactivated, filters reset`);
  };

  // Handle logo click - refresh everything
  const handleLogoClick = useCallback(() => {
    console.log('🏠 Logo clicked - refreshing everything');
    
    // Clear all states
    setSelectedMovie(null);
    setSearchQuery('');
    setIsSearchActive(false);
    setActiveFilter('all');
    setFilteredContent([]);
    setFilterLoading(false);
    setDisplayedCount(MOVIES_PER_PAGE);
    
    // Reset content type to movies if needed
    if (contentType !== 'movies') {
      setContentType('movies');
    }
    
    // Clear any selected content details
    setSelectedSeries(null);
    
    console.log('✅ All states cleared, app refreshed');
  }, [contentType, MOVIES_PER_PAGE]);

  // Get current content and loading state - memoized to prevent recreation
  const getCurrentContentAndState = useCallback(() => {
    // If a filter is active and we're loading, show loading state
    if (activeFilter !== 'all' && filterLoading) {
      return { content: [], loading: true, loaded: false };
    }
    
    // If a filter is active and we have filtered content, return filtered content
    if (activeFilter !== 'all' && filteredContent.length > 0) {
      return { content: filteredContent, loading: false, loaded: true };
    }
    
    // If a filter is active but no results found, show empty state
    if (activeFilter !== 'all' && !filterLoading && filteredContent.length === 0) {
      return { content: [], loading: false, loaded: true };
    }
    
    // First check cinema type, then content type
    if (cinemaType === 'bollywood') {
      // Return Bollywood content
      switch (contentType) {
        case 'movies':
          console.log('🎪 Returning Bollywood movies:', allBollyMovies.length, 'items');
          return { content: allBollyMovies, loading: bollyMoviesLoading, loaded: bollyMoviesLoaded };
        case 'series':
          console.log('🎪 Returning Bollywood series:', allBollySeries.length, 'items');
          return { content: allBollySeries, loading: bollySeriesLoading, loaded: bollySeriesLoaded };
        default:
          console.log('🎪 Returning Bollywood movies (default):', allBollyMovies.length, 'items');
          return { content: allBollyMovies, loading: bollyMoviesLoading, loaded: bollyMoviesLoaded };
      }
    } else {
      // Return Hollywood content
      switch (contentType) {
        case 'movies':
          console.log('🎬 Returning Hollywood movies:', allMovies.length, 'items');
          return { content: allMovies, loading: moviesLoading, loaded: moviesLoaded };
        case 'series':
          console.log('📺 Returning Hollywood series:', allSeries.length, 'items');
          return { content: allSeries, loading: seriesLoading, loaded: seriesLoaded };
        case 'anime':
          console.log('🎌 Returning anime:', allAnime.length, 'items');
          return { content: allAnime, loading: animeLoading, loaded: animeLoaded };
        default:
          console.log('🎬 Returning Hollywood movies (default):', allMovies.length, 'items');
          return { content: allMovies, loading: moviesLoading, loaded: moviesLoaded };
      }
    }
  }, [
    contentType, cinemaType, 
    allMovies, allSeries, allAnime, 
    allBollyMovies, allBollySeries,
    moviesLoading, seriesLoading, animeLoading, 
    bollyMoviesLoading, bollySeriesLoading,
    moviesLoaded, seriesLoaded, animeLoaded, 
    bollyMoviesLoaded, bollySeriesLoaded,
    activeFilter, filteredContent, filterLoading
  ]);

  // **OPTIMIZED: Use search results when searching, otherwise use grouped content**
  const getGroupedContent = useMemo(() => {
    const currentState = getCurrentContentAndState();
    const currentContent = currentState.content;
    
    // If searching, return search results (from database or cache)
    if (searchQuery.trim() && searchResults.length > 0) {
      return [{ 
        title: `Search Results (${searchResults.length})${searchError ? ' - From Cache' : ' - Live'}`, 
        items: searchResults 
      }];
    }
    
    // If searching but no results
    if (searchQuery.trim() && searchResults.length === 0 && !isSearching) {
      return [];
    }

    // If a filter is active, return filtered content in a single section
    if (activeFilter !== 'all' && filteredContent.length > 0) {
      const filterLabel = FILTERS.find(f => f.id === activeFilter)?.label || activeFilter;
      const movieCount = filteredContent.filter(item => item.contentType === 'movies').length;
      const seriesCount = filteredContent.filter(item => item.contentType === 'series').length;
      const animeCount = filteredContent.filter(item => item.contentType === 'anime').length;
      
      // New improved section title with clearer content type breakdown
      const contentBreakdown = [];
      if (movieCount > 0) contentBreakdown.push(`${movieCount} movies`);
      if (seriesCount > 0) contentBreakdown.push(`${seriesCount} series`);
      if (animeCount > 0) contentBreakdown.push(`${animeCount} anime`);
      
      const title = filterLabel; // Just show the filter name without count
      const subtitle = contentBreakdown.join(' • ');
      
      return [{ 
        title: title,
        subtitle: subtitle,
        items: filteredContent,
        icon: FILTERS.find(f => f.id === activeFilter)?.icon,
        showContentTypes: true // New flag to indicate we should show content type labels on cards
      }];
    }

    const sections = [];

    // Only create sections if we have content
    if (!currentContent || currentContent.length === 0) {
      return [];
    }

    // **REORGANIZED SECTIONS PER USER REQUEST**
    
    // 1. Trending Now (high-rated content + popular content)
    const trending = currentContent
      .filter(item => {
        // Check multiple rating sources and formats
        const rating = item.content?.rating || item.rating || item.imdbRating || item.tmdbRating;
        if (rating) {
          const numRating = parseFloat(rating);
          return numRating > 6.5; // Lowered threshold for more content
        }
        
        // Fallback: Use content with high view counts or recent additions as trending
        const isPopular = item.views > 1000 || 
                         item.likes > 100 || 
                         item.downloads > 50 ||
                         (item.categories && Array.isArray(item.categories) && item.categories.some(cat => 
                           cat && cat.toLowerCase && cat.toLowerCase().includes('popular') || 
                           cat && cat.toLowerCase && cat.toLowerCase().includes('trending') ||
                           cat && cat.toLowerCase && cat.toLowerCase().includes('hot')
                         )) ||
                         (item.categories && typeof item.categories === 'string' && (
                           item.categories.toLowerCase().includes('popular') ||
                           item.categories.toLowerCase().includes('trending') ||
                           item.categories.toLowerCase().includes('hot')
                         ));
        
        return isPopular;
      })
      .slice(0, 15); // Show more trending content
    
    // If we still don't have enough trending content, add recently added popular content
    if (trending.length < 10) {
      const recentPopular = currentContent
        .sort((a, b) => new Date(b.modifiedDate || b.date || 0) - new Date(a.modifiedDate || a.date || 0))
        .filter(item => !trending.includes(item)) // Don't duplicate
        .slice(0, 10 - trending.length);
      
      trending.push(...recentPopular);
    }
    
    console.log(`🔥 Trending section: Found ${trending.length} trending items for ${cinemaType} ${contentType}`);
    
    // Debug: Log categories type issues
    if (trending.length === 0) {
      const sampleItems = currentContent.slice(0, 3);
      console.log('🐛 Debug: Sample content categories types:', sampleItems.map(item => ({
        title: item.title,
        categoriesType: typeof item.categories,
        categoriesValue: item.categories,
        isArray: Array.isArray(item.categories)
      })));
    }
    
    if (trending.length > 0) {
      sections.push({ 
        title: `Trending ${cinemaType === 'bollywood' ? 'Bollywood' : ''} Now`, 
        items: trending, 
        showNumbers: true 
      });
    } else {
      // Ultimate fallback: Create trending from first 15 items if no other criteria met
      const fallbackTrending = currentContent.slice(0, 15);
      if (fallbackTrending.length > 0) {
        console.log(`🔥 Using fallback trending with ${fallbackTrending.length} items`);
        sections.push({ 
          title: `Popular ${cinemaType === 'bollywood' ? 'Bollywood' : ''} Content`, 
          items: fallbackTrending, 
          showNumbers: true 
        });
      }
    }

    // 2. Recently Added (based on modification date)
    const recentlyAdded = [...currentContent]
      .sort((a, b) => new Date(b.modifiedDate || b.date || 0) - new Date(a.modifiedDate || a.date || 0))
      .slice(0, 20);
    if (recentlyAdded.length > 0) {
      sections.push({ 
        title: `Recently Added ${cinemaType === 'bollywood' ? 'Bollywood' : ''}`, 
        items: recentlyAdded 
      });
    }

    // 3. Prime Video content
    const primeVideoContent = currentContent.filter(item => {
      if (item.categories && Array.isArray(item.categories)) {
        return item.categories.some(cat => 
          cat.toLowerCase().includes('prime') || 
          cat.toLowerCase().includes('amazon')
        );
      }
      return item.category && 
             (item.category.toLowerCase().includes('prime') || 
              item.category.toLowerCase().includes('amazon'));
    }).slice(0, 20);
    
    if (primeVideoContent.length > 0) {
      sections.push({
        title: 'Prime Video',
        items: primeVideoContent
      });
    }

    // 4. Netflix content
    const netflixContent = currentContent.filter(item => {
      if (item.categories && Array.isArray(item.categories)) {
        return item.categories.some(cat => 
          cat.toLowerCase().includes('netflix')
        );
      }
      return item.category && 
             item.category.toLowerCase().includes('netflix');
    }).slice(0, 20);
    
    if (netflixContent.length > 0) {
      sections.push({
        title: 'Netflix',
        items: netflixContent
      });
    }

    // 5. Other popular platforms (limited)
    const otherPlatforms = ['disney', 'hulu', 'hbo', 'apple'];
    otherPlatforms.forEach(platform => {
      const platformContent = currentContent.filter(item => {
        if (item.categories && Array.isArray(item.categories)) {
          return item.categories.some(cat => 
            cat.toLowerCase().includes(platform)
          );
        }
        return item.category && 
               item.category.toLowerCase().includes(platform);
      }).slice(0, 20);
      
      if (platformContent.length > 0) {
        const displayName = platform === 'disney' ? 'Disney+' : 
                           platform === 'hbo' ? 'HBO Max' : 
                           platform === 'apple' ? 'Apple TV+' : 
                           platform.charAt(0).toUpperCase() + platform.slice(1);
        sections.push({
          title: displayName,
          items: platformContent
        });
      }
    });

    // 6. Year-wise sections (2025, 2024, 2023)
    const years = [2025, 2024, 2023];
    years.forEach(year => {
      const yearContent = currentContent.filter(item => {
        // Check various possible date fields
        const releaseYear = item.releaseYear || item.year;
        const dateFromContent = item.content?.year;
        
        // Parse year from string if needed
        let itemYear = releaseYear || dateFromContent;
        if (typeof itemYear === 'string') {
          itemYear = parseInt(itemYear);
        }
        
        return itemYear === year;
      }).slice(0, 20);
      
      if (yearContent.length > 0) {
        sections.push({
          title: `${year} Latest`,
          items: yearContent
        });
      }
    });

    return sections;
  }, [
    searchQuery, searchResults, isSearching, contentType, getCurrentContentAndState, searchError, activeFilter, filteredContent,
    // Add data dependencies to trigger re-computation when data loads
    allMovies, allSeries, allAnime, allBollyMovies, allBollySeries,
    moviesLoaded, seriesLoaded, animeLoaded, bollyMoviesLoaded, bollySeriesLoaded,
    cinemaType
  ]);

  // **MINIMAL ALL CONTENT SECTION WITH INFINITE SCROLL**
  const AllContentSection = memo(() => {
    const { content: currentContent, loading } = getCurrentContentAndState();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="w-full max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <CardSkeleton key={i} className="w-full" />
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    if (currentContent.length === 0) return null;

    // Display ALL content - no pagination limit
    const displayedContent = currentContent; // Show all content
    console.log('🧮 Displaying ALL content:', {
      totalContentLength: currentContent.length,
      displayedContentLength: displayedContent.length,
      firstItem: displayedContent[0]?.title || 'None',
      lastItem: displayedContent[displayedContent.length - 1]?.title || 'None'
    });

    return (
      <div className="mb-8 px-4 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            All {cinemaType === 'hollywood' ? 'Hollywood' : 'Bollywood'} {contentType === 'movies' ? 'Movies' : contentType === 'series' ? 'TV Shows' : 'Anime'}
          </h2>
          {/* <div className="text-sm text-gray-400">
            Showing all {displayedContent.length} items from cache
          </div> */}
        </div>
        
        {/* Clean movie grid - displays ALL content */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 mb-8">
          {displayedContent.map((content, idx) => (
            <MovieCard
              key={content.id || `${content.title}-${idx}`}
              movie={content}
              onClick={handleContentSelect}
              index={idx}
              useOptimizedImage={true}
            />
          ))}
        </div>

        {/* Completion message */}
        <div className="flex justify-center mt-8">
          {/* <div className="px-6 py-3 bg-gray-800/50 text-gray-400 rounded-lg text-sm">
            ✅ All {currentContent.length} items from cache displayed
          </div> */}
        </div>
      </div>
    );
  });
  AllContentSection.displayName = 'AllContentSection';

  // Enhanced render detail component to handle anime as series
  const renderDetailComponent = () => {
    if (!selectedMovie) {
      return null;
    }
    
    const isSeries = isSeriesContent(selectedMovie);
    
    // Debug logging for content type detection
    console.log('🔍 Content type detection:', {
      title: selectedMovie.title,
      contentType: selectedMovie.contentType,
      isSeries: isSeries,
      id: selectedMovie.id
    });

    try {
      if (isSeries) {
        console.log('📺 Rendering SeriesDetail for:', selectedMovie.title);
        return (
          <div className="animate-fadeIn">
            <SeriesDetail series={selectedMovie} onClose={() => setSelectedMovie(null)} />
          </div>
        );
      } else {
        console.log('🎬 Rendering MovieDetails for:', selectedMovie.title);
        if (!MovieDetails) {
          console.error('❌ MovieDetails component not found');
          return (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fadeIn">
              <div className="bg-white text-black p-8 rounded">
                <h2>Movie Details</h2>
                <p>Movie: {selectedMovie.title}</p>
                <p>Error: MovieDetails component not available</p>
                <button 
                  onClick={() => setSelectedMovie(null)}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                >
                  Close
                </button>
              </div>
            </div>
          );
        }
        
        return (
          <div className="animate-fadeIn">
            <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
          </div>
        );
      }
    } catch (error) {
      console.error('💥 Error rendering detail component:', error);
      return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fadeIn">
          <div className="bg-white text-black p-8 rounded">
            <h2>Error</h2>
            <p>Failed to render detail view for: {selectedMovie.title}</p>
            <p>Error: {error.message}</p>
            <button 
              onClick={() => setSelectedMovie(null)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
  };

  // Memoize the current content and state to prevent excessive recalculations
  const { content: currentContent, loading: isCurrentLoading } = useMemo(() => {
    return getCurrentContentAndState();
  }, [getCurrentContentAndState]);
  
  const groupedContent = getGroupedContent;

  // Memoize the main content to prevent re-renders when selectedMovie changes
  const MainContent = useMemo(() => (
    <>
      {/* CONTENT SECTIONS with performance indicators - Hero section removed */}
      <div>
        {isCurrentLoading ? (
          <TabLoadingState 
            contentType={contentType} 
            cacheStats={cacheStats[contentType] ? { [contentType]: cacheStats[contentType] } : null} 
          />
        ) : (
          <>
            {groupedContent.length > 0 && groupedContent.map((section, index) => {
              // If this is search results or filter results, use the grid layout
              const isSearchResults = searchQuery && section.title.includes('Search Results');
              const isFilterResults = activeFilter !== 'all' && filteredContent.length > 0;
              
              return (isSearchResults || isFilterResults) ? (
                <GridRow
                  key={`${contentType}-${section.title}-${index}`}
                  title={section.title}
                  subtitle={section.subtitle}
                  items={section.items}
                  showNumbers={section.showNumbers}
                  showContentTypes={section.showContentTypes}
                  onContentSelect={handleContentSelect}
                />
              ) : (
                <ScrollableRow
                  key={`${contentType}-${section.title}-${index}`}
                  title={section.title}
                  subtitle={section.subtitle}
                  items={section.items}
                  showNumbers={section.showNumbers}
                  showContentTypes={section.showContentTypes}
                  onContentSelect={handleContentSelect}
                />
              );
            })}

            {!searchQuery && <AllContentSection />}

            {/* No results state removed per user request */}

            {/* Empty state removed per user request */}
          </>
        )}
      </div>
    </>
  ), [
    isCurrentLoading, 
    groupedContent,
    contentType,
    cacheStats,
    isSearching,
    searchError,
    currentContent,
    handleContentSelect,
    searchQuery,
    setSearchQuery
  ]);

  // Mobile device detection check - block desktop access
  if (!isMobileDevice) {
    return <DesktopBlockingPage />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* MODERN HEADER LIKE SCREENSHOT */}
      <header 
        ref={headerRef} 
        className="bg-black bg-opacity-95 backdrop-blur-sm "
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
           <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M34.95 10.3358L21.2 2.81241C20.8326 2.60941 20.4197 2.50293 20 2.50293C19.5803 2.50293 19.1674 2.60941 18.8 2.81241L5.05 10.339C4.65733 10.5538 4.32954 10.8702 4.10086 11.2549C3.87219 11.6397 3.75102 12.0789 3.75 12.5265V27.4702C3.75102 27.9178 3.87219 28.357 4.10086 28.7417C4.32954 29.1265 4.65733 29.4429 5.05 29.6577L18.8 37.1843C19.1674 37.3873 19.5803 37.4938 20 37.4938C20.4197 37.4938 20.8326 37.3873 21.2 37.1843L34.95 29.6577C35.3427 29.4429 35.6705 29.1265 35.8991 28.7417C36.1278 28.357 36.249 27.9178 36.25 27.4702V12.528C36.2498 12.0796 36.129 11.6395 35.9003 11.2538C35.6716 10.8681 35.3434 10.5511 34.95 10.3358ZM20 4.99991L32.5531 11.8749L20 18.7499L7.44688 11.8749L20 4.99991ZM6.25 14.0624L18.75 20.903V34.3077L6.25 27.4718V14.0624ZM21.25 34.3077V20.9093L33.75 14.0624V27.4655L21.25 34.3077Z" fill="white"/>
</svg>

          </div>

          {/* Centered Search Bar */}
          <div className="w-[290px] mx-4">
            <RealTimeSearchBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              searchResults={searchResults}
              isSearching={isSearching}
              suggestions={suggestions}
              searchHistory={searchHistory}
              onResultSelect={handleContentSelect}
              searchError={searchError}
              isSearchActive={isSearchActive}
              onSearchActivate={handleSearchActivate}
              onSearchDeactivate={handleSearchDeactivate}
            />
          </div>

          {/* User Profile Placeholder */}
          {/* <div className="w-10 h-10 bg-gray-700 rounded-full"></div> */}
        </div>
      </header>

      {/* PROMINENT CINEMA TOGGLE - RIGHT AFTER HEADER */}
      {/* FILTER BAR - Only show when not searching */}
      {!searchQuery && <FilterBar />}

      {/* MAIN CONTENT */}
      <main className={`${selectedMovie ? 'pb-8' : 'pb-20 md:pb-8'}`}>
        {MainContent}
      </main>

      {selectedMovie && renderDetailComponent()}
      
      {/* Custom Exit Confirmation Modal */}
      <ExitConfirmationModal 
        showExitConfirmation={showExitConfirmation}
        setShowExitConfirmation={setShowExitConfirmation}
      />
      
      {/* Only show BottomBar when no movie/series is selected */}
      {!selectedMovie && (
        <BottomBar 
          contentType={contentType}
          onContentTypeChange={handleContentTypeChange}
          moviesLoading={moviesLoading}
          seriesLoading={seriesLoading}
          animeLoading={animeLoading}
          cacheStats={cacheStats}
        />
      )}

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

// Main component with memo
const MemoizedHome = memo(Home);
MemoizedHome.displayName = 'Home';

export default MemoizedHome;
