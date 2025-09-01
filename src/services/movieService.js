import supabase from './supabaseClient.js';
import { 
  parseCategories, 
  parseSizeToMB, 
  extractLanguageFromName,
  CACHE_DURATION,
  extractGenres,
  extractReleaseYear,
  extractLanguages,
  extractQualities,
  parseContentMetadata
} from './utils.js';

// **CONFIGURATION**
const CONFIG = {
  INITIAL_LOAD_COUNT: 100,
  MAX_TOTAL_REQUESTS: 10,
  BATCH_SIZE: 800,
  MAX_CONCURRENT_REQUESTS: 4,
  CACHE_DURATION_MS: 15 * 60 * 1000, // Increased to 15 minutes for better performance
  REQUEST_TIMEOUT_MS: 5000,
  SESSION_STORAGE_KEY: 'movieCacheData_v2',
  SESSION_METADATA_KEY: 'movieCacheMetadata_v2'
};

// **SESSION STORAGE HELPERS**
const saveToSessionStorage = (key, data) => {
  try {
    const compressed = JSON.stringify(data);
    sessionStorage.setItem(key, compressed);
    return true;
  } catch (error) {
    console.warn('Failed to save to sessionStorage:', error);
    return false;
  }
};

const loadFromSessionStorage = (key) => {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to load from sessionStorage:', error);
    return null;
  }
};

const clearSessionStorage = () => {
  try {
    sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
    sessionStorage.removeItem(CONFIG.SESSION_METADATA_KEY);
  } catch (error) {
    console.warn('Failed to clear sessionStorage:', error);
  }
};

// **ENHANCED CACHE WITH SESSION STORAGE**
class MovieCache {
  constructor() {
    this.cache = new Map();
    this.categoryIndex = new Map();
    this.searchCache = new Map();
    this.lastUpdate = null;
    this.isLoading = false;
    this.loadingPromise = null;
    this.dataVersion = '2.0'; // Version for cache invalidation
  }

  isValid() {
    return this.lastUpdate && (Date.now() - this.lastUpdate) < CONFIG.CACHE_DURATION_MS;
  }

  // **SAVE TO SESSION STORAGE**
  saveToSessionStorage() {
    try {
      const cacheData = Array.from(this.cache.entries());
      const categoryIndexData = Array.from(this.categoryIndex.entries()).map(([key, value]) => [
        key, 
        Array.from(value)
      ]);
      
      const metadata = {
        lastUpdate: this.lastUpdate,
        dataVersion: this.dataVersion,
        totalMovies: this.cache.size,
        timestamp: Date.now()
      };

      const sessionData = {
        cache: cacheData,
        categoryIndex: categoryIndexData,
        metadata
      };

      saveToSessionStorage(CONFIG.SESSION_STORAGE_KEY, sessionData);
      saveToSessionStorage(CONFIG.SESSION_METADATA_KEY, metadata);
    } catch (error) {
      console.warn('Failed to save cache to sessionStorage:', error);
    }
  }

  // **LOAD FROM SESSION STORAGE**
  loadFromSessionStorage() {
    try {
      const metadata = loadFromSessionStorage(CONFIG.SESSION_METADATA_KEY);
      if (!metadata || metadata.dataVersion !== this.dataVersion) {
        clearSessionStorage();
        return false;
      }

      // Check if data is still valid
      if (Date.now() - metadata.timestamp > CONFIG.CACHE_DURATION_MS) {
        clearSessionStorage();
        return false;
      }

      const sessionData = loadFromSessionStorage(CONFIG.SESSION_STORAGE_KEY);
      if (!sessionData || !sessionData.cache) {
        return false;
      }

      // Restore cache
      this.cache.clear();
      this.categoryIndex.clear();
      
      sessionData.cache.forEach(([key, value]) => {
        this.cache.set(key, value);
      });

      sessionData.categoryIndex.forEach(([key, valueArray]) => {
        this.categoryIndex.set(key, new Set(valueArray));
      });

      this.lastUpdate = metadata.lastUpdate;
      
      return true;
    } catch (error) {
      console.warn('Failed to load cache from sessionStorage:', error);
      clearSessionStorage();
      return false;
    }
  }

