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

// **OPTIMIZED BATCH LOADING CONFIGURATION**
const CONFIG = {
  BATCH_SIZE: 500, // Load 500 series at a time
  MAX_CONCURRENT_REQUESTS: 3,
  CACHE_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  SESSION_STORAGE_KEY: 'seriesCacheData_v2',
  SESSION_METADATA_KEY: 'seriesCacheMetadata_v2'
};

// **SESSION STORAGE HELPERS**
const saveToSessionStorage = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('Failed to save series to sessionStorage:', error);
    return false;
  }
};

const loadFromSessionStorage = (key) => {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to load series from sessionStorage:', error);
    return null;
  }
};

// **ENHANCED SERIES CACHE WITH SESSION STORAGE**
class SeriesCache {
  constructor() {
    this.cache = new Map();
    this.categoryIndex = new Map();
    this.searchCache = new Map();
    this.lastUpdate = null;
    this.isLoading = false;
    this.loadingPromise = null;
    this.dataVersion = '2.0';
  }

  isValid() {
    return this.lastUpdate && (Date.now() - this.lastUpdate) < CONFIG.CACHE_DURATION_MS;
  }

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
        totalSeries: this.cache.size,
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
      console.warn('Failed to save series cache to sessionStorage:', error);
    }
  }

  loadFromSessionStorage() {
    try {
      const metadata = loadFromSessionStorage(CONFIG.SESSION_METADATA_KEY);
      if (!metadata || metadata.dataVersion !== this.dataVersion) {
        return false;
      }

      if (Date.now() - metadata.timestamp > CONFIG.CACHE_DURATION_MS) {
        return false;
      }

      const sessionData = loadFromSessionStorage(CONFIG.SESSION_STORAGE_KEY);
      if (!sessionData || !sessionData.cache) {
        return false;
      }

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
      console.warn('Failed to load series cache from sessionStorage:', error);
      return false;
    }
  }

  set(series) {
    this.cache.clear();
    this.categoryIndex.clear();
    this.searchCache.clear();
    
    series.forEach(item => {
      const transformed = transformSeriesData(item);
      this.cache.set(transformed.id, transformed);
      
      transformed.categories.forEach(category => {
        if (!this.categoryIndex.has(category)) {
          this.categoryIndex.set(category, new Set());
        }
        this.categoryIndex.get(category).add(transformed.id);
      });
    });
    
    this.lastUpdate = Date.now();
    this.saveToSessionStorage();
  }

  search(query) {
    if (!query || query.length < 2) return [];
    
    const searchKey = query.toLowerCase();
    if (this.searchCache.has(searchKey)) {
      return this.searchCache.get(searchKey);
    }
    
    const results = Array.from(this.cache.values()).filter(series => {
      if (!series) return false;
      
      const titleMatch = series.title && series.title.toLowerCase().includes(searchKey);
      const categoryMatch = series.categories && series.categories.some(cat => 
        cat && cat.toLowerCase().includes(searchKey));
      const genreMatch = series.genres && series.genres.some(genre => 
        genre && genre.toLowerCase().includes(searchKey));
      
      return titleMatch || categoryMatch || genreMatch;
    });
    
    if (this.searchCache.size < 100) {
      this.searchCache.set(searchKey, results);
    }
    
    return results;
  }

  getAll() {
    return Array.from(this.cache.values());
  }

  get(id) {
    return this.cache.get(id);
  }

  size() {
    return this.cache.size;
  }

  clear() {
    this.cache.clear();
    this.categoryIndex.clear();
    this.searchCache.clear();
    this.lastUpdate = null;
    try {
      sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
      sessionStorage.removeItem(CONFIG.SESSION_METADATA_KEY);
    } catch (error) {
      console.warn('Failed to clear series sessionStorage:', error);
    }
  }
}

// **GLOBAL CACHE INSTANCE**
const seriesCache = new SeriesCache();

// **OPTIMIZED BATCH FETCHER FOR SERIES**
class SeriesBatchFetcher {
  constructor() {
    this.requestCount = 0;
  }

  async fetchBatch(offset, limit) {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('status', 'publish')
        .order('modified_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`❌ Series batch fetch failed:`, error.message);
      return [];
    }
  }

