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

// Movie cache
let movieCache = new Map();
let movieCategoryIndex = new Map();
let lastMovieCacheUpdate = null;

// Cache management for movies
const isMovieCacheValid = () => {
  return lastMovieCacheUpdate && (Date.now() - lastMovieCacheUpdate < CACHE_DURATION);
};

// Transform movie data
const transformMovieData = (row) => {
  const categories = parseCategories(row.categories || '');
  
  // Enhanced link parsing for movies
  let downloadLinks = [];
  if (row.links) {
    try {
      const linkEntries = row.links.split('https://').filter(entry => entry.trim());
      
      linkEntries.forEach(entry => {
        if (entry.trim()) {
          const fullEntry = 'https://' + entry;
          const parts = fullEntry.split(',');
          
          if (parts.length >= 3) {
            const url = parts[0].trim();
            const name = parts[1].trim();
            const size = parts[2].trim();
            
            const qualityMatch = name.match(/(480p|720p|1080p|4K|2160p)/i);
            const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
            
            const titleMatch = name.match(/^(.+?)\s*\{.*?\}\s*(480p|720p|1080p|4K|2160p)/i) || 
                              name.match(/^(.+?)\s*(480p|720p|1080p|4K|2160p)/i);
            const movieTitle = titleMatch ? titleMatch[1].trim() : name;
            
            downloadLinks.push({
              url: url,
              name: name,
              title: movieTitle,
              quality: quality,
              size: size,
              sizeInMB: parseSizeToMB(size),
              language: extractLanguageFromName(name)
            });
          }
        }
      });
      
      downloadLinks.sort((a, b) => {
        const qualityOrder = { '1080p': 3, '720p': 2, '480p': 1, '4K': 4, '2160p': 4 };
        return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
      });
      
    } catch (error) {
      console.warn('Error parsing links for movie:', row.title, error);
    }
  }
  
  const genres = extractGenres(categories);
  const releaseYear = extractReleaseYear(categories);
  const languages = extractLanguages(categories);
  const qualities = extractQualities(categories);
  const metadata = parseContentMetadata(row.content);
  
  const calculateTotalSize = (links) => {
    if (links.length === 0) return { totalSizeMB: 0, sizeRange: 'Unknown' };
    
    const sizes = links.map(link => link.sizeInMB).filter(size => size > 0);
    if (sizes.length === 0) return { totalSizeMB: 0, sizeRange: 'Unknown' };
    
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    
    const formatSize = (mb) => {
      if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1)}GB`;
      }
      return `${mb.toFixed(0)}MB`;
    };
    
    return {
      totalSizeMB: sizes.reduce((a, b) => a + b, 0),
      sizeRange: minSize === maxSize ? formatSize(minSize) : `${formatSize(minSize)} - ${formatSize(maxSize)}`,
      smallestSize: formatSize(minSize),
      largestSize: formatSize(maxSize)
    };
  };
  
  return {
    id: row.record_id?.toString() || row.url_slug,
    recordId: row.record_id,
    title: row.title,
    slug: row.url_slug,
    
    // Media assets
    featuredImage: row.featured_image,
    poster: row.poster,
    
    // Content classification
    isSeries: false,
    
    // Categories and classification
    categories,
    genres,
    languages,
    qualities,
    releaseYear,
    
    // Download links
    downloadLinks,
    availableQualities: [...new Set(downloadLinks.map(link => link.quality))],
    totalSizeInfo: calculateTotalSize(downloadLinks),
    
    // Content and metadata
    content: metadata,
    excerpt: row.excerpt,
    
    // Publishing info
    status: row.status,
    publishDate: row.date,
    modifiedDate: row.modified_date
  };
};

// Update movie cache
const updateMovieCache = (data) => {
  movieCache.clear();
  movieCategoryIndex.clear();
  
  data.forEach(item => {
    const transformed = transformMovieData(item);
    movieCache.set(transformed.id, transformed);
    
    transformed.categories.forEach(category => {
      if (!movieCategoryIndex.has(category)) {
        movieCategoryIndex.set(category, new Set());
      }
      movieCategoryIndex.get(category).add(transformed.id);
    });
  });
  
  lastMovieCacheUpdate = Date.now();
};

// Fetch all movies from database
const fetchAllMovies = async () => {
  if (isMovieCacheValid() && movieCache.size > 0) {
    return Array.from(movieCache.values());
  }

  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('status', 'publish')
      .order('modified_date', { ascending: false });

    if (error) {
      console.error('Error fetching movies:', error);
      return [];
    }

    updateMovieCache(data);
    return Array.from(movieCache.values());
  } catch (error) {
    console.error("Error in fetchAllMovies:", error);
    return [];
  }
};

// Public API functions
export const getAllMovies = async (limitCount = 1000) => {
  try {
    const movies = await fetchAllMovies();
    return movies.slice(0, limitCount || movies.length);
  } catch (error) {
    console.error("Error fetching movies:", error);
    return [];
  }
};

export const getMovieById = async (id) => {
  try {
    await fetchAllMovies();
    if (movieCache.has(id)) {
      return movieCache.get(id);
    }

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
      console.error(`Error fetching movie with ID ${id}:`, error);
      return null;
    }

    return transformMovieData(data);
  } catch (error) {
    console.error(`Error fetching movie with ID ${id}:`, error);
    return null;
  }
};

export const getMoviesByCategory = async (category, limitCount = 20) => {
  try {
    await fetchAllMovies();
    
    if (!movieCategoryIndex.has(category)) {
      return [];
    }
    
    const itemIds = Array.from(movieCategoryIndex.get(category));
    const items = itemIds
      .map(id => movieCache.get(id))
      .filter(item => item)
      .slice(0, limitCount);
    
    return items;
  } catch (error) {
    console.error("Error fetching movies by category:", error);
    return [];
  }
};

export const getMoviesByGenre = async (genre, limitCount = 20) => {
  try {
    const movies = await fetchAllMovies();
    
    const filtered = movies
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
    const movies = await fetchAllMovies();
    
    const filtered = movies
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
    const movies = await fetchAllMovies();
    
    const filtered = movies
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

export const getDownloadLinksByQuality = async (movieId, quality) => {
  try {
    const movie = await getMovieById(movieId);
    if (!movie) return [];
    
    return movie.downloadLinks.filter(link => 
      link.quality.toLowerCase() === quality.toLowerCase()
    );
  } catch (error) {
    console.error("Error fetching download links by quality:", error);
    return [];
  }
};

export const getRecommendedDownload = async (movieId) => {
  try {
    const movie = await getMovieById(movieId);
    if (!movie || !movie.downloadLinks.length) return null;
    
    return movie.downloadLinks[0];
  } catch (error) {
    console.error("Error fetching recommended download:", error);
    return null;
  }
};

export const searchMovies = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim() === '') return [];
  
  try {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const movies = await fetchAllMovies();
    
    let results = movies.filter(item => {
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
      
      if (aTitle === trimmedQuery && bTitle !== trimmedQuery) return -1;
      if (aTitle !== trimmedQuery && bTitle === trimmedQuery) return 1;
      
      if (aTitle.startsWith(trimmedQuery) && !bTitle.startsWith(trimmedQuery)) return -1;
      if (!aTitle.startsWith(trimmedQuery) && bTitle.startsWith(trimmedQuery)) return 1;
      
      const aIncludes = aTitle.includes(trimmedQuery);
      const bIncludes = bTitle.includes(trimmedQuery);
      if (aIncludes && !bIncludes) return -1;
      if (!aIncludes && bIncludes) return 1;
      
      return new Date(b.modifiedDate) - new Date(a.modifiedDate);
    });

    return results.slice(0, filters.limit || 50);
  } catch (error) {
    console.error("Error searching movies:", error);
    return [];
  }
};

export const clearMovieCache = () => {
  movieCache.clear();
  movieCategoryIndex.clear();
  lastMovieCacheUpdate = null;
};

export const refreshMovies = async () => {
  clearMovieCache();
  return await fetchAllMovies();
};

// Export movie categories index for combined operations
export const getMovieCategoryIndex = () => movieCategoryIndex;
export const getMovieCache = () => movieCache;
