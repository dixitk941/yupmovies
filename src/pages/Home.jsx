import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Film, Tv, Play, Star, Grid, List, Filter } from 'lucide-react';
import { platforms } from '../data/mockData';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';
import SeriesDetail from './SeriesDetail';
import { SearchSkeleton, CardSkeleton } from '../components/Skeleton';

// **OPTIMIZED IMPORTS WITH REAL-TIME DATABASE SEARCH**
import { getAllMovies, searchMovies, searchMoviesDB, getCacheStats as getMovieStats } from '../services/movieService';
import { getAllSeries, searchSeries, searchSeriesDB, getSeriesCacheStats } from '../services/seriesService';
import { getAllAnime, searchAnime, searchAnimeDB, getAnimeCacheStats } from '../services/animeService';

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
      // Search all content types simultaneously
      const searchPromises = [
        searchMoviesDB(query, { 
          limit: 15,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ ...item, contentType: 'movies' }))),
        
        searchSeriesDB(query, { 
          limit: 15,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ ...item, contentType: 'series' }))),
        
        searchAnimeDB(query, { 
          limit: 15,
          signal: searchAbortController.current.signal 
        }).then(results => results.map(item => ({ ...item, contentType: 'anime' })))
      ];
      
      logger.log('🔄 Searching movies, series, and anime simultaneously...');
      const [movieResults, seriesResults, animeResults] = await Promise.all(searchPromises);
      
      // Combine and sort results by relevance/date
      const allResults = [...movieResults, ...seriesResults, ...animeResults]
        .sort((a, b) => {
          // Sort by modified date (newest first)
          const dateA = new Date(a.modifiedDate || a.modified_date || a.date || 0);
          const dateB = new Date(b.modifiedDate || b.modified_date || b.date || 0);
          return dateB - dateA;
        })
        .slice(0, 30); // Limit total results to 30
      
      logger.log(`✅ GLOBAL SEARCH: found ${allResults.length} results (${movieResults.length} movies, ${seriesResults.length} series, ${animeResults.length} anime)`);
      
      // Debug: Log the first few results to see their structure
      if (allResults.length > 0) {
        logger.log('🔍 Sample search result structure:', {
          firstResult: allResults[0],
          hasImage: !!(allResults[0]?.poster || allResults[0]?.featuredImage || allResults[0]?.featured_image),
          imageUrl: allResults[0]?.poster || allResults[0]?.featuredImage || allResults[0]?.featured_image
        });
      }
      
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
  }, [isSearchActive]); // Include isSearchActive in dependencies
  
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
    setShowDropdown(isFocused && isSearchActive && (searchResults.length > 0 || isSearching || searchQuery.length >= CONFIG.SEARCH_MIN_LENGTH));
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

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative group">
        <input
          type="text"
          placeholder="Search movies, series, anime..."
          className={`bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors duration-200 ${
            isFocused ? 'w-80 border-red-500' : 'w-64'
          }`}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
        />
        
        {/* Simple Search Icon */}
        <div className={`absolute left-4 top-3.5 text-gray-400 ${isFocused ? 'text-red-500' : ''}`}>
          <Search size={16} />
        </div>
        
        {/* Simple Clear Button */}
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              setShowDropdown(false);
            }}
            className="absolute right-4 top-3.5 text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Simple Search Dropdown */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden z-50"
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
                        <div className="px-3 py-2 bg-gray-800 text-gray-300 text-xs font-medium border-b border-gray-700">
                          MOVIES ({groupedResults.movies.length})
                        </div>
                        {groupedResults.movies.slice(0, 3).map((result, index) => (
                          <button
                            key={`movie-${result.id || index}`}
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
                                  logger.log('🖼️ Movie image load error for:', result.title, 'URL:', result.poster || result.featuredImage || result.featured_image);
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium truncate">
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
                        <div className="px-3 py-2 bg-gray-800 text-gray-300 text-xs font-medium border-b border-gray-700">
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
          ) : searchQuery.length >= CONFIG.SEARCH_MIN_LENGTH ? (
            <div className="p-4 text-center">
              <p className="text-gray-400 text-sm">No results found for "{searchQuery}"</p>
              <p className="text-gray-500 text-xs mt-1">Try searching with different keywords</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});
RealTimeSearchBar.displayName = 'RealTimeSearchBar';

// Memoized sub-components for better performance with optimized images
const MovieSkeleton = memo(() => (
  <div 
    className="animate-pulse bg-gray-800 rounded-lg overflow-hidden flex-shrink-0"
    style={{ width: '112px', aspectRatio: '2/3' }}
  >
    <div className="w-full h-full bg-gray-700"></div>
  </div>
));
MovieSkeleton.displayName = 'MovieSkeleton';

const TabLoadingState = memo(({ contentType, cacheStats }) => (
  <div className="space-y-8 px-4 md:px-8">
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <CardSkeleton key={i} className="w-full" />
          ))}
        </div>
        {cacheStats && (
          <div className="text-xs text-gray-500 mt-2">
            {cacheStats.totalMovies > 0 && `${cacheStats.totalMovies} items cached`}
            {cacheStats.isLoading && ' • Loading more...'}
          </div>
        )}
      </div>
    </div>
  </div>
));
TabLoadingState.displayName = 'TabLoadingState';

