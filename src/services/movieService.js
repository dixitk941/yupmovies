import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://xbbtpakfbizkxfbvzopl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYnRwYWtmYml6a3hmYnZ6b3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NzQwODAsImV4cCI6MjA3MTM1MDA4MH0.dOe4Thbi0WnYR7CYWPLQD-x4AtiiynM9wdjaSyfxWio';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced in-memory caches with category indexing
let contentCache = new Map();
let seriesCache = new Map();
let categoryIndex = new Map();
let lastCacheUpdate = null;
let lastSeriesCacheUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to extract and normalize categories
const parseCategories = (categoriesString) => {
  if (!categoriesString) return [];
  return categoriesString
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
};

// Helper function to parse size to MB for comparison
const parseSizeToMB = (sizeString) => {
  if (!sizeString) return 0;
  
  const size = parseFloat(sizeString);
  if (sizeString.toLowerCase().includes('gb')) {
    return size * 1024; // Convert GB to MB
  } else if (sizeString.toLowerCase().includes('mb')) {
    return size;
  } else if (sizeString.toLowerCase().includes('kb')) {
    return size / 1024; // Convert KB to MB
  }
  return 0;
};

// Helper function to extract language from name
const extractLanguageFromName = (name) => {
  const languagePatterns = [
    'English with Subtitles',
    'Hindi Dubbed',
    'Tamil',
    'Telugu',
    'Malayalam',
    'Punjabi',
    'English',
    'Hindi'
  ];
  
  for (let pattern of languagePatterns) {
    if (name.includes(pattern)) {
      return pattern;
    }
  }
  return 'Unknown';
};

// **NEW: Enhanced series episode parser**
const parseSeriesEpisodes = (seasonData) => {
  if (!seasonData || seasonData.trim() === '') return [];
  
  const episodes = [];
  
  try {
    // Remove the season header (e.g., "Season 1 English 480p Esubs [150MB/E]")
    let cleanData = seasonData.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');
    
    // Extract content between braces
    const match = cleanData.match(/^{(.*)}$/);
    if (!match) return [];
    
    const content = match[1];
    
    // Split by "Episode" keyword to get individual episodes
    const episodeParts = content.split(/Episode\s+(\d+)\s*:/);
    
    for (let i = 1; i < episodeParts.length; i += 2) {
      const episodeNumber = parseInt(episodeParts[i]);
      const episodeLinks = episodeParts[i + 1];
      
      if (episodeLinks) {
        // Parse download links for this episode
        const links = parseEpisodeLinks(episodeLinks, episodeNumber);
        
        if (links.length > 0) {
          episodes.push({
            episodeNumber,
            title: `Episode ${episodeNumber}`,
            downloadLinks: links
          });
        }
      }
    }
    
    // Also parse season-wide download links
    const seasonMatch = content.match(/Season\s+\d+\s*:\s*([^:]+)/);
    if (seasonMatch) {
      const seasonLinks = parseEpisodeLinks(seasonMatch[1], null);
      if (seasonLinks.length > 0) {
        episodes.push({
          episodeNumber: 'complete',
          title: 'Complete Season',
          downloadLinks: seasonLinks
        });
      }
    }
    
  } catch (error) {
    console.warn('Error parsing series episodes:', error);
  }
  
  return episodes;
};

// **NEW: Parse individual episode download links**
const parseEpisodeLinks = (linkString, episodeNumber) => {
  if (!linkString) return [];
  
  const links = [];
  
  try {
    // Split by " : " to separate different quality options
    const linkParts = linkString.split(' : ');
    
    linkParts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith('https://')) {
        // Parse format: URL,quality,size
        const segments = trimmed.split(',');
        
        if (segments.length >= 3) {
          const url = segments[0].trim();
          const quality = segments[1].trim();
          const size = segments[2].trim();
          
          // Extract title from URL or use episode info
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1] || '';
          const cleanTitle = filename.replace(/\.(mkv|mp4|avi)$/, '');
          
          links.push({
            url: url,
            name: cleanTitle || `Episode ${episodeNumber} - ${quality}`,
            title: cleanTitle || `Episode ${episodeNumber}`,
            quality: quality,
            size: size,
            sizeInMB: parseSizeToMB(size),
            language: extractLanguageFromName(cleanTitle || ''),
            episodeNumber: episodeNumber
          });
        }
      }
    });
    
  } catch (error) {
    console.warn('Error parsing episode links:', error);
  }
  
  return links;
};