  async fetchProgressiveBatches() {
    // Quick first batch
    const quickBatch = await this.fetchBatch(0, 100);
    
    if (quickBatch.length > 0) {
      seriesCache.set(quickBatch);
    }

    // Background batches
    const remainingBatches = [
      { offset: 100, limit: CONFIG.BATCH_SIZE },
      { offset: 100 + CONFIG.BATCH_SIZE, limit: CONFIG.BATCH_SIZE },
    ];

    const results = [quickBatch];
    
    for (const config of remainingBatches) {
      const batchResult = await this.fetchBatch(config.offset, config.limit);
      results.push(batchResult);

      const allData = results.flat();
      if (allData.length > seriesCache.size()) {
        seriesCache.set(allData);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results.flat();
  }
}

// **MAIN LOADING FUNCTION WITH OPTIMIZATION**
const loadAllSeries = async (forceRefresh = false) => {
  if (!forceRefresh && seriesCache.isValid() && seriesCache.size() > 0) {
    return seriesCache.getAll();
  }

  if (!forceRefresh && seriesCache.loadFromSessionStorage() && seriesCache.isValid()) {
    return seriesCache.getAll();
  }

  if (seriesCache.isLoading && seriesCache.loadingPromise) {
    return seriesCache.loadingPromise;
  }

  seriesCache.isLoading = true;

  try {
    const fetcher = new SeriesBatchFetcher();
    seriesCache.loadingPromise = fetcher.fetchProgressiveBatches();
    
    const allSeries = await seriesCache.loadingPromise;
    
    if (allSeries.length > 0) {
      seriesCache.set(allSeries);
    }

    return seriesCache.getAll();
  } catch (error) {
    console.error('💥 Error loading series:', error);
    return [];
  } finally {
    seriesCache.isLoading = false;
    seriesCache.loadingPromise = null;
  }
};

// UPDATED: Enhanced series episode parser for your actual data format
const parseSeriesEpisodes = (seasonData) => {
  if (!seasonData || seasonData.trim() === '') return [];
  
  const episodes = [];
  
  try {
    // Split by "Episode " to get individual episodes
    const episodeParts = seasonData.split(/Episode\s+(\d+)\s*:/);
    
    for (let i = 1; i < episodeParts.length; i += 2) {
      const episodeNumber = parseInt(episodeParts[i]);
      const episodeLinks = episodeParts[i + 1];
      
      if (episodeLinks) {
        // Parse download links for this episode
        const links = parseEpisodeLinks(episodeLinks, episodeNumber);
        
        if (links.length > 0) {
          episodes.push({
            id: `episode_${episodeNumber}`,
            episodeNumber,
            title: `Episode ${episodeNumber}`,
            downloadLinks: links
          });
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error parsing series episodes:', error);
  }
  
  return episodes;
};

// UPDATED: Parse individual episode download links - now only handles episode streaming files
const parseEpisodeLinks = (linkString, episodeNumber) => {
  if (!linkString) return [];
  
  const links = [];
  
  try {
    // Split by " : " to separate different quality options
    const linkParts = linkString.split(' : ');
    
    linkParts.forEach((part, index) => {
      const trimmed = part.trim();
      
      // Look for URLs in square brackets or direct URLs
      const urlMatch = trimmed.match(/\[([^\]]+)\]|^(https?:\/\/[^\s,]+)/);
      if (urlMatch) {
        const url = urlMatch[1] || urlMatch[2];
        
        // Extract quality and size from the remaining text
        const remainingText = trimmed.replace(/\[[^\]]+\]/, '').replace(/^https?:\/\/[^\s,]+/, '');
        
        // Parse quality and size from format like ",720p,229.05 MB" or ",1080p,463.74 MB"
        const qualityMatch = remainingText.match(/,([^,]*(?:p|bit|K)[^,]*),([^,\n\r]+)/i) || 
                            remainingText.match(/,([^,]*),([^,\n\r]+)/);
        
        let quality = 'HD';
        let size = 'Unknown';
        
        if (qualityMatch) {
          quality = qualityMatch[1].trim() || 'HD';
          size = qualityMatch[2].trim() || 'Unknown';
        } else {
          // Fallback: try to extract quality from the text
          const qualityFallback = remainingText.match(/(480p|720p|1080p|4K|2160p)/i);
          if (qualityFallback) {
            quality = qualityFallback[1];
          }
          
          // Fallback: try to extract size
          const sizeFallback = remainingText.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);
          if (sizeFallback) {
            size = sizeFallback[1];
          }
        }
        
        // Clean up the URL (remove any trailing text)
        const cleanUrl = url.split('?')[0] + (url.includes('?') ? '?' + url.split('?')[1].split(',')[0] : '');
        
        // Create episode streaming link entry
        const linkEntry = {
          url: cleanUrl,
          name: `Episode ${episodeNumber} - ${quality}`,
          title: `Episode ${episodeNumber}`,
          quality: quality,
          size: size,
          sizeInMB: parseSizeToMB(size),
          language: extractLanguageFromName(trimmed),
          episodeNumber: episodeNumber,
          isPackage: false, // Episode streaming files are never packages
          downloadType: 'episode' // Clear categorization
        };
        
        links.push(linkEntry);
      }
    });
    
  } catch (error) {
    console.error('💥 Error parsing episode links:', error);
  }
  
  return links;
};

// NEW: Parse season zip/package links from season_zip column
const parseSeasonZipLinks = (seasonZipData) => {
  if (!seasonZipData || seasonZipData.trim() === '') return [];
  
  const links = [];
  
  try {
    // Split by " : " to separate different package options
    const zipParts = seasonZipData.split(' : ');
    
    zipParts.forEach((part, index) => {
      const trimmed = part.trim();
      
      // Look for URLs in square brackets or direct URLs
      const urlMatch = trimmed.match(/\[([^\]]+)\]|^(https?:\/\/[^\s,]+)/);
      if (urlMatch) {
        const url = urlMatch[1] || urlMatch[2];
        
        // Extract quality and size from the remaining text
        const remainingText = trimmed.replace(/\[[^\]]+\]/, '').replace(/^https?:\/\/[^\s,]+/, '');
        
        // Parse quality and size from format like ",720p,1.63 GB" or ",1080p,5.1 GB"
        const qualityMatch = remainingText.match(/,([^,]*(?:p|bit|K|Season)[^,]*),([^,\n\r]+)/i) || 
                            remainingText.match(/,([^,]*),([^,\n\r]+)/);
        
        let quality = 'Package';
        let size = 'Unknown';
        
        if (qualityMatch) {
          quality = qualityMatch[1].trim() || 'Package';
          size = qualityMatch[2].trim() || 'Unknown';
        } else {
          // Fallback: try to extract quality from the text
          const qualityFallback = remainingText.match(/(480p|720p|1080p|4K|2160p|Season)/i);
          if (qualityFallback) {
            quality = qualityFallback[1];
          }
          
          // Fallback: try to extract size
          const sizeFallback = remainingText.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);
          if (sizeFallback) {
            size = sizeFallback[1];
          }
        }
        
        // Clean up the URL (remove any trailing text)
        const cleanUrl = url.split('?')[0] + (url.includes('?') ? '?' + url.split('?')[1].split(',')[0] : '');
        
        // Create package link entry
        const linkEntry = {
          url: cleanUrl,
          name: `Season Package - ${quality}`,
          title: `Season Package`,
          quality: quality,
          size: size,
          sizeInMB: parseSizeToMB(size),
          language: extractLanguageFromName(trimmed),
          episodeNumber: 'package', // Special identifier for packages
          isPackage: true, // Season packages are always packages
          downloadType: 'package' // Clear categorization
        };
        
        links.push(linkEntry);
      }
    });
    
  } catch (error) {
    console.error('💥 Error parsing season zip links:', error);
  }
  
  return links;
};

