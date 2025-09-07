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

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative group">
        <input
          type="text"
          placeholder="Search movies, series, anime..."
          className={`w-full h-[40px] bg-gray-900/80 backdrop-blur-sm border-2 rounded-xl px-12 text-white placeholder-gray-400 focus:outline-none transition-all duration-300 ${
            isFocused 
              ? 'border-red-500 bg-gray-900 shadow-lg shadow-red-500/20' 
              : 'border-gray-700 hover:border-gray-600'
          }`}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
        />
        
        {/* Enhanced Search Icon */}
        <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
          isFocused ? 'text-red-500' : 'text-gray-400 group-hover:text-gray-300'
        }`}>
          <Search size={18} />
        </div>
        
        {/* Enhanced Clear Button */}
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              setShowDropdown(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
          >
            <X size={16} />
          </button>
        )}

        {/* Search status indicator */}
        {isSearching && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
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
          ) : searchQuery.length >= CONFIG.SEARCH_MIN_LENGTH ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-500" />
              </div>
              <p className="text-gray-400 text-base font-medium mb-2">No results found for "{searchQuery}"</p>
              <p className="text-gray-500 text-sm">Try searching with different keywords</p>
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
  
  // **OPTIMIZED PAGINATION - Load More Approach**
  const MOVIES_PER_PAGE = 20; // Items to load per batch
  const [displayedCount, setDisplayedCount] = useState(MOVIES_PER_PAGE); // How many items to show
  
  // **OPTIMIZED BATCH LOADING STATE**
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [allAnime, setAllAnime] = useState([]);
  
  // Individual loading states
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [animeLoading, setAnimeLoading] = useState(false);
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredContent, setFilteredContent] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  
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
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);
  
  // **PREVENT MULTIPLE SIMULTANEOUS FETCHES**
  const fetchingRef = useRef({
    movies: false,
    series: false,
    anime: false
  });
  const prevContentTypeRef = useRef(contentType);
  const pageRef = useRef(1);

  // Reset displayed count when content type changes
  useEffect(() => {
    if (prevContentTypeRef.current !== contentType) {
      console.log('� Content type changed, resetting displayed count');
      setDisplayedCount(MOVIES_PER_PAGE);
      prevContentTypeRef.current = contentType;
    }
  }, [contentType]);

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
  }, [contentType]); // Only depend on contentType, not the fetch functions

  // **FILTER FUNCTIONS - Direct database queries**
  const applyFilter = useCallback(async (filterId) => {
    if (filterId === 'all') {
      setActiveFilter('all');
      setFilteredContent([]);
      setDisplayedCount(MOVIES_PER_PAGE);
      return;
    }

    setFilterLoading(true);
    setActiveFilter(filterId);
    
    try {
      let results = [];
      
      // Add loading indicator to the specific filter
      console.log(`🔍 Fetching ${filterId} content from database...`);
      
      switch (filterId) {
        case 'netflix':
          // Search for Netflix content in categories
          const [netflixMovies, netflixSeries, netflixAnime] = await Promise.all([
            searchMoviesDB('netflix', { genre: 'netflix', limit: 200 }),
            searchSeriesDB('netflix', { genre: 'netflix', limit: 200 }),
            searchAnimeDB('netflix', { genre: 'netflix', limit: 200 })
          ]);
          console.log('📊 Netflix search results:', {
            movies: netflixMovies.length,
            series: netflixSeries.length, 
            anime: netflixAnime.length
          });
          results = [
            ...netflixMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...netflixSeries.map(item => ({ ...item, contentType: 'series' })),
            ...netflixAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        case 'amazon-prime':
          // Search for Amazon Prime content in categories
          const [primeMovies, amazonMovies, primeSeries, amazonSeries, primeAnime, amazonAnime] = await Promise.all([
            searchMoviesDB('prime', { genre: 'prime', limit: 100 }),
            searchMoviesDB('amazon', { genre: 'amazon', limit: 100 }),
            searchSeriesDB('prime', { genre: 'prime', limit: 100 }),
            searchSeriesDB('amazon', { genre: 'amazon', limit: 100 }),
            searchAnimeDB('prime', { genre: 'prime', limit: 100 }),
            searchAnimeDB('amazon', { genre: 'amazon', limit: 100 })
          ]);
          results = [
            ...primeMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...amazonMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...primeSeries.map(item => ({ ...item, contentType: 'series' })),
            ...amazonSeries.map(item => ({ ...item, contentType: 'series' })),
            ...primeAnime.map(item => ({ ...item, contentType: 'anime' })),
            ...amazonAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        case 'anime':
          // Get all anime content
          const animeContent = await getAllAnime(500);
          results = animeContent.map(item => ({ ...item, contentType: 'anime' }));
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
            console.log('🔄 Network failed, filtering cached data for 720p content...');
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = item.categories || '';
              return categories.toLowerCase().includes('720p');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allMovies.includes(item) ? 'movies' : 
                          allSeries.includes(item) ? 'series' : 'anime'
            }));
            
            console.log('📊 Cached 720p results:', filteredFromCache.length);
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
            console.log('🔄 Network failed, filtering cached data for 1080p content...');
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = item.categories || '';
              return categories.toLowerCase().includes('1080p');
            });
            
            results = filteredFromCache.map(item => ({
              ...item,
              contentType: allMovies.includes(item) ? 'movies' : 
                          allSeries.includes(item) ? 'series' : 'anime'
            }));
            
            console.log('📊 Cached 1080p results:', filteredFromCache.length);
          }
          break;
        
        case 'english':
          // Search for English content in categories
          const [englishMovies, englishSeries, englishAnime] = await Promise.all([
            searchMoviesDB('english', { genre: 'english', limit: 200 }),
            searchSeriesDB('english', { genre: 'english', limit: 200 }),
            searchAnimeDB('english', { genre: 'english', limit: 200 })
          ]);
          results = [
            ...englishMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...englishSeries.map(item => ({ ...item, contentType: 'series' })),
            ...englishAnime.map(item => ({ ...item, contentType: 'anime' }))
          ];
          break;
        
        case 'dual-audio':
          // Try direct database query first, fallback to cached data if network fails
          console.log('🔍 Searching for Dual Audio content...');
          
          try {
            const { default: supabase } = await import('../services/supabaseClient.js');
            
            const [dualMoviesQuery, dualSeriesQuery, dualAnimeQuery] = await Promise.all([
              supabase
                .from('movies')
                .select('*')
                .ilike('categories', '%dual audio%')
                .eq('status', 'publish')
                .order('modified_date', { ascending: false })
                .limit(200),
              supabase
                .from('series')
                .select('*')
                .ilike('categories', '%dual audio%')
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
            console.log('🔄 Network failed, filtering cached data for Dual Audio content...');
            
            // Filter from currently loaded content (cache)
            const allCachedContent = [...allMovies, ...allSeries, ...allAnime];
            const filteredFromCache = allCachedContent.filter(item => {
              const categories = item.categories || '';
              return categories.toLowerCase().includes('dual audio');
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
          // Search for Korean drama content in categories
          const [koreanMovies, kdramaMovies, koreanSeries, kdramaSeries] = await Promise.all([
            searchMoviesDB('korean', { genre: 'korean', limit: 100 }),
            searchMoviesDB('kdrama', { genre: 'kdrama', limit: 100 }),
            searchSeriesDB('korean', { genre: 'korean', limit: 100 }),
            searchSeriesDB('kdrama', { genre: 'kdrama', limit: 100 })
          ]);
          results = [
            ...koreanMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...kdramaMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...koreanSeries.map(item => ({ ...item, contentType: 'series' })),
            ...kdramaSeries.map(item => ({ ...item, contentType: 'series' }))
          ];
          break;
        
        case 'hollywood':
          // Direct database query for Hollywood content
          const { default: supabaseHollywood } = await import('../services/supabaseClient.js');
          const [hollywoodMoviesQuery, hollywoodSeriesQuery] = await Promise.all([
            supabaseHollywood
              .from('movies')
              .select('*')
              .ilike('categories', '%hollywood%')
              .eq('status', 'publish')
              .order('modified_date', { ascending: false })
              .limit(200),
            supabaseHollywood
              .from('series')
              .select('*')
              .ilike('categories', '%hollywood%')
              .eq('status', 'publish')
              .order('modified_date', { ascending: false })
              .limit(200)
          ]);
          
          const hollywoodMovies = hollywoodMoviesQuery.data || [];
          const hollywoodSeries = hollywoodSeriesQuery.data || [];
          
          console.log('📊 Direct Hollywood search results:', {
            movies: hollywoodMovies.length,
            series: hollywoodSeries.length
          });
          
          results = [
            ...hollywoodMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...hollywoodSeries.map(item => ({ ...item, contentType: 'series' }))
          ];
          break;
        
        case 'bollywood':
          // Search for Bollywood content in categories
          const [bollywoodMovies, bollywoodSeries] = await Promise.all([
            searchMoviesDB('bollywood', { genre: 'bollywood', limit: 200 }),
            searchSeriesDB('bollywood', { genre: 'bollywood', limit: 200 })
          ]);
          results = [
            ...bollywoodMovies.map(item => ({ ...item, contentType: 'movies' })),
            ...bollywoodSeries.map(item => ({ ...item, contentType: 'series' }))
          ];
          break;
        
        case 'web-dl':
          // Search for WEB-DL content in categories
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
          // Search for Blu-Ray content in categories
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
          results = [];
      }
      
      // Remove duplicates based on record_id only (more lenient deduplication)
      const uniqueResults = results
        .filter((item, index, arr) => {
          // Only remove if exact same record_id exists
          return arr.findIndex(i => i.record_id === item.record_id) === index;
        })
        .sort((a, b) => new Date(b.modified_date || b.date) - new Date(a.modified_date || a.date));
      
      console.log(`✅ Filter ${filterId} completed: ${uniqueResults.length} unique items found from ${results.length} total results`);
      console.log('📊 Sample results:', uniqueResults.slice(0, 3).map(r => ({ title: r.title, type: r.contentType })));
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
  }, [MOVIES_PER_PAGE]);

  // Handle filter change
  const handleFilterChange = useCallback((filterId) => {
    applyFilter(filterId);
  }, [applyFilter]);

  // **FILTER BAR COMPONENT**
  const FilterBar = memo(() => {
    return (
      <>
        {/* PLATFORM FILTER SECTION LIKE SCREENSHOT */}
        <div className="  bg-opacity-90  rounded-[10px]">
          <div className=" flex items-center justify-center px-6 py-4">
            <div className=" flex items-center space-x-8">
              {/* Netflix */}
              <button
                className={`flex flex-col items-center space-y-2 transition-all duration-200 ${
                  activeFilter === 'netflix' ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                onClick={() => handleFilterChange('netflix')}
              >
                <div className="w-[40px] h-[40px] bg-red-600 rounded-t-lg rounded-b-lg flex items-center justify-center p-2">
                  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.37801 21.5H8.6996C8.74039 21.5 8.77973 21.4799 8.80891 21.4449C8.83809 21.4099 8.85476 21.3631 8.85476 21.3143V2.68572C8.85476 2.63691 8.83809 2.59013 8.80891 2.55509C8.77973 2.52005 8.74039 2.5 8.6996 2.5H5.37801C5.33723 2.5 5.29789 2.52005 5.2687 2.55509C5.23952 2.59013 5.22285 2.63691 5.22285 2.68572V21.3143C5.22285 21.3631 5.23952 21.4099 5.2687 21.4449C5.29789 21.4799 5.33723 21.5 5.37801 21.5Z" fill="white"/>
                    <path d="M19.5 21.5H16.1784C16.1376 21.5 16.0983 21.4799 16.0691 21.4449C16.0399 21.4099 16.0233 21.3631 16.0233 21.3143V2.68572C16.0233 2.63691 16.0399 2.59013 16.0691 2.55509C16.0983 2.52005 16.1376 2.5 16.1784 2.5H19.5C19.5408 2.5 19.58 2.52005 19.6092 2.55509C19.6384 2.59013 19.6551 2.63691 19.6551 2.68572V21.3143C19.6551 21.3631 19.6384 21.4099 19.6092 21.4449C19.58 21.4799 19.5408 21.5 19.5 21.5Z" fill="white"/>
                    <path d="M8.85473 2.5L16.0232 21.5L8.85473 2.5Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Netflix</span>
              </button>

              {/* Prime Video */}
              <button
                className={`flex flex-col items-center space-y-2 transition-all duration-200 ${
                  activeFilter === 'prime' ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                onClick={() => handleFilterChange('prime')}
              >
                <div className="w-[40px] h-[40px] bg-blue-600 rounded-t-lg rounded-b-lg flex items-center justify-center p-2">
                  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.5 3C15.8807 3 17 4.11929 17 5.5V18.5C17 19.8807 15.8807 21 14.5 21H5.5C4.11929 21 3 19.8807 3 18.5V5.5C3 4.11929 4.11929 3 5.5 3H14.5ZM14.5 5H5.5C5.22386 5 5 5.22386 5 5.5V18.5C5 18.7761 5.22386 19 5.5 19H14.5C14.7761 19 15 18.7761 15 18.5V5.5C15 5.22386 14.7761 5 14.5 5Z" />
                    <path d="M21 5.5C21 4.11929 19.8807 3 18.5 3L16.5 3V5L18.5 5C18.7761 5 19 5.22386 19 5.5V18.5C19 18.7761 18.7761 19 18.5 19H16.5V21H18.5C19.8807 21 21 19.8807 21 18.5V5.5Z" />
                    <path d="M11.0858 8.50011C11.0858 8.08579 10.7502 7.7502 10.3358 7.7502C9.92153 7.7502 9.58594 8.08579 9.58594 8.50011V12.4999C9.58594 12.9142 9.92153 13.2498 10.3358 13.2498C10.7502 13.2498 11.0858 12.9142 11.0858 12.4999V8.50011Z" />
                    <path d="M7.83583 10.25C8.25015 10.25 8.58573 9.91441 8.58573 9.5001C8.58573 9.08578 8.25015 8.7502 7.83583 8.7502C7.42152 8.7502 7.08594 9.08578 7.08594 9.5001C7.08594 9.91441 7.42152 10.25 7.83583 10.25Z" />
                    <path d="M7.83583 15.25C8.25015 15.25 8.58573 14.9144 8.58573 14.5001C8.58573 14.0858 8.25015 13.7502 7.83583 13.7502C7.42152 13.7502 7.08594 14.0858 7.08594 14.5001C7.08594 14.9144 7.42152 15.25 7.83583 15.25Z" />
                  </svg>
                </div>
                <span className="text-white text-xs">Prime</span>
              </button>

              {/* Anime */}
              <button
                className={`flex flex-col items-center space-y-2 transition-all duration-200 ${
                  activeFilter === 'anime' ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                onClick={() => handleFilterChange('anime')}
              >
                <div className="w-[40px] h-[40px] bg-orange-500 rounded-t-lg rounded-b-lg flex items-center justify-center p-2">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path className="st120" d="M95.861,43.517c-7.059-44.746-67.18-53.838-87.55-13.491c-14.094,28.783,5.422,62.6,37.287,65.569     c-0.246,0.138,11.835,0.216,5.657-0.32c-2.384-0.191-5.999-0.995-8.814-1.959C6.051,80.491,6.181,30.216,42.617,17.612     c23.974-8.48,50.92,8.586,53.287,33.766c0.096,1.138,0.173,1.413,0.319,1.15C96.493,52.047,96.261,46.285,95.861,43.517z" fill="white"/>
                    <path className="st120" d="M88.716,53.078c-8.249,8.928-23.788,3.74-25.163-8.21c-0.951-6.583,3.482-13.149,9.804-15.499     C26.439,7.838,3.291,82.524,55.402,89.897C76.571,91.661,93.966,72.754,90.013,52C89.961,51.915,89.377,52.4,88.716,53.078z" fill="white"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Anime</span>
              </button>

              {/* K Drama */}
              <button
                className={`flex flex-col items-center space-y-2 transition-all duration-200 ${
                  activeFilter === 'kdrama' ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                onClick={() => handleFilterChange('kdrama')}
              >
                <div className="w-[40px] h-[40px] bg-gray-700 rounded-t-lg rounded-b-lg flex items-center justify-center p-2">
                  <svg width="100%" height="100%" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M626.56 287.02L520.78 124.71L405.31 300L495.05 438.92L626.56 287.02Z" fill="white"/>
                    <path d="M401.64 300L286.27 124.71L180.5 287.02L311.95 438.92L401.64 300Z" fill="white"/>
                    <path d="M631.19 293.28L500.83 444.08L617.31 620.39L716.95 499.27L631.19 293.28Z" fill="white"/>
                    <path d="M310.38 443.52L173.91 293.28L88.1 499.27L187.73 620.39L310.38 443.52Z" fill="white"/>
                    <path d="M405.31 305.78L310.38 452.08L183.52 631.05H403.48L403.47 305.78H405.31Z" fill="white"/>
                    <path d="M401.64 305.78L496.67 452.08L623.52 631.05H403.52L403.53 305.78H401.64Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-white text-xs">K Drama</span>
              </button>

              {/* Hollywood */}
              <button
                className={`flex flex-col items-center space-y-2 transition-all duration-200 ${
                  activeFilter === 'hollywood' ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                onClick={() => handleFilterChange('hollywood')}
              >
                <div className="w-[40px] h-[40px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-lg rounded-b-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">H</span>
                </div>
                <span className="text-white text-xs">Hollywood</span>
              </button>
            </div>
          </div>
        </div>

        {/* NAVIGATION BAR - HIDDEN ON MOBILE */}
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
        </div>

        {/* QUALITY & DUAL AUDIO FILTER BAR */}
        <div className="bg-black bg-opacity-70 border-b border-gray-800">
          <div className="flex items-center justify-center px-4 py-2">
            <div className="flex items-center space-x-2">
              {/* All */}
                <button
                  className={`text-xs font-medium transition-colors px-3 py-1.5 rounded border ${
                    activeFilter === 'all' 
                      ? 'bg-[#FF0000] text-white border-[#FF0000]' 
                      : 'text-gray-300 border-gray-600 hover:text-white hover:border-gray-500'
                  }`}
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </button>

              {/* 1080p */}
              <button
                className={`text-xs font-medium transition-colors px-3 py-1.5 rounded border ${
                  activeFilter === '1080p' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'text-gray-300 border-gray-600 hover:text-white hover:border-gray-500'
                }`}
                onClick={() => handleFilterChange('1080p')}
              >
                1080P
              </button>

              {/* 4K */}
              <button
                className={`text-xs font-medium transition-colors px-3 py-1.5 rounded border ${
                  activeFilter === '4k' 
                    ? 'bg-black text-white border-white' 
                    : 'text-gray-300 border-gray-600 hover:text-white hover:border-gray-500'
                }`}
                onClick={() => handleFilterChange('4k')}
              >
                4K
              </button>

              {/* English */}
              <button
                className={`text-xs font-medium transition-colors px-3 py-1.5 rounded border ${
                  activeFilter === 'english' 
                    ? 'bg-black text-white border-white' 
                    : 'text-gray-300 border-gray-600 hover:text-white hover:border-gray-500'
                }`}
                onClick={() => handleFilterChange('english')}
              >
                English
              </button>

              {/* Dual Audio */}
              <button
                className={`text-xs font-medium transition-colors px-3 py-1.5 rounded border ${
                  activeFilter === 'dual-audio' 
                    ? 'bg-black text-white border-white' 
                    : 'text-gray-300 border-gray-600 hover:text-white hover:border-gray-500'
                }`}
                onClick={() => handleFilterChange('dual-audio')}
              >
                Dual Audio
              </button>
            </div>
          </div>
        </div>

        {/* FILTER STATUS INFO */}
        {activeFilter !== 'all' && (
          <div className="bg-black bg-opacity-70 border-b border-gray-800 px-4 py-2">
            <div className="flex items-center justify-center">
              {filterLoading ? (
                <span className="text-xs text-yellow-400 flex items-center gap-2">
                  <div className="w-3 h-3 border border-yellow-400/50 border-t-yellow-400 rounded-full animate-spin"></div>
                  Fetching from database...
                </span>
              ) : filteredContent.length > 0 ? (
                <span className="text-xs text-green-400">
                  ✅ {filteredContent.length} items found
                </span>
              ) : (
                <span className="text-xs text-gray-500">
                  No results found
                </span>
              )}
            </div>
          </div>
        )}
      </>
    );
  });
  FilterBar.displayName = 'FilterBar';

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
    if (newType === contentType) return;
    
    // Reset filter when changing content type
    setActiveFilter('all');
    setFilteredContent([]);
    setDisplayedCount(MOVIES_PER_PAGE);
    
    setContentType(newType);
    setSearchQuery(''); // Clear search when switching types
    setIsSearchActive(false); // Deactivate search when switching content types
    console.log(`📱 Content type changed to ${newType}, search deactivated, filters reset`);
  };

  // Get current content and loading state - memoized to prevent recreation
  const getCurrentContentAndState = useCallback(() => {
    // If a filter is active and we have filtered content, return filtered content
    if (activeFilter !== 'all' && filteredContent.length > 0) {
      return { content: filteredContent, loading: filterLoading, loaded: true };
    }
    
    // Otherwise return content based on contentType
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
  }, [contentType, allMovies, allSeries, allAnime, moviesLoading, seriesLoading, animeLoading, moviesLoaded, seriesLoaded, animeLoaded, activeFilter, filteredContent, filterLoading]);

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
      return [{ 
        title: `${filterLabel} (${filteredContent.length} items)`, 
        items: filteredContent,
        icon: FILTERS.find(f => f.id === activeFilter)?.icon
      }];
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
  }, [searchQuery, searchResults, isSearching, contentType, getCurrentContentAndState, searchError, activeFilter, filteredContent]);

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
            All {contentType === 'movies' ? 'Movies' : contentType === 'series' ? 'TV Shows' : 'Anime'}
          </h2>
          <div className="text-sm text-gray-400">
            Showing all {displayedContent.length} items from cache
          </div>
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
          <div className="px-6 py-3 bg-gray-800/50 text-gray-400 rounded-lg text-sm">
            ✅ All {currentContent.length} items from cache displayed
          </div>
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
      {/* MODERN HEADER LIKE SCREENSHOT */}
      <header 
        ref={headerRef} 
        className="bg-black bg-opacity-95 backdrop-blur-sm border-b border-gray-800"
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center">
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

      {/* FILTER BAR */}
      <FilterBar />

      {/* MAIN CONTENT */}
      <main className={`${selectedMovie ? 'pb-8' : 'pb-20 md:pb-8'}`}>
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
