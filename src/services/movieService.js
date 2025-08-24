import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://xbbtpakfbizkxfbvzopl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYnRwYWtmYml6a3hmYnZ6b3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NzQwODAsImV4cCI6MjA3MTM1MDA4MH0.dOe4Thbi0WnYR7CYWPLQD-x4AtiiynM9wdjaSyfxWio';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced in-memory caches with category indexing
let contentCache = new Map();
let categoryIndex = new Map();
let lastCacheUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to extract and normalize categories
const parseCategories = (categoriesString) => {
  if (!categoriesString) return [];
  return categoriesString
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
};

// Helper function to determine content type and extract quality info
const analyzeContent = (row) => {
  const categories = parseCategories(row.categories || '');
  
  // Check for seasons to determine if it's a series
  const seasonColumns = [
    'season_1', 'season_2', 'season_3', 'season_4', 'season_5',
    'season_6', 'season_7', 'season_8', 'season_9', 'season_10'
  ];
  
  const seasons = {};
  let hasSeasons = false;
  
  seasonColumns.forEach((col, index) => {
    if (row[col] && row[col].trim() !== '') {
      seasons[`season_${index + 1}`] = row[col];
      hasSeasons = true;
    }
  });

  // Extract quality information from categories
  const qualities = categories.filter(cat => 
    ['480p', '720p', '1080p', '4K', 'HD', 'Full HD'].some(quality => 
      cat.includes(quality)
    )
  );

  // Extract genres (excluding technical categories)
  const technicalCategories = [
    '480p', '720p', '1080p', '4K', 'HD', 'Full HD',
    'Hindi Dubbed Movies', 'Telugu', 'Tamil', 'Malayalam',
    'English Movies', 'Bollywood', 'Hollywood',
    'WEB-DL', 'BluRay', 'DVDRip', 'CAMRip'
  ];
  
  const genres = categories.filter(cat => 
    !technicalCategories.some(tech => cat.includes(tech)) &&
    !cat.match(/^\d{4}$/) // Exclude years
  );

  // Extract year from categories
  const years = categories.filter(cat => cat.match(/^\d{4}$/));
  const releaseYear = years.length > 0 ? parseInt(years[0]) : null;

  // Extract language information
  const languages = categories.filter(cat => 
    ['Hindi', 'Telugu', 'Tamil', 'Malayalam', 'English', 'Punjabi', 'Gujarati'].some(lang =>
      cat.includes(lang)
    )
  );

  return {
    isSeries: hasSeasons,
    seasons: hasSeasons ? seasons : null,
    qualities,
    genres,
    languages,
    releaseYear,
    allCategories: categories
  };
};

// Enhanced transform function
const transformMovieData = (row) => {
  const contentAnalysis = analyzeContent(row);
  
  // Parse links if they exist
  let downloadLinks = [];
  if (row.links) {
    try {
      // Split by comma and parse each link
      const linkPairs = row.links.split(',');
      for (let i = 0; i < linkPairs.length; i += 2) {
        if (linkPairs[i] && linkPairs[i + 1]) {
          downloadLinks.push({
            url: linkPairs[i].trim(),
            quality: linkPairs[i + 1].trim()
          });
        }
      }
    } catch (error) {
      console.warn('Error parsing links for movie:', row.title, error);
    }
  }

  // Parse content metadata if available
  let metadata = {};
  if (row.content) {
    try {
      const parsed = JSON.parse(row.content);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        metadata = {
          description: parsed[0],
          duration: parsed[1],
          rating: parsed[2]
        };
      }
    } catch (error) {
      // If parsing fails, treat as plain text description
      metadata = { description: row.content };
    }
  }

  return {
    id: row.record_id?.toString() || row.url_slug,
    recordId: row.record_id,
    title: row.title,
    slug: row.url_slug,
    
    // Media assets
    featuredImage: row.featured_image,
    poster: row.poster,
    
    // Content classification
    isSeries: contentAnalysis.isSeries,
    seasons: contentAnalysis.seasons,
    
    // Categories and classification
    categories: contentAnalysis.allCategories,
    genres: contentAnalysis.genres,
    languages: contentAnalysis.languages,
    qualities: contentAnalysis.qualities,
    releaseYear: contentAnalysis.releaseYear,
    
    // Content and metadata
    content: metadata,
    excerpt: row.excerpt,
    downloadLinks,
    
    // Publishing info
    status: row.status,
    publishDate: row.date,
    modifiedDate: row.modified_date
  };
};

// Cache management
const isCacheValid = () => {
  return lastCacheUpdate && (Date.now() - lastCacheUpdate < CACHE_DURATION);
};