// Transform series data
const transformSeriesData = (row) => {
  const categories = parseCategories(row.categories || '');
  
  // Parse seasons data
  const seasons = {};
  const seasonColumns = [
    'season_1', 'season_2', 'season_3', 'season_4', 'season_5',
    'season_6', 'season_7', 'season_8', 'season_9', 'season_10'
  ];
  
  seasonColumns.forEach((col, index) => {
    if (row[col] && row[col].trim() !== '') {
      const seasonNumber = index + 1;
      
      const episodes = parseSeriesEpisodes(row[col]);
      
      if (episodes.length > 0) {
        seasons[`season_${seasonNumber}`] = {
          seasonNumber,
          episodes,
          totalEpisodes: episodes.filter(ep => ep.episodeNumber !== 'complete').length
        };
      }
    }
  });
  
  // UPDATED: Parse season zip packages from season_zip column
  let seasonZipLinks = [];
  if (row.season_zip && row.season_zip.trim() !== '') {
    seasonZipLinks = parseSeasonZipLinks(row.season_zip);
  }
  
  const genres = extractGenres(categories);
  const releaseYear = extractReleaseYear(categories);
  const languages = extractLanguages(categories);
  const qualities = extractQualities(categories);
  const metadata = parseContentMetadata(row.content);
  
  // Calculate total statistics
  const totalSeasons = Object.keys(seasons).length;
  const allEpisodes = Object.values(seasons).flatMap(season => season.episodes);
  const totalEpisodes = allEpisodes.filter(ep => ep.episodeNumber !== 'complete').length;
  
  return {
    id: row.record_id?.toString() || row.url_slug,
    recordId: row.record_id,
    title: row.title,
    slug: row.url_slug,
    
    // Media assets
    featuredImage: row.featured_image,
    poster: row.poster,
    
    // Series-specific data
    isSeries: true,
    seasons,
    totalSeasons,
    totalEpisodes,
    seasonZipLinks, // NEW: Add season package links
    
    // Categories and classification
    categories,
    genres,
    languages,
    qualities,
    releaseYear,
    
    // Available qualities across all episodes
    availableQualities: [...new Set(allEpisodes.flatMap(ep => 
      ep.downloadLinks.map(link => link.quality)
    ))],
    
    // Content and metadata
    content: metadata,
    excerpt: row.excerpt,
    
    // Publishing info
    status: row.status,
    publishDate: row.date,
    modifiedDate: row.modified_date
  };
};