// **CLEAN MINIMAL SCROLLABLE ROW**
const ScrollableRow = memo(({ title, items, showNumbers = false, onContentSelect }) => {
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
        <div className="text-gray-500">Loading section...</div>
      </div>
    );
  }

  return (
    <div className="mb-8" ref={intersectionRef}>
      <div className="mb-4 px-4 md:px-8">
        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>
      </div>
      
      <div
        ref={scrollRef}
        className="flex space-x-3 overflow-x-auto scrollbar-hide pb-4 px-4 md:px-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((content, idx) => (
          <div key={content.id || `${content.title}-${idx}`} className="flex-shrink-0">
            <MovieCard
              movie={content}
              onClick={onContentSelect}
              index={idx}
              showNumber={showNumbers}
              useOptimizedImage={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
ScrollableRow.displayName = 'ScrollableRow';

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
          className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-colors ${
            contentType === 'movies' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => onContentTypeChange('movies')}
        >
          <span>🎬</span>
          <span className="font-medium">Movies</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-colors ${
            contentType === 'series' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => onContentTypeChange('series')}
        >
          <span>📺</span>
          <span className="font-medium">TV Shows</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-colors ${
            contentType === 'anime' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
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
        className={`flex flex-col items-center p-2 ${
          contentType === 'movies' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={() => onContentTypeChange('movies')}
      >
        <span className="text-xs mt-1">Movies</span>
      </button>
      <button
        className={`flex flex-col items-center p-2 ${
          contentType === 'series' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={() => onContentTypeChange('series')}
      >
        <span className="text-xs mt-1">Series</span>
      </button>
      <button
        className={`flex flex-col items-center p-2 ${
          contentType === 'anime' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={() => onContentTypeChange('anime')}
      >
        <span className="text-xs mt-1">Anime</span>
      </button>
    </nav>
  </div>
));
BottomBar.displayName = 'BottomBar';

function Home() {
  const [contentType, setContentType] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false); // New state for search activation
  
  // **OPTIMIZED BATCH LOADING STATE**
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [allAnime, setAllAnime] = useState([]);
  
  // Individual loading states
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [animeLoading, setAnimeLoading] = useState(false);
  
  // Track which data has been fetched
  const [moviesLoaded, setMoviesLoaded] = useState(false);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [animeLoaded, setAnimeLoaded] = useState(false);
  
  // Cache statistics
  const [cacheStats, setCacheStats] = useState({
    movies: 0,
    series: 0,
    anime: 0
  });
  
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);
  
  // **PREVENT MULTIPLE SIMULTANEOUS FETCHES**
  const fetchingRef = useRef({
    movies: false,
    series: false,
    anime: false
  });

  // **GLOBAL REAL-TIME SEARCH WITH ACTIVATION CONTROL**
  const { 
    searchResults, 
    isSearching, 
    suggestions, 
    searchHistory,
    searchError
  } = useGlobalRealTimeSearch(searchQuery, isSearchActive);

  // **OPTIMIZED PAGINATION**
  const MOVIES_PER_PAGE = 20; // Changed from CONFIG.ITEMS_PER_PAGE (100) to 20 as requested

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
      setAllMovies(movies);
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
      setAllSeries(series);
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
      setAllAnime(anime);
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

  // **BATCH LOADING ON CONTENT TYPE CHANGE**
  useEffect(() => {
    setCurrentPage(1); // Reset pagination when switching types
    
    // Use refs to check current state to avoid stale closures
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
  }, [contentType, fetchMovies, fetchSeries, fetchAnime]); // Keep only necessary dependencies

  // **OPTIMIZED INITIAL LOAD - Start with movies**
  useEffect(() => {
    // Only run once on mount
    if (!moviesLoaded && !moviesLoading) {
      fetchMovies().catch(console.error);
    }
  }, [fetchMovies]); // Add fetchMovies as dependency since it's now defined above

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
    
    // Check explicit series or anime flag
    if (content.isSeries === true || content.isAnime === true) return true;
    
    // Check for seasons object
    if (content.seasons && Object.keys(content.seasons).length > 0) return true;
    
    // Check for old season format (Season 1, Season 2, etc.)
    const hasSeasonKeys = Object.keys(content).some(key => 
      key.startsWith('Season ') || key.startsWith('season_')
    );
    if (hasSeasonKeys) return true;
    
    // Check categories for series/anime indicator
    if (content.categories && Array.isArray(content.categories)) {
      const hasSeriesCategory = content.categories.some(cat => 
        cat.toLowerCase().includes('series') || 
        cat.toLowerCase().includes('show') ||
        cat.toLowerCase().includes('anime')
      );
      if (hasSeriesCategory) return true;
    }
    
    return false;
  };

  const handleContentSelect = useCallback((content) => {
    setSelectedMovie(content);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setCurrentPage(1);
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
    if (newType === contentType) return;
    
    setContentType(newType);
    setSearchQuery(''); // Clear search when switching types
    setIsSearchActive(false); // Deactivate search when switching content types
    console.log(`📱 Content type changed to ${newType}, search deactivated`);
  };

  // Get current content and loading state - memoized to prevent recreation
  const getCurrentContentAndState = useCallback(() => {
    switch (contentType) {
      case 'movies':
        return { content: allMovies, loading: moviesLoading, loaded: moviesLoaded };
      case 'series':
        return { content: allSeries, loading: seriesLoading, loaded: seriesLoaded };
      case 'anime':
        return { content: allAnime, loading: animeLoading, loaded: animeLoaded };
      default:
        return { content: allMovies, loading: moviesLoading, loaded: moviesLoaded };
    }
  }, [contentType, allMovies, allSeries, allAnime, moviesLoading, seriesLoading, animeLoading, moviesLoaded, seriesLoaded, animeLoaded]);

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

    const sections = [];

    // Only create sections if we have content
    if (!currentContent || currentContent.length === 0) {
      return [];
    }

    // **REORGANIZED SECTIONS PER USER REQUEST**
    
    // 1. Trending Now (high-rated content)
    const trending = currentContent
      .filter(item => {
        const rating = item.content?.rating || item.rating;
        return rating && parseFloat(rating) > 7;
      })
      .slice(0, 20); // Changed to 20 as requested
    if (trending.length > 0) {
      sections.push({ title: 'Trending Now', items: trending, showNumbers: true });
    }

    // 2. Recently Added (based on modification date)
    const recentlyAdded = [...currentContent]
      .sort((a, b) => new Date(b.modifiedDate || b.date || 0) - new Date(a.modifiedDate || a.date || 0))
      .slice(0, 20);
    if (recentlyAdded.length > 0) {
      sections.push({ title: 'Recently Added', items: recentlyAdded });
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
  }, [searchQuery, searchResults, isSearching, contentType, getCurrentContentAndState, searchError]);

  // **MINIMAL ALL CONTENT SECTION**
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

    const totalPages = Math.ceil(currentContent.length / MOVIES_PER_PAGE);
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    const endIndex = startIndex + MOVIES_PER_PAGE;
    const paginatedContent = currentContent.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="mb-8 px-4 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            All {contentType === 'movies' ? 'Movies' : contentType === 'series' ? 'TV Shows' : 'Anime'}
          </h2>
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, currentContent.length)} of {currentContent.length}
          </div>
        </div>
        
        {/* Clean movie grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 mb-8">
          {paginatedContent.map((content, idx) => (
            <MovieCard
              key={content.id || `${content.title}-${startIndex + idx}`}
              movie={content}
              onClick={handleContentSelect}
              index={startIndex + idx}
              useOptimizedImage={true}
            />
          ))}
        </div>

        {/* Simple pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className={`px-4 py-2 rounded text-sm ${
                currentPage === 1 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Previous
            </button>
            
            <div className="flex items-center justify-center bg-gray-800 rounded px-4 py-2">
              <span className="text-sm text-white">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            <button
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className={`px-4 py-2 rounded text-sm ${
                currentPage === totalPages 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Next
            </button>
          </div>
        )}
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

    try {
      if (isSeries) {
        return (
          <div className="animate-fadeIn">
            <SeriesDetail series={selectedMovie} onClose={() => setSelectedMovie(null)} />
          </div>
        );
      } else {
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
            {groupedContent.length > 0 && groupedContent.map((section, index) => (
              <ScrollableRow
                key={`${contentType}-${section.title}-${index}`}
                title={section.title}
                items={section.items}
                showNumbers={section.showNumbers}
                onContentSelect={handleContentSelect}
              />
            ))}

            {!searchQuery && <AllContentSection />}

            {/* Enhanced No Results State */}
            {searchQuery && groupedContent.length === 0 && !isSearching && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-400 text-center mb-2">No results found</p>
                <p className="text-gray-500 text-sm text-center max-w-md">
                  We couldn't find any {contentType} matching "{searchQuery}".
                  {searchError && " Database search failed, using cached results."}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </button>
                  {searchError && (
                    <div className="px-4 py-2 bg-orange-900/50 text-orange-300 rounded text-sm">
                      ⚠️ Using cached data
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Empty State */}
            {groupedContent.length === 0 && currentContent.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-6xl mb-4">😕</div>
                <p className="text-gray-400 text-center mb-2">No content available</p>
                <p className="text-gray-500 text-sm text-center max-w-md">
                  We couldn't find any {contentType} to display.
                </p>
                <div className="mt-4 text-xs text-gray-600">
                  Cache Status: {cacheStats[contentType] || 0} items cached
                </div>
              </div>
            )}
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* SIMPLE HEADER */}
      <header 
        ref={headerRef} 
        className="fixed top-0 w-full bg-black bg-opacity-95 backdrop-blur-sm z-50 border-b border-gray-800"
      >
        <div className="flex items-center justify-center px-4 md:px-8 py-4">
          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-6 mr-8">
            <button
              className={`text-sm font-medium transition-colors px-3 py-1 ${
                contentType === 'movies' ? 'text-red-500' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => handleContentTypeChange('movies')}
            >
              Movies
            </button>
            <button
              className={`text-sm font-medium transition-colors px-3 py-1 ${
                contentType === 'series' ? 'text-red-500' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => handleContentTypeChange('series')}
            >
              TV Shows
            </button>
            <button
              className={`text-sm font-medium transition-colors px-3 py-1 ${
                contentType === 'anime' ? 'text-red-500' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => handleContentTypeChange('anime')}
            >
              Anime
            </button>
          </div>

          {/* Centered Search Bar */}
          <div className="flex-1 flex justify-center max-w-2xl mx-auto">
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
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className={`pt-24 ${selectedMovie ? 'pb-8' : 'pb-20 md:pb-8'}`}>
        {MainContent}
      </main>

      {selectedMovie && renderDetailComponent()}
      
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

      <style jsx>{`
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
