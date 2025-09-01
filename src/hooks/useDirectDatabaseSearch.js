// **DIRECT DATABASE SEARCH HOOK**
// Connects search directly to database for real-time results

import { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../services/supabaseClient';

// **CONFIGURATION**
const CONFIG = {
  SEARCH_DEBOUNCE_MS: 800, // Increased from 300 to 800ms to reduce requests
  MAX_RESULTS: 20, // Reduced from 50 to 20 for faster response
  MIN_SEARCH_LENGTH: 3, // Increased from 2 to 3 to reduce requests
  SEARCH_TIMEOUT_MS: 5000
};

// **DIRECT DATABASE SEARCH FUNCTION**
const searchDatabase = async (query, contentType, signal) => {
  if (!query || query.length < CONFIG.MIN_SEARCH_LENGTH) {
    return [];
  }

  try {
    const tableName = contentType === 'movies' ? 'movies' : 
                     contentType === 'series' ? 'series' : 'anime';
    
    // Create simplified search query - only search by title for better performance
    const searchQuery = supabase
      .from(tableName)
      .select(`
        record_id,
        title,
        url_slug,
        featured_image,
        poster,
        categories,
        content,
        excerpt,
        status,
        date,
        modified_date
      `)
      .eq('status', 'publish')
      .ilike('title', `%${query}%`) // Simplified to only search title
      .order('modified_date', { ascending: false })
      .limit(CONFIG.MAX_RESULTS);

    // Execute with abort signal for cancellation
    const { data, error } = await searchQuery.abortSignal(signal);

    if (error) {
      if (error.name === 'AbortError') {
        return []; // Search was cancelled
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      return [];
    }
    console.error(`Database search error for ${contentType}:`, error);
    throw error;
  }
};

// **DIRECT DATABASE SEARCH HOOK**
export const useDirectDatabaseSearch = (searchQuery, contentType) => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const abortControllerRef = useRef(null);
  const searchCacheRef = useRef(new Map());

  // **DEBOUNCED SEARCH FUNCTION**
  const performSearch = useCallback(async (query, type) => {
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query || query.length < CONFIG.MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    // Check cache first
    const cacheKey = `${type}_${query.toLowerCase()}`;
    if (searchCacheRef.current.has(cacheKey)) {
      setSearchResults(searchCacheRef.current.get(cacheKey));
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const results = await searchDatabase(query, type, abortControllerRef.current.signal);
      
      // Transform results based on content type
      const transformedResults = results.map(item => {
        const baseData = {
          id: item.record_id?.toString() || item.url_slug,
          recordId: item.record_id,
          title: item.title,
          slug: item.url_slug,
          featuredImage: item.featured_image,
          poster: item.poster,
          categories: item.categories ? item.categories.split(',').map(c => c.trim()) : [],
          content: item.content,
          excerpt: item.excerpt,
          publishDate: item.date,
          modifiedDate: item.modified_date,
          releaseYear: extractYearFromCategories(item.categories)
        };

        if (type === 'movies') {
          return {
            ...baseData,
            isSeries: false,
            // Don't parse download links during search to reduce processing time
            downloadLinks: [],
          };
        } else {
          // For series and anime
          const hasEpisodes = item.season_1 || item.season_2 || item.season_3;
          return {
            ...baseData,
            isSeries: true,
            isAnime: type === 'anime',
            hasEpisodes: !!hasEpisodes,
            totalSeasons: [item.season_1, item.season_2, item.season_3].filter(Boolean).length
          };
        }
      });

      // Cache results
      if (searchCacheRef.current.size > 50) {
        // Clear old cache entries
        const keys = Array.from(searchCacheRef.current.keys());
        keys.slice(0, 25).forEach(key => searchCacheRef.current.delete(key));
      }
      searchCacheRef.current.set(cacheKey, transformedResults);

      setSearchResults(transformedResults);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setSearchError(error.message || 'Search failed');
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  }, []);

  // **DEBOUNCED EFFECT**
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery, contentType);
    }, CONFIG.SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, contentType, performSearch]);

  // **CLEANUP**
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchResults,
    isSearching,
    searchError,
    clearCache: () => searchCacheRef.current.clear()
  };
};

// **UTILITY FUNCTIONS**
const extractYearFromCategories = (categories) => {
  if (!categories) return null;
  const yearMatch = categories.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : null;
};

