import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Film, Tv, Play, Star, Grid, List, Filter } from 'lucide-react';
import { platforms } from '../data/mockData';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';
import SeriesDetail from './SeriesDetail';

// **OPTIMIZED IMPORTS WITH BATCH LOADING**
import { getAllMovies, searchMovies, getCacheStats as getMovieStats } from '../services/movieService';
import { getAllSeries, searchSeries, getSeriesCacheStats } from '../services/seriesService';
import { getAllAnime, searchAnime, getAnimeCacheStats } from '../services/animeService';

// **NEW IMPORTS FOR OPTIMIZATION**
import { useDirectDatabaseSearch, useLazyDownloadLinks } from '../hooks/useDirectDatabaseSearch';
import SimpleOptimizedImage from '../components/SimpleOptimizedImage';

// **OPTIMIZED BATCH LOADING CONFIGURATION**
const CONFIG = {
  INITIAL_BATCH_SIZE: 500, // First batch - increased for better UX
  ITEMS_PER_PAGE: 100, // Pagination size
  PRELOAD_IMAGES_COUNT: 20, // Number of images to preload
  SEARCH_MIN_LENGTH: 3, // Increased to match search hook
  CACHE_PRELOAD_DELAY: 100
};

// **OPTIMIZED SEARCH HOOK WITH CACHE-ONLY SEARCH** (Database search disabled to reduce requests)
const useOptimizedSearch = (searchQuery, contentType) => {
  // Force cache-only search
  const [cacheSearchResults, setCacheSearchResults] = useState([]);
  const [cacheIsSearching, setCacheIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const searchError = null; // No database search means no error
  
  // Memoize the search function to prevent recreation
  const performCacheSearch = useCallback(async (query, type) => {
    if (!query || query.length < CONFIG.SEARCH_MIN_LENGTH) {
      setCacheSearchResults([]);
      return;
    }
    
    setCacheIsSearching(true);
    
    try {
      let results = [];
      switch (type) {
        case 'movies':
          results = await searchMovies(query, { limit: 20 });
          break;
        case 'series':
          results = await searchSeries(query, { limit: 20 });
          break;
        case 'anime':
          results = await searchAnime(query, { limit: 20 });
          break;
        default:
          results = [];
      }
      setCacheSearchResults(results);
    } catch (error) {
      console.error('Cache search failed:', error);
      setCacheSearchResults([]);
    } finally {
      setCacheIsSearching(false);
    }
  }, []); // Empty dependencies since we're passing params
  
  // Debounced search effect
  useEffect(() => {
    if (!searchQuery || searchQuery.length < CONFIG.SEARCH_MIN_LENGTH) {
      setCacheSearchResults([]);
      return;
    }

    const debounceTimeout = setTimeout(() => {
      performCacheSearch(searchQuery, contentType);
    }, 500);
    
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, contentType, performCacheSearch]);
  
  // Generate suggestions from recent search results
  const suggestions = useMemo(() => {
    if (!cacheSearchResults || cacheSearchResults.length === 0 || !searchQuery) return [];
    
    return cacheSearchResults
      .slice(0, 5)
      .map(item => item?.title)
      .filter(title => title && title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [cacheSearchResults, searchQuery]);

  // Update search history only when we have successful results
  useEffect(() => {
    if (searchQuery && searchQuery.length >= CONFIG.SEARCH_MIN_LENGTH && cacheSearchResults.length > 0) {
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h !== searchQuery);
        return [searchQuery, ...filtered].slice(0, 10);
      });
    }
  }, [searchQuery, cacheSearchResults.length]);

  return { 
    searchResults: cacheSearchResults, 
    isSearching: cacheIsSearching, 
    suggestions, 
    searchHistory,
    searchError
  };
};