// **NEW: Transform series data**
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
  
  // Extract genres and other metadata
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
  
  const years = categories.filter(cat => cat.match(/^\d{4}$/));
  const releaseYear = years.length > 0 ? parseInt(years[0]) : null;
  
  const languages = categories.filter(cat => 
    ['Hindi', 'Telugu', 'Tamil', 'Malayalam', 'English', 'Punjabi', 'Gujarati'].some(lang =>
      cat.includes(lang)
    )
  );
  
  const qualities = categories.filter(cat => 
    ['480p', '720p', '1080p', '4K', 'HD', 'Full HD'].some(quality => 
      cat.includes(quality)
    )
  );
  
  // Parse content metadata
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
      metadata = { description: row.content };
    }
  }
  
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

// **UPDATED: Movies transform function (simplified since series are separate)**
const transformMovieData = (row) => {
  const categories = parseCategories(row.categories || '');
  
  // Enhanced link parsing for movies (same as before)
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
  
  // Extract metadata
  const technicalCategories = [
    '480p', '720p', '1080p', '4K', 'HD', 'Full HD',
    'Hindi Dubbed Movies', 'Telugu', 'Tamil', 'Malayalam',
    'English Movies', 'Bollywood', 'Hollywood',
    'WEB-DL', 'BluRay', 'DVDRip', 'CAMRip'
  ];
  
  const genres = categories.filter(cat => 
    !technicalCategories.some(tech => cat.includes(tech)) &&
    !cat.match(/^\d{4}$/)
  );
  
  const years = categories.filter(cat => cat.match(/^\d{4}$/));
  const releaseYear = years.length > 0 ? parseInt(years[0]) : null;
  
  const languages = categories.filter(cat => 
    ['Hindi', 'Telugu', 'Tamil', 'Malayalam', 'English', 'Punjabi', 'Gujarati'].some(lang =>
      cat.includes(lang)
    )
  );
  
  const qualities = categories.filter(cat => 
    ['480p', '720p', '1080p', '4K', 'HD', 'Full HD'].some(quality => 
      cat.includes(quality)
    )
  );
  
  // Parse content metadata
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
      metadata = { description: row.content };
    }
  }
  
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

// Cache management
const isCacheValid = () => {
  return lastCacheUpdate && (Date.now() - lastCacheUpdate < CACHE_DURATION);
};

const isSeriesCacheValid = () => {
  return lastSeriesCacheUpdate && (Date.now() - lastSeriesCacheUpdate < CACHE_DURATION);
};

const updateCache = (data) => {
  contentCache.clear();
  categoryIndex.clear();
  
  data.forEach(item => {
    const transformed = transformMovieData(item);
    contentCache.set(transformed.id, transformed);
    
    transformed.categories.forEach(category => {
      if (!categoryIndex.has(category)) {
        categoryIndex.set(category, new Set());
      }
      categoryIndex.get(category).add(transformed.id);
    });
  });
  
  lastCacheUpdate = Date.now();
};

const updateSeriesCache = (data) => {
  seriesCache.clear();
  
  data.forEach(item => {
    const transformed = transformSeriesData(item);
    seriesCache.set(transformed.id, transformed);
    
    // Index series by categories as well
    transformed.categories.forEach(category => {
      if (!categoryIndex.has(category)) {
        categoryIndex.set(category, new Set());
      }
      categoryIndex.get(category).add(transformed.id);
    });
  });
  
  lastSeriesCacheUpdate = Date.now();
};

// **UPDATED: Fetch movies from movies table**
const fetchAllMovies = async () => {
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
      console.error('Error fetching movies:', error);
      return [];
    }

    updateCache(data);
    return Array.from(contentCache.values());
  } catch (error) {
    console.error("Error in fetchAllMovies:", error);
    return [];
  }
};