const updateCache = (data) => {
  contentCache.clear();
  categoryIndex.clear();
  
  data.forEach(item => {
    const transformed = transformMovieData(item);
    contentCache.set(transformed.id, transformed);
    
    // Index by categories for faster filtering
    transformed.categories.forEach(category => {
      if (!categoryIndex.has(category)) {
        categoryIndex.set(category, new Set());
      }
      categoryIndex.get(category).add(transformed.id);
    });
  });
  
  lastCacheUpdate = Date.now();
};

// Core data fetching function
const fetchAllContent = async () => {
  if (isCacheValid() && contentCache.size > 0) {
    return Array.from(contentCache.values());
  }

  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('status', 'publish')
      .order('modified_date', { ascending: false });

    if (error) {
      console.error('Error fetching content:', error);
      return [];
    }

    updateCache(data);
    return Array.from(contentCache.values());
  } catch (error) {
    console.error("Error in fetchAllContent:", error);
    return [];
  }
};

// ---- MOVIES ----
export const getAllMovies = async (limitCount = 100) => {
  try {
    const allContent = await fetchAllContent();
    const movies = allContent
      .filter(item => !item.isSeries)
      .slice(0, limitCount || allContent.length);
    
    return movies;
  } catch (error) {
    console.error("Error fetching movies:", error);
    return [];
  }
};

// ---- SERIES ----
export const getAllSeries = async (limitCount = 100) => {
  try {
    const allContent = await fetchAllContent();
    const series = allContent
      .filter(item => item.isSeries)
      .slice(0, limitCount || allContent.length);
    
    return series;
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
};

// ---- ENHANCED CATEGORY FUNCTIONS ----
export const getAllCategories = async () => {
  try {
    await fetchAllContent(); // Ensure cache is populated
    return Array.from(categoryIndex.keys()).sort();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const getMoviesByCategory = async (category, limitCount = 20) => {
  try {
    await fetchAllContent(); // Ensure cache is populated
    
    if (!categoryIndex.has(category)) {
      return [];
    }
    
    const itemIds = Array.from(categoryIndex.get(category));
    const items = itemIds
      .map(id => contentCache.get(id))
      .filter(item => item) // Remove any null/undefined items
      .slice(0, limitCount);
    
    return items;
  } catch (error) {
    console.error("Error fetching movies by category:", error);
    return [];
  }
};

export const getMoviesByGenre = async (genre, limitCount = 20) => {
  try {
    const allContent = await fetchAllContent();
    const filtered = allContent
      .filter(item => item.genres.some(g => 
        g.toLowerCase().includes(genre.toLowerCase())
      ))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching movies by genre:", error);
    return [];
  }
};

export const getMoviesByYear = async (year, limitCount = 20) => {
  try {
    const allContent = await fetchAllContent();
    const filtered = allContent
      .filter(item => item.releaseYear === parseInt(year))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching movies by year:", error);
    return [];
  }
};

export const getMoviesByLanguage = async (language, limitCount = 20) => {
  try {
    const allContent = await fetchAllContent();
    const filtered = allContent
      .filter(item => item.languages.some(lang => 
        lang.toLowerCase().includes(language.toLowerCase())
      ))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching movies by language:", error);
    return [];
  }
};

// ---- GET BY ID ----
export const getMovieById = async (id) => {
  try {
    // First check cache
    await fetchAllContent();
    if (contentCache.has(id)) {
      return contentCache.get(id);
    }

    // If not in cache, try direct database query
    let { data, error } = await supabase
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
      
      data = slugData;
      error = slugError;
    }

    if (error) {
      console.error(`Error fetching item with ID ${id}:`, error);
      return null;
    }

    return transformMovieData(data);
  } catch (error) {
    console.error(`Error fetching item with ID ${id}:`, error);
    return null;
  }
};

// ---- ENHANCED HOME PAGE SECTIONS ----
export const getHomePageSections = async (count = 10) => {
  try {
    const allContent = await fetchAllContent();
    
    // Separate movies and series
    const movies = allContent.filter(item => !item.isSeries);
    const series = allContent.filter(item => item.isSeries);

    // Helper function to get random items
    const getRandomItems = (arr, n) => 
      [...arr].sort(() => 0.5 - Math.random()).slice(0, n);

    // Get content by specific categories
    const featured = allContent.filter(item => 
      item.categories.some(cat => cat.toLowerCase().includes('featured'))
    ).slice(0, count);

    const trending = allContent.filter(item => 
      item.categories.some(cat => cat.toLowerCase().includes('trending'))
    ).slice(0, count);

    const action = allContent.filter(item => 
      item.genres.some(genre => genre.toLowerCase().includes('action'))
    ).slice(0, count);

    const thriller = allContent.filter(item => 
      item.genres.some(genre => genre.toLowerCase().includes('thriller'))
    ).slice(0, count);

    // Recent releases (2024-2025)
    const recentReleases = allContent.filter(item => 
      item.releaseYear && item.releaseYear >= 2024
    ).slice(0, count);

    // Hindi content
    const hindiContent = allContent.filter(item => 
      item.languages.some(lang => lang.toLowerCase().includes('hindi'))
    ).slice(0, count);

    return {
      featured: featured.length ? featured : getRandomItems(movies, count),
      trending: trending.length ? trending : getRandomItems(movies, count),
      action: action.length ? action : getRandomItems(movies, count),
      thriller: thriller.length ? thriller : getRandomItems(movies, count),
      recentReleases: recentReleases.length ? recentReleases : getRandomItems(movies, count),
      hindiMovies: hindiContent.length ? hindiContent : getRandomItems(movies, count),
      series: series.slice(0, count),
      allMovies: movies.slice(0, count * 2) // More items for general browsing
    };
  } catch (error) {
    console.error("Error fetching home page sections:", error);
    return {
      featured: [],
      trending: [],
      action: [],
      thriller: [],
      recentReleases: [],
      hindiMovies: [],
      series: [],
      allMovies: []
    };
  }
};

// ---- ENHANCED SEARCH ----
export const searchContent = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim() === '') return [];
  
  try {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const allContent = await fetchAllContent();
    
    let results = allContent.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(trimmedQuery);
      const categoryMatch = item.categories.some(cat => 
        cat.toLowerCase().includes(trimmedQuery)
      );
      const genreMatch = item.genres.some(genre => 
        genre.toLowerCase().includes(trimmedQuery)
      );
      
      return titleMatch || categoryMatch || genreMatch;
    });

    // Apply filters
    if (filters.contentType === 'movies') {
      results = results.filter(item => !item.isSeries);
    } else if (filters.contentType === 'series') {
      results = results.filter(item => item.isSeries);
    }

    if (filters.genre) {
      results = results.filter(item => 
        item.genres.some(genre => 
          genre.toLowerCase().includes(filters.genre.toLowerCase())
        )
      );
    }

    if (filters.language) {
      results = results.filter(item => 
        item.languages.some(lang => 
          lang.toLowerCase().includes(filters.language.toLowerCase())
        )
      );
    }

    if (filters.year) {
      results = results.filter(item => item.releaseYear === parseInt(filters.year));
    }

    // Sort by relevance
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      
      // Exact title matches first
      if (aTitle === trimmedQuery && bTitle !== trimmedQuery) return -1;
      if (aTitle !== trimmedQuery && bTitle === trimmedQuery) return 1;
      
      // Title starts with query
      if (aTitle.startsWith(trimmedQuery) && !bTitle.startsWith(trimmedQuery)) return -1;
      if (!aTitle.startsWith(trimmedQuery) && bTitle.startsWith(trimmedQuery)) return 1;
      
      // Title contains query
      const aIncludes = aTitle.includes(trimmedQuery);
      const bIncludes = bTitle.includes(trimmedQuery);
      if (aIncludes && !bIncludes) return -1;
      if (!aIncludes && bIncludes) return 1;
      
      // Sort by recency if both match similarly
      return new Date(b.modifiedDate) - new Date(a.modifiedDate);
    });

    return results.slice(0, filters.limit || 50);
  } catch (error) {
    console.error("Error searching content:", error);
    return [];
  }
};