// **OPTIMIZED SEARCH BAR WITH PERFORMANCE IMPROVEMENTS**
const OptimizedSearchBar = memo(({ 
  searchQuery, 
  onSearchChange, 
  contentType, 
  searchResults = [], 
  isSearching = false,
  suggestions = [],
  searchHistory = [],
  onResultSelect,
  searchError = null
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Lazy download links hook (DISABLED to reduce requests)
  // const { fetchDownloadLinks } = useLazyDownloadLinks();

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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowDropdown(isFocused && (searchResults.length > 0 || isSearching || searchQuery.length >= 1));
  }, [isFocused, searchResults.length, isSearching, searchQuery]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    onSearchChange(value);
    setActiveTab('results');
  };

  const handleResultClick = async (result) => {
    // Don't preload download links automatically - only when user actually opens details
    // if (result.id) {
    //   fetchDownloadLinks(result.id, contentType).catch(console.error);
    // }
    
    onResultSelect(result);
    setShowDropdown(false);
    setIsFocused(false);
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

  const getResultTypeIcon = (result) => {
    if (result.isAnime) return '🌟';
    if (result.isSeries) return '📺';
    return '🎬';
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={`Search ${contentType}... (Cache-only search)`}
          className={`transition-all duration-300 bg-black/60 border rounded-lg px-12 py-3 text-sm focus:outline-none ${
            isFocused 
              ? `border-${searchError ? 'orange' : 'red'}-500 bg-black/80 w-72 md:w-96 shadow-xl`
              : 'border-gray-600 hover:border-gray-400 w-48 md:w-64'
          }`}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
        />
        <Search className={`absolute left-4 top-3.5 transition-colors ${
          isFocused ? (searchError ? 'text-orange-400' : 'text-red-400') : 'text-gray-400'
        }`} size={16} />
        
        {isSearching && (
          <div className="absolute right-12 top-3.5">
            <div className={`w-4 h-4 border-2 border-${searchError ? 'orange' : 'red'}-500 border-t-transparent rounded-full animate-spin`}></div>
          </div>
        )}
        
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              setShowDropdown(false);
            }}
            className="absolute right-4 top-3.5 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Enhanced Search Dropdown with Error Handling */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl max-h-[500px] overflow-hidden z-50"
        >
          {/* Error Banner */}
          {searchError && (
            <div className="bg-orange-900/50 border-b border-orange-700 p-3">
              <div className="flex items-center text-orange-300 text-sm">
                <span className="mr-2">⚠️</span>
                Database search failed. Using cached results.
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'results' 
                  ? 'text-red-400 border-b-2 border-red-400 bg-gray-800/50' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Results ({searchResults.length})
            </button>
            {suggestions.length > 0 && (
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'suggestions' 
                    ? 'text-red-400 border-b-2 border-red-400 bg-gray-800/50' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Suggestions
              </button>
            )}
            {searchHistory.length > 0 && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'history' 
                    ? 'text-red-400 border-b-2 border-red-400 bg-gray-800/50' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                History
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Results Tab */}
            {activeTab === 'results' && (
              <>
                {isSearching ? (
                  <div className="p-6 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p>Searching {contentType}...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2">
                    <div className="text-xs text-gray-500 px-3 py-2">
                      Found {searchResults.length} results {searchError ? '(from cache)' : '(live)'}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {searchResults.slice(0, 6).map((result, index) => (
                        <button
                          key={result.id || index}
                          onClick={() => handleResultClick(result)}
                          className="w-full p-3 hover:bg-gray-800/60 rounded-lg text-left flex items-center space-x-3 transition-all duration-150"
                        >
                          <div className="w-14 h-20 bg-gray-700 rounded-md overflow-hidden flex-shrink-0">
                            <SimpleOptimizedImage
                              src={result.poster || result.featuredImage}
                              alt={result.title}
                              className="w-full h-full object-cover"
                              lazy={true}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">
                              {highlightMatch(result.title, searchQuery)}
                            </div>
                            <div className="text-sm text-gray-400 truncate">
                              {result.releaseYear && `${result.releaseYear} • `}
                              {result.categories?.slice(0, 2).join(', ') || 'No genre info'}
                            </div>
                            <div className="flex items-center mt-1">
                              {result.content?.rating && (
                                <div className="text-xs text-yellow-400 mr-2">
                                  ⭐ {result.content.rating}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                Click for details
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchQuery.length >= CONFIG.SEARCH_MIN_LENGTH ? (
                  <div className="p-6 text-center text-gray-400">
                    <div className="text-3xl mb-3">🔍</div>
                    <p className="font-medium">No results found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try different keywords or check spelling
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {/* Suggestions and History tabs remain the same */}
            {activeTab === 'suggestions' && suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-gray-500 px-3 py-2">
                  Popular suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSearchChange(suggestion)}
                    className="w-full p-3 hover:bg-gray-800/60 rounded-lg text-left flex items-center space-x-3 transition-colors"
                  >
                    <Search size={16} className="text-gray-400" />
                    <span className="text-white">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'history' && searchHistory.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-gray-500 px-3 py-2">
                  Recent searches
                </div>
                {searchHistory.map((historyItem, index) => (
                  <button
                    key={index}
                    onClick={() => onSearchChange(historyItem)}
                    className="w-full p-3 hover:bg-gray-800/60 rounded-lg text-left flex items-center space-x-3 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-xs text-gray-400">🕒</span>
                    </div>
                    <span className="text-white">{historyItem}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
OptimizedSearchBar.displayName = 'OptimizedSearchBar';

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
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading {contentType}...</p>
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

// **OPTIMIZED SCROLLABLE ROW WITH IMAGE PRELOADING**
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
          
          // Preload images when section becomes visible
          const imagesToPreload = items
            .slice(0, CONFIG.PRELOAD_IMAGES_COUNT)
            .map(item => item.poster || item.featuredImage)
            .filter(Boolean);
          
          if (imagesToPreload.length > 0) {
            // Removed preload to reduce requests - images will load naturally when needed
            // preloadBatchImages(imagesToPreload, 5).catch(console.error);
          }
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (intersectionRef.current) {
      observer.observe(intersectionRef.current);
    }

    return () => observer.disconnect();
  }, [items, isVisible]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible && items.length > 0) {
    return (
      <div ref={intersectionRef} className="mb-8 h-48 flex items-center justify-center">
        <div className="text-gray-500">Loading section...</div>
      </div>
    );
  }

  return (
    <div className="mb-8 group" ref={intersectionRef}>
      <div className="flex items-center justify-between mb-4 px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-white">
          {title}
        </h2>
        <div className="hidden md:flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>
      </div>
      
      <div
        ref={scrollRef}
        className="flex space-x-2 md:space-x-4 overflow-x-auto scrollbar-hide pb-4 px-4 md:px-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((content, idx) => (
          <div key={content.id || idx} className="flex-shrink-0">
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
  <nav className="fixed z-50 bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-gray-800 flex md:hidden items-center justify-around h-16">
    <button
      className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none transition-colors ${
        contentType === 'movies' ? 'text-red-500' : 'text-gray-400'
      }`}
      onClick={() => onContentTypeChange('movies')}
    >
      <div className="relative">
        <Film size={20} />
        {moviesLoading && (
          <div className="absolute -top-1 -right-1 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
        )}
        {cacheStats?.movies && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
        )}
      </div>
      <span className="text-xs mt-1">
        Movies {cacheStats?.movies ? `(${cacheStats.movies})` : ''}
      </span>
    </button>
    <button
      className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none transition-colors ${
        contentType === 'series' ? 'text-red-500' : 'text-gray-400'
      }`}
      onClick={() => onContentTypeChange('series')}
    >
      <div className="relative">
        <Tv size={20} />
        {seriesLoading && (
          <div className="absolute -top-1 -right-1 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
        )}
        {cacheStats?.series && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
        )}
      </div>
      <span className="text-xs mt-1">
        Series {cacheStats?.series ? `(${cacheStats.series})` : ''}
      </span>
    </button>
    <button
      className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none transition-colors ${
        contentType === 'anime' ? 'text-red-500' : 'text-gray-400'
      }`}
      onClick={() => onContentTypeChange('anime')}
    >
      <div className="relative">
        <Star size={20} />
        {animeLoading && (
          <div className="absolute -top-1 -right-1 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
        )}
        {cacheStats?.anime && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
        )}
      </div>
      <span className="text-xs mt-1">
        Anime {cacheStats?.anime ? `(${cacheStats.anime})` : ''}
      </span>
    </button>
  </nav>
));
BottomBar.displayName = 'BottomBar';

function Home() {
  const [contentType, setContentType] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // **OPTIMIZED SEARCH WITH DIRECT DATABASE CONNECTION**
  const { 
    searchResults, 
    isSearching, 
    suggestions, 
    searchHistory,
    searchError
  } = useOptimizedSearch(searchQuery, contentType);

  // **OPTIMIZED PAGINATION**
  const MOVIES_PER_PAGE = CONFIG.ITEMS_PER_PAGE;

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
        console.log('📊 Cache stats updated:', newStats);
        return newStats;
      });
    } catch (error) {
      console.warn('Error updating cache stats:', error);
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
      console.log('🎬 Movies already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.movies = true;
    setMoviesLoading(true);
    console.log('🎬 Starting optimized movie loading...');
    
    try {
      // This now loads in progressive batches (500 initially, then more in background)
      const movies = await getAllMovies(CONFIG.INITIAL_BATCH_SIZE);
      console.log(`✅ Loaded ${movies.length} movies in optimized batches`);
      setAllMovies(movies);
      setMoviesLoaded(true);
      
      // Update cache stats after successful load
      setTimeout(() => {
        try {
          updateCacheStats();
        } catch (error) {
          console.warn('Cache stats update after movie load failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error loading movies:', error);
    } finally {
      setMoviesLoading(false);
      fetchingRef.current.movies = false;
    }
  }, []); // Remove all dependencies to prevent recreation

  const fetchSeries = useCallback(async () => {
    if (seriesLoaded || seriesLoading || fetchingRef.current.series) {
      console.log('📺 Series already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.series = true;
    setSeriesLoading(true);
    console.log('📺 Starting optimized series loading...');
    
    try {
      const series = await getAllSeries(CONFIG.INITIAL_BATCH_SIZE);
      console.log(`✅ Loaded ${series.length} series in optimized batches`);
      setAllSeries(series);
      setSeriesLoaded(true);
      
      // Update cache stats after successful load
      setTimeout(() => {
        try {
          updateCacheStats();
        } catch (error) {
          console.warn('Cache stats update after series load failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error loading series:', error);
    } finally {
      setSeriesLoading(false);
      fetchingRef.current.series = false;
    }
  }, []); // Remove all dependencies to prevent recreation

  const fetchAnime = useCallback(async () => {
    if (animeLoaded || animeLoading || fetchingRef.current.anime) {
      console.log('🌟 Anime already loaded/loading, skipping...');
      return;
    }
    
    fetchingRef.current.anime = true;
    setAnimeLoading(true);
    console.log('🌟 Starting optimized anime loading...');
    
    try {
      const anime = await getAllAnime(CONFIG.INITIAL_BATCH_SIZE);
      console.log(`✅ Loaded ${anime.length} anime in optimized batches`);
      setAllAnime(anime);
      setAnimeLoaded(true);
      
      // Update cache stats after successful load
      setTimeout(() => {
        try {
          updateCacheStats();
        } catch (error) {
          console.warn('Cache stats update after anime load failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error loading anime:', error);
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
      console.log('🎬 Content type changed to movies, fetching...');
      fetchMovies().catch(console.error);
    } else if (shouldFetchSeries) {
      console.log('📺 Content type changed to series, fetching...');
      fetchSeries().catch(console.error);
    } else if (shouldFetchAnime) {
      console.log('🌟 Content type changed to anime, fetching...');
      fetchAnime().catch(console.error);
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

  const handleContentSelect = (content) => {
    setSelectedMovie(content);
  };

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleContentTypeChange = (newType) => {
    if (newType === contentType) return;
    
    setContentType(newType);
    setSearchQuery(''); // Clear search when switching types
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

    // **OPTIMIZED SECTIONS - Limit items for better performance**
    
    // Trending section (high-rated content)
    const trending = currentContent
      .filter(item => {
        const rating = item.content?.rating || item.rating;
        return rating && parseFloat(rating) > 7;
      })
      .slice(0, 12); // Reduced from 15 to 12 for faster loading
    if (trending.length > 0) {
      sections.push({ title: 'Trending Now', items: trending, showNumbers: true });
    }

    // Recently Added (based on modification date)
    const recentlyAdded = [...currentContent]
      .sort((a, b) => new Date(b.modifiedDate || b.date || 0) - new Date(a.modifiedDate || a.date || 0))
      .slice(0, 12);
    if (recentlyAdded.length > 0) {
      sections.push({ title: 'Recently Added', items: recentlyAdded });
    }

    // Content-specific sections (limited for performance)
    if (contentType === 'anime') {
      const animeGenres = ['Action', 'Adventure', 'Comedy', 'Drama']; // Reduced genres
      animeGenres.forEach(genre => {
        const genreContent = currentContent.filter(item => {
          if (item.genres && Array.isArray(item.genres)) {
            return item.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()));
          }
          if (item.categories && Array.isArray(item.categories)) {
            return item.categories.some(cat => 
              cat.toLowerCase().includes(genre.toLowerCase())
            );
          }
          return false;
        }).slice(0, 12);
        
        if (genreContent.length > 0) {
          sections.push({
            title: `${genre} Anime`,
            items: genreContent
          });
        }
      });
    } else {
      // Platform-based sections (limited for performance)
      platformList.slice(0, 6).forEach(platform => { // Reduced platforms
        const platformContent = currentContent.filter(item => {
          if (item.categories && Array.isArray(item.categories)) {
            return item.categories.some(cat => 
              cat.toLowerCase().includes(platform.name.toLowerCase())
            );
          }
          return item.category && 
                 item.category.toLowerCase().includes(platform.name.toLowerCase());
        }).slice(0, 12);
        
        if (platformContent.length > 0) {
          sections.push({
            title: platform.name,
            items: platformContent
          });
        }
      });
    }

    return sections;
  }, [searchQuery, searchResults, isSearching, contentType, getCurrentContentAndState, searchError, platformList]);

  // **OPTIMIZED ALL CONTENT SECTION WITH BATCH PAGINATION**
  const AllContentSection = memo(() => {
    const { content: currentContent, loading } = getCurrentContentAndState();
    
    if (loading) {
      const stats = contentType === 'movies' ? { totalMovies: cacheStats.movies } :
                   contentType === 'series' ? { totalSeries: cacheStats.series } :
                   { totalAnime: cacheStats.anime };
      return <TabLoadingState contentType={contentType} cacheStats={stats} />;
    }
    
    if (currentContent.length === 0) return null;

    const totalPages = Math.ceil(currentContent.length / MOVIES_PER_PAGE);
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    const endIndex = startIndex + MOVIES_PER_PAGE;
    const paginatedContent = currentContent.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Preload images for new page (DISABLED to reduce requests)
      // const newPageImages = paginatedContent
      //   .slice(0, CONFIG.PRELOAD_IMAGES_COUNT)
      //   .map(item => item.poster || item.featuredImage)
      //   .filter(Boolean);
      
      // if (newPageImages.length > 0) {
      //   preloadBatchImages(newPageImages, 5).catch(console.error);
      // }
    };

    const getSectionTitle = () => {
      const cached = cacheStats[contentType] > 0 ? ` (${cacheStats[contentType]} cached)` : '';
      switch (contentType) {
        case 'movies':
          return `All Movies${cached}`;
        case 'series':
          return `All TV Shows${cached}`;
        case 'anime':
          return `All Anime${cached}`;
        default:
          return `All Content${cached}`;
      }
    };

    return (
      <div className="mb-8 px-4 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {getSectionTitle()}
          </h2>
          <div className="text-sm text-gray-400 flex items-center space-x-2">
            <span>Showing {startIndex + 1}-{Math.min(endIndex, currentContent.length)} of {currentContent.length}</span>
            {cacheStats[contentType] > 0 && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Cached for fast loading"></div>
            )}
          </div>
        </div>
        
        {/* **OPTIMIZED MOVIE GRID** */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2 md:gap-4 mb-8">
          {paginatedContent.map((content, idx) => (
            <MovieCard
              key={content.id || idx}
              movie={content}
              onClick={handleContentSelect}
              index={startIndex + idx}
              useOptimizedImage={true}
            />
          ))}
        </div>

        {/* Enhanced Pagination with performance info */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-center items-center gap-2 md:gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  currentPage === 1 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                First
              </button>
              
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className={`px-4 py-2 rounded-lg text-sm flex items-center ${
                  currentPage === 1 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-red-600 to-purple-600 text-white hover:from-red-500 hover:to-purple-500'
                }`}
              >
                <ChevronLeft size={16} className="mr-1" />
                Previous
              </button>
              
              <div className="flex items-center justify-center bg-[#1e1e1e] rounded-lg px-6 py-2">
                <span className="text-sm font-medium text-white">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className={`px-4 py-2 rounded-lg text-sm flex items-center ${
                  currentPage === totalPages 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-red-600 to-purple-600 text-white hover:from-red-500 hover:to-purple-500'
                }`}
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  currentPage === totalPages 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                Last
              </button>
            </div>
            
            {/* Quick Jump Pages */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Quick jump:</span>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded transition-colors ${
                      pageNum === currentPage 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            {/* Performance indicators */}
            <div className="text-xs text-gray-500 text-center">
              {cacheStats[contentType] > 0 && (
                <span className="inline-flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Fast loading enabled • Images cached • Database optimized
                </span>
              )}
            </div>
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
        return <SeriesDetail series={selectedMovie} onClose={() => setSelectedMovie(null)} />;
      } else {
        if (!MovieDetails) {
          console.error('❌ MovieDetails component not found');
          return (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
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
        
        return <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />;
      }
    } catch (error) {
      console.error('💥 Error rendering detail component:', error);
      return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ENHANCED HEADER WITH AWESOME SEARCH */}
      <header 
        ref={headerRef} 
        className="fixed top-0 w-full bg-black bg-opacity-0 z-50 transition-all duration-300 transform"
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <div className="flex items-center space-x-8">
            <div className="text-red-600 text-2xl font-bold">
              StreamFlix
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <button
                className={`text-sm font-medium transition-colors relative ${
                  contentType === 'movies' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleContentTypeChange('movies')}
              >
                Movies
                {moviesLoading && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
              <button
                className={`text-sm font-medium transition-colors relative ${
                  contentType === 'series' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleContentTypeChange('series')}
              >
                TV Shows
                {seriesLoading && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
              <button
                className={`text-sm font-medium transition-colors relative ${
                  contentType === 'anime' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleContentTypeChange('anime')}
              >
                Anime
                {animeLoading && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
              <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                My List
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <OptimizedSearchBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              contentType={contentType}
              searchResults={searchResults}
              isSearching={isSearching}
              suggestions={suggestions}
              searchHistory={searchHistory}
              onResultSelect={handleContentSelect}
              searchError={searchError}
            />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="pt-20 pb-20">
        {/* HERO SECTION with optimized image */}
        {!searchQuery && !isCurrentLoading && groupedContent[0]?.items[0] && (
          <div className="relative h-[40vh] md:h-[50vh] mb-8 overflow-hidden">
            <SimpleOptimizedImage
              src={groupedContent[0].items[0].featuredImage || groupedContent[0].items[0].featured_image || groupedContent[0].items[0].poster || groupedContent[0].items[0].image}
              alt={groupedContent[0].items[0].title}
              className="w-full h-full object-cover"
              lazy={false} // Hero image should load immediately
              placeholder={false}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-2xl">
              <h1 className="text-2xl md:text-4xl font-bold mb-4 text-white">
                {groupedContent[0].items[0].title?.replace(/\(\d{4}\)/, '').trim()}
              </h1>
              <p className="text-md md:text-lg text-gray-300 mb-6 line-clamp-3">
                {groupedContent[0].items[0].content?.description || groupedContent[0].items[0].excerpt || "Discover amazing content and enjoy unlimited streaming."}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleContentSelect(groupedContent[0].items[0])}
                  className="flex items-center space-x-2 bg-white text-black px-6 py-3 rounded hover:bg-gray-200 transition-colors"
                >
                  <Play size={20} fill="currentColor" />
                  <span className="font-medium">Play</span>
                </button>
                <button
                  onClick={() => handleContentSelect(groupedContent[0].items[0])}
                  className="flex items-center space-x-2 bg-gray-600/70 text-white px-6 py-3 rounded hover:bg-gray-600 transition-colors"
                >
                  <span className="font-medium">More Info</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT SECTIONS with performance indicators */}
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
                  key={index}
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
      </main>

      {selectedMovie && renderDetailComponent()}
      <BottomBar 
        contentType={contentType}
        onContentTypeChange={handleContentTypeChange}
        moviesLoading={moviesLoading}
        seriesLoading={seriesLoading}
        animeLoading={animeLoading}
        cacheStats={cacheStats}
      />

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
      `}</style>
    </div>
  );
}

// Main component with memo
const MemoizedHome = memo(Home);
MemoizedHome.displayName = 'Home';

export default MemoizedHome;