// Update series cache
const updateSeriesCache = (data) => {
  seriesCache.clear();
  
  data.forEach(item => {
    const transformed = transformSeriesData(item);
    seriesCache.cache.set(transformed.id, transformed);
    
    // Index series by categories
    transformed.categories.forEach(category => {
      if (!seriesCache.categoryIndex.has(category)) {
        seriesCache.categoryIndex.set(category, new Set());
      }
      seriesCache.categoryIndex.get(category).add(transformed.id);
    });
  });
  
  seriesCache.lastUpdate = Date.now();
};

// Fetch all series from database
const fetchAllSeries = async () => {
  return await loadAllSeries();
};

// All export functions
export const getAllSeries = async (limitCount = 1000) => {
  try {
    const series = await loadAllSeries();
    return series.slice(0, limitCount || series.length);
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
};

export const getSeriesById = async (id) => {
  try {
    await loadAllSeries();
    if (seriesCache.cache.has(id)) {
      return seriesCache.cache.get(id);
    }

    let { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('record_id', parseInt(id))
      .eq('status', 'publish')
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: slugData, error: slugError } = await supabase
        .from('series')
        .select('*')
        .eq('url_slug', id)
        .eq('status', 'publish')
        .single();
      
      data = slugData;
      error = slugError;
    }

    if (error) {
      console.error(`Error fetching series with ID ${id}:`, error);
      return null;
    }

    return transformSeriesData(data);
  } catch (error) {
    console.error(`Error fetching series with ID ${id}:`, error);
    return null;
  }
};

export const getSeriesEpisodes = async (seriesId, seasonNumber = null) => {
  try {
    const series = await getSeriesById(seriesId);
    if (!series) return [];

    if (seasonNumber) {
      const season = series.seasons[`season_${seasonNumber}`];
      return season ? season.episodes : [];
    }

    return Object.values(series.seasons).flatMap(season => season.episodes);
  } catch (error) {
    console.error("Error fetching series episodes:", error);
    return [];
  }
};

export const getEpisodeDownloadLinks = async (seriesId, seasonNumber, episodeNumber) => {
  try {
    const episodes = await getSeriesEpisodes(seriesId, seasonNumber);
    const episode = episodes.find(ep => ep.episodeNumber === episodeNumber);
    return episode ? episode.downloadLinks : [];
  } catch (error) {
    console.error("Error fetching episode download links:", error);
    return [];
  }
};