// ---- UTILITY FUNCTIONS ----
export const getContentStats = async () => {
  try {
    const allContent = await fetchAllContent();
    const movies = allContent.filter(item => !item.isSeries);
    const series = allContent.filter(item => item.isSeries);
    
    const genreStats = {};
    const languageStats = {};
    const yearStats = {};
    
    allContent.forEach(item => {
      // Count genres
      item.genres.forEach(genre => {
        genreStats[genre] = (genreStats[genre] || 0) + 1;
      });
      
      // Count languages
      item.languages.forEach(lang => {
        languageStats[lang] = (languageStats[lang] || 0) + 1;
      });
      
      // Count years
      if (item.releaseYear) {
        yearStats[item.releaseYear] = (yearStats[item.releaseYear] || 0) + 1;
      }
    });
    
    return {
      totalContent: allContent.length,
      totalMovies: movies.length,
      totalSeries: series.length,
      genreStats,
      languageStats,
      yearStats,
      categories: Array.from(categoryIndex.keys()).length
    };
  } catch (error) {
    console.error("Error getting content stats:", error);
    return null;
  }
};

// Clear cache function
export const clearCache = () => {
  contentCache.clear();
  categoryIndex.clear();
  lastCacheUpdate = null;
};

// Force refresh function
export const refreshData = async () => {
  clearCache();
  return await fetchAllContent();
};

// Export default object
export default {
  // Core functions
  getAllMovies,
  getAllSeries,
  getMovieById,
  searchContent,
  
  // Category functions
  getAllCategories,
  getMoviesByCategory,
  getMoviesByGenre,
  getMoviesByYear,
  getMoviesByLanguage,
  
  // Special sections
  getHomePageSections,
  
  // Utility functions
  getContentStats,
  clearCache,
  refreshData
};