// **NEW: Fetch series from series table**
const fetchAllSeries = async () => {
  if (isSeriesCacheValid() && seriesCache.size > 0) {
    return Array.from(seriesCache.values());
  }

  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('status', 'publish')
      .order('modified_date', { ascending: false });

    if (error) {
      console.error('Error fetching series:', error);
      return [];
    }

    updateSeriesCache(data);
    return Array.from(seriesCache.values());
  } catch (error) {
    console.error("Error in fetchAllSeries:", error);
    return [];
  }
};

// **UPDATED FUNCTIONS**

// ---- MOVIES ----
export const getAllMovies = async (limitCount = 1000) => {
  try {
    const movies = await fetchAllMovies();
    return movies.slice(0, limitCount || movies.length);
  } catch (error) {
    console.error("Error fetching movies:", error);
    return [];
  }
};

// ---- SERIES ----
export const getAllSeries = async (limitCount = 1000) => {
  try {
    const series = await fetchAllSeries();
    return series.slice(0, limitCount || series.length);
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
};

// **NEW: Series-specific functions**
export const getSeriesById = async (id) => {
  try {
    // Check cache first
    await fetchAllSeries();
    if (seriesCache.has(id)) {
      return seriesCache.get(id);
    }

    // Direct database query
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

    // Return all episodes from all seasons
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

// **UPDATED: Get content by ID (works for both movies and series)**
export const getContentById = async (id) => {
  try {
    // Try movies first
    const movie = await getMovieById(id);
    if (movie) return movie;

    // Try series
    const series = await getSeriesById(id);
    return series;
  } catch (error) {
    console.error(`Error fetching content with ID ${id}:`, error);
    return null;
  }
};

export const getMovieById = async (id) => {
  try {
    await fetchAllMovies();
    if (contentCache.has(id)) {
      return contentCache.get(id);
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

// **UPDATED: Enhanced category functions to include both movies and series**
export const getAllCategories = async () => {
  try {
    await fetchAllMovies();
    await fetchAllSeries();
    return Array.from(categoryIndex.keys()).sort();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const getContentByCategory = async (category, limitCount = 20) => {
  try {
    await fetchAllMovies();
    await fetchAllSeries();
    
    if (!categoryIndex.has(category)) {
      return [];
    }
    
    const itemIds = Array.from(categoryIndex.get(category));
    const items = itemIds
      .map(id => contentCache.get(id) || seriesCache.get(id))
      .filter(item => item)
      .slice(0, limitCount);
    
    return items;
  } catch (error) {
    console.error("Error fetching content by category:", error);
    return [];
  }
};

// Keep existing movie-specific functions for backward compatibility
export const getMoviesByCategory = getContentByCategory;

export const getMoviesByGenre = async (genre, limitCount = 20) => {
  try {
    const movies = await fetchAllMovies();
    const series = await fetchAllSeries();
    const allContent = [...movies, ...series];
    
    const filtered = allContent
      .filter(item => item.genres.some(g => 
        g.toLowerCase().includes(genre.toLowerCase())
      ))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching content by genre:", error);
    return [];
  }
};

export const getMoviesByYear = async (year, limitCount = 20) => {
  try {
    const movies = await fetchAllMovies();
    const series = await fetchAllSeries();
    const allContent = [...movies, ...series];
    
    const filtered = allContent
      .filter(item => item.releaseYear === parseInt(year))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching content by year:", error);
    return [];
  }
};

export const getMoviesByLanguage = async (language, limitCount = 20) => {
  try {
    const movies = await fetchAllMovies();
    const series = await fetchAllSeries();
    const allContent = [...movies, ...series];
    
    const filtered = allContent
      .filter(item => item.languages.some(lang => 
        lang.toLowerCase().includes(language.toLowerCase())
      ))
      .slice(0, limitCount);
    
    return filtered;
  } catch (error) {
    console.error("Error fetching content by language:", error);
    return [];
  }
};

// **UPDATED: Enhanced download functions (movies only)**
export const getDownloadLinksByQuality = async (movieId, quality) => {
  try {
    const movie = await getMovieById(movieId);
    if (!movie || movie.isSeries) return [];
    
    return movie.downloadLinks.filter(link => 
      link.quality.toLowerCase() === quality.toLowerCase()
    );
  } catch (error) {
    console.error("Error fetching download links by quality:", error);
    return [];
  }
};

export const getAvailableQualities = async (contentId) => {
  try {
    const content = await getContentById(contentId);
    if (!content) return [];
    
    return content.availableQualities || [];
  } catch (error) {
    console.error("Error fetching available qualities:", error);
    return [];
  }
};

export const getRecommendedDownload = async (movieId) => {
  try {
    const movie = await getMovieById(movieId);
    if (!movie || movie.isSeries || !movie.downloadLinks.length) return null;
    
    return movie.downloadLinks[0];
  } catch (error) {
    console.error("Error fetching recommended download:", error);
    return null;
  }
};

// **UPDATED: Enhanced home page sections with series**
export const getHomePageSections = async (count = 10) => {
  try {
    const movies = await fetchAllMovies();
    const series = await fetchAllSeries();
    const allContent = [...movies, ...series];
    
    const getRandomItems = (arr, n) => 
      [...arr].sort(() => 0.5 - Math.random()).slice(0, n);

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

    const recentReleases = allContent.filter(item => 
      item.releaseYear && item.releaseYear >= 2024
    ).slice(0, count);

    const hindiContent = allContent.filter(item => 
      item.languages.some(lang => lang.toLowerCase().includes('hindi'))
    ).slice(0, count);

    return {
      featured: featured.length ? featured : getRandomItems(allContent, count),
      trending: trending.length ? trending : getRandomItems(allContent, count),
      action: action.length ? action : getRandomItems(allContent, count),
      thriller: thriller.length ? thriller : getRandomItems(allContent, count),
      recentReleases: recentReleases.length ? recentReleases : getRandomItems(allContent, count),
      hindiMovies: hindiContent.length ? hindiContent : getRandomItems(allContent, count),
      series: series.slice(0, count),
      movies: movies.slice(0, count),
      allContent: allContent.slice(0, count * 2)
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
      movies: [],
      allContent: []
    };
  }
};

// **UPDATED: Enhanced search with series**
export const searchContent = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim() === '') return [];
  
  try {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const movies = await fetchAllMovies();
    const series = await fetchAllSeries();
    let allContent = [...movies, ...series];
    
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
    console.error("Error searching content:", error);
    return [];
  }
};

// **UPDATED: Content stats with series**
export const getContentStats = async () => {
  try {
    const movies = await fetchAllMovies();
    const series = await fetchAllSeries();
    const allContent = [...movies, ...series];
    
    const genreStats = {};
    const languageStats = {};
    const yearStats = {};
    
    allContent.forEach(item => {
      item.genres.forEach(genre => {
        genreStats[genre] = (genreStats[genre] || 0) + 1;
      });
      
      item.languages.forEach(lang => {
        languageStats[lang] = (languageStats[lang] || 0) + 1;
      });
      
      if (item.releaseYear) {
        yearStats[item.releaseYear] = (yearStats[item.releaseYear] || 0) + 1;
      }
    });
    
    // Calculate total episodes for series
    const totalEpisodes = series.reduce((sum, serie) => sum + (serie.totalEpisodes || 0), 0);
    
    return {
      totalContent: allContent.length,
      totalMovies: movies.length,
      totalSeries: series.length,
      totalEpisodes,
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

// **UPDATED: Clear cache functions**
export const clearCache = () => {
  contentCache.clear();
  seriesCache.clear();
  categoryIndex.clear();
  lastCacheUpdate = null;
  lastSeriesCacheUpdate = null;
};

export const refreshData = async () => {
  clearCache();
  const movies = await fetchAllMovies();
  const series = await fetchAllSeries();
  return { movies, series };
};

// Export all functions
export default {
  // Core functions
  getAllMovies,
  getAllSeries,
  getMovieById,
  getSeriesById,
  getContentById,
  searchContent,
  
  // Series-specific functions
  getSeriesEpisodes,
  getEpisodeDownloadLinks,
  
  // Category functions
  getAllCategories,
  getContentByCategory,
  getMoviesByCategory,
  getMoviesByGenre,
  getMoviesByYear,
  getMoviesByLanguage,
  
  // Download functions
  getDownloadLinksByQuality,
  getAvailableQualities,
  getRecommendedDownload,
  
  // Special sections
  getHomePageSections,
  
  // Utility functions
  getContentStats,
  clearCache,
  refreshData
};
