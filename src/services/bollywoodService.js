import supabase from './supabaseClient';
import { debounce } from 'lodash';
import logger from '../utils/logger';
import { 
  parseCategories, 
  parseSizeToMB, 
  extractLanguageFromName,
  extractGenres,
  extractReleaseYear,
  extractLanguages,
  extractQualities,
  parseContentMetadata
} from './utils';

/**
 * Service for fetching Bollywood movies and series from dedicated tables
 */

// Initial batch sizes for optimized loading
const INITIAL_BATCH_SIZE = 200;
const SEARCH_BATCH_SIZE = 30;

// **SERIES EPISODE PARSING FUNCTIONS** (copied from seriesService.js)
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
          quality: quality,
          size: size,
          type: 'episode'
        };
        
        links.push(linkEntry);
      }
    });
  } catch (error) {
    logger.error('💥 Error parsing episode links:', error);
  }
  
  return links;
};

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
    logger.error('💥 Error parsing Bollywood series episodes:', error);
  }
  
  return episodes;
};

// Transform Bollywood movie data
const transformBollywoodMovieData = (row) => {
  const categories = parseCategories(row.categories || '');
  const genres = extractGenres(categories);
  const releaseYear = extractReleaseYear(categories);
  const languages = extractLanguages(categories);
  const qualities = extractQualities(categories);
  const metadata = parseContentMetadata(row.content);
  
  return {
    ...row,
    // Add movie-specific properties
    isSeries: false,
    
    // Metadata
    genres,
    releaseYear,
    languages,
    qualities,
    metadata,
    categories: categories,
    
    // Computed properties
    sizeInMB: parseSizeToMB(row.size || '0 MB'),
    extractedLanguage: extractLanguageFromName(row.title),
    
    // Add source identification
    sourceTable: 'bolly_movies',
    cinemaType: 'bollywood'
  };
};