  set(movies) {
    this.cache.clear();
    this.categoryIndex.clear();
    this.searchCache.clear(); // Clear search cache when main cache updates
    
    movies.forEach(movie => {
      const transformed = transformMovieData(movie);
      this.cache.set(transformed.id, transformed);
      
      // Build category index
      if (transformed.categories && Array.isArray(transformed.categories)) {
        transformed.categories.forEach(category => {
          if (!this.categoryIndex.has(category)) {
            this.categoryIndex.set(category, new Set());
          }
          this.categoryIndex.get(category).add(transformed.id);
        });
      }
    });
    
    this.lastUpdate = Date.now();
    
    // Save to session storage for persistence
    this.saveToSessionStorage();
  }

  get(id) {
    return this.cache.get(id);
  }

  getAll() {
    return Array.from(this.cache.values());
  }

  // **OPTIMIZED SEARCH WITH PERSISTENT CACHE**
  search(query) {
    if (!query || query.length < 2) return [];
    
    const searchKey = query.toLowerCase();
    
    // Check search cache first (in-memory for session)
    if (this.searchCache.has(searchKey)) {
      return this.searchCache.get(searchKey);
    }
    
    const results = this.getAll().filter(movie => {
      if (!movie) return false;
      
      const titleMatch = movie.title && movie.title.toLowerCase().includes(searchKey);
      const categoryMatch = movie.categories && Array.isArray(movie.categories) && 
        movie.categories.some(cat => cat && cat.toLowerCase().includes(searchKey));
      const genreMatch = movie.genres && Array.isArray(movie.genres) && 
        movie.genres.some(genre => genre && genre.toLowerCase().includes(searchKey));
      
      return titleMatch || categoryMatch || genreMatch;
    });
    
    // Cache search results (limit cache size to prevent memory issues)
    if (this.searchCache.size < 100) {
      this.searchCache.set(searchKey, results);
    }
    
    return results;
  }

  clear() {
    this.cache.clear();
    this.categoryIndex.clear();
    this.searchCache.clear();
    this.lastUpdate = null;
    this.isLoading = false;
    this.loadingPromise = null;
    clearSessionStorage();
  }

  size() {
    return this.cache.size;
  }
}

// **GLOBAL CACHE INSTANCE**
const movieCache = new MovieCache();

// **OPTIMIZED DATA TRANSFORMATION**
const transformMovieData = (row) => {
  if (!row) return null;
  
  const categories = parseCategories(row.categories || '').slice(0, 5);
  
  // Minimal link processing
  let downloadLinks = [];
  if (row.links) {
    try {
      const linkEntries = row.links.split('https://').filter(entry => entry.trim()).slice(0, 2);
      
      linkEntries.forEach(entry => {
        if (entry.trim()) {
          const fullEntry = 'https://' + entry;
          const parts = fullEntry.split(',');
          
          if (parts.length >= 3) {
            const qualityMatch = parts[1].match(/(480p|720p|1080p|4K|2160p)/i);
            downloadLinks.push({
              url: parts[0].trim(),
              quality: qualityMatch ? qualityMatch[1] : 'HD',
              size: parts[2].trim()
            });
          }
        }
      });
    } catch (error) {
      console.warn('Link parsing error for movie:', row.title);
    }
  }
  
  return {
    id: row.record_id?.toString() || row.url_slug,
    recordId: row.record_id,
    title: row.title || 'Untitled',
    slug: row.url_slug,
    featuredImage: row.featured_image,
    poster: row.poster,
    isSeries: false,
    categories: categories || [],
    genres: extractGenres(categories).slice(0, 3) || [],
    languages: extractLanguages(categories).slice(0, 2) || [],
    qualities: extractQualities(categories).slice(0, 3) || [],
    releaseYear: extractReleaseYear(categories),
    downloadLinks: downloadLinks || [],
    availableQualities: [...new Set(downloadLinks.map(link => link.quality))],
    content: parseContentMetadata(row.content),
    excerpt: row.excerpt,
    status: row.status,
    publishDate: row.date,
    modifiedDate: row.modified_date
  };
};