const parseMovieLinks = (linksString) => {
  if (!linksString) return [];
  
  try {
    const links = [];
    const linkEntries = linksString.split('https://').filter(entry => entry.trim());
    
    linkEntries.slice(0, 3).forEach(entry => { // Limit to 3 links for performance
      if (entry.trim()) {
        const fullEntry = 'https://' + entry;
        const parts = fullEntry.split(',');
        
        if (parts.length >= 3) {
          const qualityMatch = parts[1].match(/(480p|720p|1080p|4K|2160p)/i);
          links.push({
            url: parts[0].trim(),
            quality: qualityMatch ? qualityMatch[1] : 'HD',
            size: parts[2].trim()
          });
        }
      }
    });
    
    return links;
  } catch (error) {
    console.warn('Error parsing movie links:', error);
    return [];
  }
};

// **ADVANCED SEARCH HOOK WITH FILTERS**
export const useAdvancedDatabaseSearch = (searchQuery, contentType, filters = {}) => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchStats, setSearchStats] = useState({ total: 0, searchTime: 0 });
  const abortControllerRef = useRef(null);

  const performAdvancedSearch = useCallback(async (query, type, searchFilters) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query || query.length < CONFIG.MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      setSearchStats({ total: 0, searchTime: 0 });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const startTime = Date.now();

    abortControllerRef.current = new AbortController();

    try {
      const tableName = type === 'movies' ? 'movies' : 
                      type === 'series' ? 'series' : 'anime';

      let queryBuilder = supabase
        .from(tableName)
        .select('*')
        .eq('status', 'publish');

      // Add search conditions
      const searchConditions = [];
      searchConditions.push(`title.ilike.%${query}%`);
      searchConditions.push(`categories.ilike.%${query}%`);
      
      if (searchConditions.length > 0) {
        queryBuilder = queryBuilder.or(searchConditions.join(','));
      }

      // Add filters
      if (searchFilters.genre) {
        queryBuilder = queryBuilder.ilike('categories', `%${searchFilters.genre}%`);
      }

      if (searchFilters.year) {
        queryBuilder = queryBuilder.ilike('categories', `%${searchFilters.year}%`);
      }

      if (searchFilters.language) {
        queryBuilder = queryBuilder.ilike('categories', `%${searchFilters.language}%`);
      }

      const { data, error } = await queryBuilder
        .order('modified_date', { ascending: false })
        .limit(searchFilters.limit || CONFIG.MAX_RESULTS)
        .abortSignal(abortControllerRef.current.signal);

      if (error) {
        if (error.name === 'AbortError') return;
        throw error;
      }

      const searchTime = Date.now() - startTime;
      
      setSearchResults(data || []);
      setSearchStats({ 
        total: data?.length || 0, 
        searchTime 
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Advanced search error:', error);
        setSearchError(error.message || 'Advanced search failed');
        setSearchResults([]);
        setSearchStats({ total: 0, searchTime: 0 });
      }
    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAdvancedSearch(searchQuery, contentType, filters);
    }, CONFIG.SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, contentType, filters, performAdvancedSearch]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchResults,
    isSearching,
    searchError,
    searchStats
  };
};

// **LAZY DOWNLOAD LINKS HOOK**
// Only fetch download links when user requests them
export const useLazyDownloadLinks = () => {
  const [downloadData, setDownloadData] = useState(new Map());
  const [isLoading, setIsLoading] = useState(new Set());

  const fetchDownloadLinks = useCallback(async (contentId, contentType) => {
    if (downloadData.has(contentId) || isLoading.has(contentId)) {
      return downloadData.get(contentId) || null;
    }

    setIsLoading(prev => new Set([...prev, contentId]));

    try {
      const tableName = contentType === 'movies' ? 'movies' : 
                      contentType === 'series' ? 'series' : 'anime';

      const { data, error } = await supabase
        .from(tableName)
        .select('links, season_1, season_2, season_3, season_zip')
        .eq('record_id', parseInt(contentId))
        .single();

      if (error) throw error;

      const linkData = {
        id: contentId,
        type: contentType,
        links: data.links || '',
        season_1: data.season_1 || '',
        season_2: data.season_2 || '',
        season_3: data.season_3 || '',
        season_zip: data.season_zip || '',
        fetchedAt: Date.now()
      };

      setDownloadData(prev => new Map([...prev, [contentId, linkData]]));
      return linkData;
    } catch (error) {
      console.error(`Error fetching download links for ${contentId}:`, error);
      return null;
    } finally {
      setIsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });
    }
  }, [downloadData, isLoading]);

  const isLoadingLinks = useCallback((contentId) => {
    return isLoading.has(contentId);
  }, [isLoading]);

  const getDownloadLinks = useCallback((contentId) => {
    return downloadData.get(contentId) || null;
  }, [downloadData]);

  return {
    fetchDownloadLinks,
    isLoadingLinks,
    getDownloadLinks,
    clearCache: () => {
      setDownloadData(new Map());
      setIsLoading(new Set());
    }
  };
};

export default useDirectDatabaseSearch;