// Transform Bollywood series data
const transformBollywoodSeriesData = (row) => {
  const categories = parseCategories(row.categories || '');
  
  // Parse seasons data
  const seasons = {};
  const seasonColumns = [
    'season_1', 'season_2', 'season_3', 'season_4', 'season_5',
    'season_6', 'season_7', 'season_8', 'season_9', 'season_10'
  ];
  
  seasonColumns.forEach((col, index) => {
    if (row[col] && row[col].trim() !== '' && row[col] !== 'Not Available') {
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
  
  const genres = extractGenres(categories);
  const releaseYear = extractReleaseYear(categories);
  const languages = extractLanguages(categories);
  const qualities = extractQualities(categories);
  const metadata = parseContentMetadata(row.content);
  
  // Calculate total statistics
  const totalSeasons = Object.keys(seasons).length;
  const allEpisodes = Object.values(seasons).flatMap(season => season.episodes);
  const totalEpisodes = allEpisodes.length;
  
  return {
    ...row,
    // Add series-specific properties
    isSeries: totalSeasons > 0,
    seasons,
    totalSeasons,
    totalEpisodes,
    allEpisodes,
    
    // Metadata
    genres,
    releaseYear,
    languages,
    qualities,
    metadata,
    categories: categories,
    
    // Computed properties
    sizeInMB: parseSizeToMB(row.size || '0 MB'),
    extractedLanguage: extractLanguageFromName(row.title),
    
    // Add source identification
    sourceTable: 'bolly_series',
    cinemaType: 'bollywood'
  };
};

// Fetch all Bollywood movies from the bolly_movies table
export const getAllBollyMovies = async (limit = INITIAL_BATCH_SIZE) => {
  try {
    logger.log(`🎬 Fetching ${limit} Bollywood movies from bolly_movies table...`);
    
    const { data, error } = await supabase
      .from('bolly_movies')
      .select('*')
      .eq('status', 'publish')
      .order('modified_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    logger.log(`✅ Loaded ${data.length} Bollywood movies from database`);
    
    // Transform movies with proper metadata
    const transformedMovies = (data || []).map(movie => transformBollywoodMovieData(movie));
    
    return transformedMovies;
  } catch (error) {
    logger.error('❌ Error fetching Bollywood movies:', error);
    return [];
  }
};

// Fetch all Bollywood series from the bolly_series table
export const getAllBollySeries = async (limit = INITIAL_BATCH_SIZE) => {
  try {
    logger.log(`📺 Fetching ${limit} Bollywood series from bolly_series table...`);
    
    const { data, error } = await supabase
      .from('bolly_series')
      .select('*')
      .eq('status', 'publish')
      .order('modified_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    logger.log(`✅ Loaded ${data.length} Bollywood series from database`);
    
    // Transform and add series-specific properties using the same logic as Hollywood series
    const transformedSeries = (data || []).map(series => transformBollywoodSeriesData(series));
    
    logger.log(`📺 Transformed ${transformedSeries.length} Bollywood series with episodes data`);
    
    return transformedSeries;
  } catch (error) {
    logger.error('❌ Error fetching Bollywood series:', error);
    return [];
  }
};

// Search for Bollywood movies
export const searchBollyMovies = async (query, options = {}) => {
  const { limit = SEARCH_BATCH_SIZE, signal } = options;
  
  try {
    logger.log(`🔍 Searching for Bollywood movies with query: "${query}"`);
    
    const { data, error } = await supabase
      .from('bolly_movies')
      .select('*')
      .ilike('title', `%${query}%`)
      .eq('status', 'publish')
      .order('modified_date', { ascending: false })
      .limit(limit)
      .abortSignal(signal);
    
    if (error) {
      throw error;
    }
    
    logger.log(`✅ Found ${data.length} Bollywood movies for query: "${query}"`);
    
    // Transform movies with proper metadata
    const transformedMovies = (data || []).map(movie => transformBollywoodMovieData(movie));
    
    return transformedMovies;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.log('🔄 Bollywood movies search aborted');
      return [];
    }
    logger.error('❌ Error searching Bollywood movies:', error);
    return [];
  }
};

// Search for Bollywood series
export const searchBollySeries = async (query, options = {}) => {
  const { limit = SEARCH_BATCH_SIZE, signal } = options;
  
  try {
    logger.log(`🔍 Searching for Bollywood series with query: "${query}"`);
    
    const { data, error } = await supabase
      .from('bolly_series')
      .select('*')
      .ilike('title', `%${query}%`)
      .eq('status', 'publish')
      .order('modified_date', { ascending: false })
      .limit(limit)
      .abortSignal(signal);
    
    if (error) {
      throw error;
    }
    
    logger.log(`✅ Found ${data.length} Bollywood series for query: "${query}"`);
    
    // Transform series data to include episodes and seasons structure
    const transformedSeries = (data || []).map(series => transformBollywoodSeriesData(series));
    
    return transformedSeries;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.log('🔄 Bollywood series search aborted');
      return [];
    }
    logger.error('❌ Error searching Bollywood series:', error);
    return [];
  }
};

// Get statistics for Bollywood content
export const getBollywoodStats = () => {
  try {
    return {
      bollyMovies: 0, // This will be updated with actual counts
      bollySeries: 0, // This will be updated with actual counts
      isLoading: false
    };
  } catch (error) {
    logger.error('❌ Error getting Bollywood stats:', error);
    return {
      bollyMovies: 0,
      bollySeries: 0, 
      isLoading: false
    };
  }
};

// Get a specific Bollywood movie by ID
export const getBollyMovieById = async (id) => {
  try {
    logger.log(`🎬 Fetching Bollywood movie with ID: ${id}`);
    
    const { data, error } = await supabase
      .from('bolly_movies')
      .select('*')
      .eq('record_id', parseInt(id))
      .eq('status', 'publish')
      .single();
    
    if (error) {
      throw error;
    }
    
    logger.log(`✅ Found Bollywood movie: ${data?.title}`);
    
    // Transform the movie data with proper metadata
    const transformedMovie = transformBollywoodMovieData(data);
    
    return transformedMovie;
  } catch (error) {
    logger.error('❌ Error fetching Bollywood movie by ID:', error);
    return null;
  }
};

// Get a specific Bollywood series by ID
export const getBollySeriesById = async (id) => {
  try {
    logger.log(`📺 Fetching Bollywood series with ID: ${id}`);
    
    const { data, error } = await supabase
      .from('bolly_series')
      .select('*')
      .eq('record_id', parseInt(id))
      .eq('status', 'publish')
      .single();
    
    if (error) {
      throw error;
    }
    
    logger.log(`✅ Found Bollywood series: ${data?.title}`);
    
    // Transform the series data to include episodes and seasons structure
    const transformedSeries = transformBollywoodSeriesData(data);
    
    logger.log(`📺 Transformed Bollywood series with ${transformedSeries.totalSeasons} seasons and ${transformedSeries.totalEpisodes} episodes`);
    
    return transformedSeries;
  } catch (error) {
    logger.error('❌ Error fetching Bollywood series by ID:', error);
    return null;
  }
};

// Get episodes for a Bollywood series (assuming series data structure includes seasons/episodes)
export const getBollySeriesEpisodes = async (seriesId) => {
  try {
    logger.log(`📺 Fetching episodes for Bollywood series ID: ${seriesId}`);
    
    // First get the series data
    const series = await getBollySeriesById(seriesId);
    if (!series) {
      return [];
    }
    
    // Extract episodes from series data structure
    let episodes = [];
    
    // Check if episodes are stored in seasons object
    if (series.seasons && typeof series.seasons === 'object') {
      Object.values(series.seasons).forEach(season => {
        if (season.episodes && Array.isArray(season.episodes)) {
          episodes = episodes.concat(season.episodes);
        }
      });
    }
    
    // Check for direct episodes array
    if (series.episodes && Array.isArray(series.episodes)) {
      episodes = series.episodes;
    }
    
    logger.log(`✅ Found ${episodes.length} episodes for Bollywood series`);
    return episodes;
  } catch (error) {
    logger.error('❌ Error fetching Bollywood series episodes:', error);
    return [];
  }
};

// Get download links for a Bollywood episode
export const getBollyEpisodeDownloadLinks = async (episodeId, seriesId) => {
  try {
    logger.log(`🔗 Fetching download links for Bollywood episode: ${episodeId}`);
    
    // Get the series data which contains episode download links
    const series = await getBollySeriesById(seriesId);
    if (!series) {
      return [];
    }
    
    // Find the specific episode and return its download links
    let episodeLinks = [];
    
    if (series.seasons && typeof series.seasons === 'object') {
      Object.values(series.seasons).forEach(season => {
        if (season.episodes && Array.isArray(season.episodes)) {
          const episode = season.episodes.find(ep => ep.id === episodeId || ep.episodeId === episodeId);
          if (episode && episode.downloadLinks) {
            episodeLinks = episode.downloadLinks;
          }
        }
      });
    }
    
    logger.log(`✅ Found ${episodeLinks.length} download links for Bollywood episode`);
    return episodeLinks;
  } catch (error) {
    logger.error('❌ Error fetching Bollywood episode download links:', error);
    return [];
  }
};

export default {
  getAllBollyMovies,
  getAllBollySeries,
  searchBollyMovies,
  searchBollySeries,
  getBollywoodStats,
  getBollyMovieById,
  getBollySeriesById,
  getBollySeriesEpisodes,
  getBollyEpisodeDownloadLinks
};