// **OPTIMIZED BATCH FETCHER WITH PROGRESSIVE LOADING**
class ConcurrentBatchFetcher {
  constructor() {
    this.requestCount = 0;
  }

  async fetchBatch(offset, limit, description = '') {
    if (this.requestCount >= CONFIG.MAX_TOTAL_REQUESTS) {
      console.warn('Request limit reached');
      return [];
    }

    this.requestCount++;

    try {
      const { data, error } = await supabase
        .from('movies')
        .select(`
          record_id,
          title,
          url_slug,
          featured_image,
          poster,
          categories,
          links,
          content,
          excerpt,
          status,
          date,
          modified_date
        `)
        .eq('status', 'publish')
        .order('modified_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      return [];
    }
  }

  // **PROGRESSIVE LOADING - Load in smaller chunks for faster initial response**
  async fetchProgressiveBatches() {
    // First load a smaller batch quickly
    const quickBatch = await this.fetchBatch(0, 200, 'Quick Load');
    
    if (quickBatch.length > 0) {
      // Update cache with initial data immediately
      movieCache.set(quickBatch);
    }

    // Then load remaining data in background
    const remainingBatches = [
      { offset: 200, limit: CONFIG.BATCH_SIZE, description: 'Batch 2' },
      { offset: 200 + CONFIG.BATCH_SIZE, limit: CONFIG.BATCH_SIZE, description: 'Batch 3' },
      { offset: 200 + CONFIG.BATCH_SIZE * 2, limit: CONFIG.BATCH_SIZE, description: 'Batch 4' },
    ];

    const results = [quickBatch];
    
    for (let i = 0; i < remainingBatches.length; i += CONFIG.MAX_CONCURRENT_REQUESTS) {
      if (this.requestCount >= CONFIG.MAX_TOTAL_REQUESTS) break;

      const batchGroup = remainingBatches.slice(i, i + CONFIG.MAX_CONCURRENT_REQUESTS);
      const promises = batchGroup.map(config => 
        this.fetchBatch(config.offset, config.limit, config.description)
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Update cache progressively
      const allData = results.flat();
      if (allData.length > movieCache.size()) {
        movieCache.set(allData);
      }

      // Small delay between batches
      if (i + CONFIG.MAX_CONCURRENT_REQUESTS < remainingBatches.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return results.flat();
  }
}

// **OPTIMIZED MAIN LOADING FUNCTION**
const loadAllMovies = async (forceRefresh = false) => {
  // First check in-memory cache
  if (!forceRefresh && movieCache.isValid() && movieCache.size() > 0) {
    return movieCache.getAll();
  }

  // Try loading from session storage first
  if (!forceRefresh && movieCache.loadFromSessionStorage() && movieCache.isValid() && movieCache.size() > 0) {
    return movieCache.getAll();
  }

  // Prevent multiple simultaneous loads
  if (movieCache.isLoading && movieCache.loadingPromise) {
    return movieCache.loadingPromise;
  }

  movieCache.isLoading = true;

  try {
    const fetcher = new ConcurrentBatchFetcher();
    movieCache.loadingPromise = fetcher.fetchProgressiveBatches();
    
    const allMovies = await movieCache.loadingPromise;
    
    if (allMovies.length > 0) {
      movieCache.set(allMovies);
    }

    return movieCache.getAll();
  } catch (error) {
    console.error('💥 Error loading movies:', error);
    return [];
  } finally {
    movieCache.isLoading = false;
    movieCache.loadingPromise = null;
  }
};

// **PUBLIC API WITH SESSION STORAGE OPTIMIZATION**

export const getAllMovies = async (limitCount) => {
  try {
    const movies = await loadAllMovies();
    return limitCount ? movies.slice(0, limitCount) : movies;
  } catch (error) {
    console.error('Error in getAllMovies:', error);
    return [];
  }
};

export const searchMovies = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return [];
  }

  try {
    const query = searchQuery.trim();

    // Ensure data is loaded (from cache or session storage first)
    await loadAllMovies();
    
    if (movieCache.size() === 0) {
      console.warn('No movies in cache, cannot search');
      return [];
    }

    // Search in cache (already optimized with search result caching)
    let results = movieCache.search(query);
    
    // Apply filters
    if (filters.genre && results.length > 0) {
      const genreFilter = filters.genre.toLowerCase();
      results = results.filter(movie => 
        movie.genres && movie.genres.some(genre => 
          genre && genre.toLowerCase().includes(genreFilter)
        )
      );
    }
    
    if (filters.language && results.length > 0) {
      const langFilter = filters.language.toLowerCase();
      results = results.filter(movie => 
        movie.languages && movie.languages.some(lang => 
          lang && lang.toLowerCase().includes(langFilter)
        )
      );
    }
    
    if (filters.year && results.length > 0) {
      const yearFilter = parseInt(filters.year);
      results = results.filter(movie => movie.releaseYear === yearFilter);
    }
    
    const finalResults = results.slice(0, filters.limit || 50);
    
    return finalResults;
  } catch (error) {
    console.error('💥 Search error:', error);
    return [];
  }
};

// **ENHANCED DATABASE SEARCH WITH ABORT SIGNAL SUPPORT**
export const searchMoviesDB = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim().length < 2) return [];