// Rest of export functions...
export const getSeriesByCategory = async (category, limitCount = 20) => {
  try {
    await loadAllSeries();
    
    if (!seriesCache.categoryIndex.has(category)) {
      return [];
    }
    
    const itemIds = Array.from(seriesCache.categoryIndex.get(category));
    const items = itemIds
      .map(id => seriesCache.cache.get(id))
      .filter(item => item)
      .slice(0, limitCount);
    
    return items;
  } catch (error) {
    console.error("Error fetching series by category:", error);
    return [];
  }
};

export const getSeriesByGenre = async (genre, limitCount = 20) => {
  try {
    const series = await loadAllSeries();
    
    const filtered = series
      .filter(item => item.genres.some(g => 
        g.toLowerCase().includes(genre.toLowerCase())
      ))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching series by genre:", error);
    return [];
  }
};

export const getSeriesByYear = async (year, limitCount = 20) => {
  try {
    const series = await loadAllSeries();
    
    const filtered = series
      .filter(item => item.releaseYear === parseInt(year))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching series by year:", error);
    return [];
  }
};

export const getSeriesByLanguage = async (language, limitCount = 20) => {
  try {
    const series = await loadAllSeries();
    
    const filtered = series
      .filter(item => item.languages.some(lang => 
        lang.toLowerCase().includes(language.toLowerCase())
      ))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching series by language:", error);
    return [];
  }
};

export const searchSeries = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim() === '') return [];
  
  try {
    await loadAllSeries();
    
    const results = seriesCache.search(searchQuery.trim());

    // Apply filters
    let filteredResults = results;

    if (filters.genre) {
      filteredResults = filteredResults.filter(item => 
        item.genres.some(genre => 
          genre.toLowerCase().includes(filters.genre.toLowerCase())
        )
      );
    }

    if (filters.language) {
      filteredResults = filteredResults.filter(item => 
        item.languages.some(lang => 
          lang.toLowerCase().includes(filters.language.toLowerCase())
        )
      );
    }

    if (filters.year) {
      filteredResults = filteredResults.filter(item => item.releaseYear === parseInt(filters.year));
    }

    return filteredResults.slice(0, filters.limit || 50);
  } catch (error) {
    console.error("Error searching series:", error);
    return [];
  }
};

export const clearSeriesCache = () => {
  seriesCache.clear();
};

export const refreshSeries = async () => {
  seriesCache.clear();
  return await loadAllSeries(true);
};

// **REAL-TIME DATABASE SEARCH FUNCTION**
export const searchSeriesDB = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim().length < 2) return [];

  try {
    const query = searchQuery.trim();
    console.log(`🔍 Database search for series: "${query}"`);

    let queryBuilder = supabase
      .from('series')
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
        modified_date,
        seasons
      `)
      .ilike('title', `%${query}%`)
      .eq('status', 'publish')
      .order('modified_date', { ascending: false })
      .limit(filters.limit || 30);

    // Add category/genre filters if provided
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
        console.error('❌ Series DB search error:', error);
        return [];
      }

      const transformedResults = data ? data.map(transformSeriesData).filter(Boolean) : [];
      console.log(`✅ Series DB search completed: ${transformedResults.length} results`);
      return transformedResults;
    } else {
      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error('❌ Series DB search error:', error);
        return [];
      }

      const transformedResults = data ? data.map(transformSeriesData).filter(Boolean) : [];
      console.log(`✅ Series DB search completed: ${transformedResults.length} results`);
      return transformedResults;
    }
  } catch (error) {
    if (error.message === 'Search aborted') {
      throw error; // Re-throw abort errors
    }
    console.error('❌ Series DB search failed:', error);
    return [];
  }
};

// Initialize with session storage check
setTimeout(() => {
  if (!seriesCache.loadFromSessionStorage() || !seriesCache.isValid()) {
    loadAllSeries().catch(console.error);
  }
}, 100);

export const getSeriesCacheStats = () => ({
  totalSeries: seriesCache.size(),
  isValid: seriesCache.isValid(),
  lastUpdate: seriesCache.lastUpdate
});

// Export series categories index for combined operations
export const getSeriesCategoryIndex = () => seriesCache.categoryIndex;
export const getSeriesCache = () => seriesCache.cache;