  try {
    const query = searchQuery.trim();
    console.log(`🔍 Database search for movies: "${query}"`);

    let queryBuilder = supabase
      .from('movies')
      .select(`
        record_id,
        title,
        url_slug,
        featured_image,
        poster,
        categories,
        links,
        content,
        excerpt,
        status,
        date,
        modified_date
      `)
      .ilike('title', `%${query}%`)
      .eq('status', 'publish')
      .order('modified_date', { ascending: false })
      .limit(filters.limit || 30);

    if (filters.genre) {
      queryBuilder = queryBuilder.ilike('categories', `%${filters.genre}%`);
    }
    if (filters.language) {
      queryBuilder = queryBuilder.ilike('categories', `%${filters.language}%`);
    }
    if (filters.year) {
      queryBuilder = queryBuilder.eq('release_year', filters.year);
    }

    // Add abort signal support for cancelling requests
    if (filters.signal) {
      const abortPromise = new Promise((_, reject) => {
        filters.signal.addEventListener('abort', () => {
          reject(new Error('Search aborted'));
        });
      });
      
      const searchPromise = queryBuilder;
      const result = await Promise.race([searchPromise, abortPromise]);
      
      const { data, error } = result;
      
      if (error) {
        console.error('❌ Movie DB search error:', error);
        return [];
      }

      const transformedResults = data ? data.map(transformMovieData).filter(Boolean) : [];
      console.log(`✅ Movie DB search completed: ${transformedResults.length} results`);
      return transformedResults;
    } else {
      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error('❌ Movie DB search error:', error);
        return [];
      }

      const transformedResults = data ? data.map(transformMovieData).filter(Boolean) : [];
      console.log(`✅ Movie DB search completed: ${transformedResults.length} results`);
      return transformedResults;
    }
  } catch (error) {
    if (error.message === 'Search aborted') {
      throw error; // Re-throw abort errors
    }
    console.error('❌ Movie DB search failed:', error);
    return [];
  }
};

export const getMovieById = async (id) => {
  try {
    // Check cache first (in-memory then session storage)
    if (movieCache.size() > 0) {
      const movie = movieCache.get(id);
      if (movie) {
        return movie;
      }
    }

    // Try to load cache from session storage
    if (movieCache.loadFromSessionStorage() && movieCache.size() > 0) {
      const movie = movieCache.get(id);
      if (movie) {
        return movie;
      }
    }

    // Ensure full cache is loaded
    await loadAllMovies();
    const movie = movieCache.get(id);
    if (movie) return movie;

    // Fallback to individual fetch (rarely needed now)
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('record_id', parseInt(id))
      .eq('status', 'publish')
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: slugData, error: slugError } = await supabase
        .from('movies')
        .select('*')
        .eq('url_slug', id)
        .eq('status', 'publish')
        .single();
      
      return slugError ? null : transformMovieData(slugData);
    }

    return error ? null : transformMovieData(data);
  } catch (error) {
    console.error(`Error fetching movie ${id}:`, error);
    return null;
  }
};

// **OPTIMIZED CATEGORY/GENRE/YEAR/LANGUAGE FUNCTIONS**
export const getMoviesByCategory = async (category, limitCount = 20) => {
  try {
    await loadAllMovies(); // Loads from session storage if available
    
    if (movieCache.categoryIndex.has(category)) {
      const movieIds = Array.from(movieCache.categoryIndex.get(category));
      const movies = movieIds
        .map(id => movieCache.get(id))
        .filter(movie => movie)
        .slice(0, limitCount);
      return movies;
    }

    // Fallback to filtering all movies
    const movies = movieCache.getAll();
    const filtered = movies.filter(movie => 
      movie.categories && movie.categories.some(cat => 
        cat && cat.toLowerCase().includes(category.toLowerCase())
      )
    );
    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching movies by category:', error);
    return [];
  }
};

export const getMoviesByGenre = async (genre, limitCount = 20) => {
  try {
    await loadAllMovies();
    const movies = movieCache.getAll();
    const filtered = movies.filter(movie => 
      movie.genres && movie.genres.some(g => 
        g && g.toLowerCase().includes(genre.toLowerCase())
      )
    );
    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return [];
  }
};

export const getMoviesByYear = async (year, limitCount = 20) => {
  try {
    await loadAllMovies();
    const movies = movieCache.getAll();
    const filtered = movies.filter(movie => movie.releaseYear === parseInt(year));
    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching movies by year:', error);
    return [];
  }
};

export const getMoviesByLanguage = async (language, limitCount = 20) => {
  try {
    await loadAllMovies();
    const movies = movieCache.getAll();
    const filtered = movies.filter(movie => 
      movie.languages && movie.languages.some(lang => 
        lang && lang.toLowerCase().includes(language.toLowerCase())
      )
    );
    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching movies by language:', error);
    return [];
  }
};

// **UTILITY FUNCTIONS**

export const getCacheStats = () => {
  const metadata = loadFromSessionStorage(CONFIG.SESSION_METADATA_KEY);
  return {
    totalMovies: movieCache.size(),
    isValid: movieCache.isValid(),
    lastUpdate: movieCache.lastUpdate,
    isLoading: movieCache.isLoading,
    config: CONFIG,
    sessionStorageSize: metadata ? metadata.totalMovies : 0,
    hasSessionData: !!metadata
  };
};

export const clearCache = () => {
  movieCache.clear();
};

export const isDataReady = () => movieCache.size() > 0;

export const refreshMovies = async () => {
  clearCache();
  return await loadAllMovies(true); // Force refresh
};

// **PRELOAD FUNCTION FOR FASTER INITIAL LOAD**
export const preloadMovieData = async () => {
  // This can be called early in app lifecycle
  if (movieCache.loadFromSessionStorage() && movieCache.isValid()) {
    return true; // Data already available
  }
  
  // Start loading in background
  loadAllMovies().catch(console.error);
  return false;
};

// **AUTO-INITIALIZE WITH SESSION STORAGE CHECK**
export const initializeMovieService = () => {
  // Try to load from session storage first
  if (movieCache.loadFromSessionStorage() && movieCache.isValid()) {
    return; // Already loaded from session
  }
  
  // Otherwise start loading from database
  loadAllMovies().catch(error => {
    console.error('❌ Initialization failed:', error);
  });
};

// Auto-start with delay to not block initial render
setTimeout(initializeMovieService, 50);

// Export cache for debugging
export const getMovieCache = () => movieCache;
