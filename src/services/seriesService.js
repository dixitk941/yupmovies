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

// Series cache
let seriesCache = new Map();
let seriesCategoryIndex = new Map();
let lastSeriesCacheUpdate = null;

// Cache management for series
const isSeriesCacheValid = () => {
  return lastSeriesCacheUpdate && (Date.now() - lastSeriesCacheUpdate < CACHE_DURATION);
};

// UPDATED: Enhanced series episode parser for your actual data format
const parseSeriesEpisodes = (seasonData) => {
  if (!seasonData || seasonData.trim() === '') return [];
  
  const episodes = [];
  
  try {
    console.log('🔍 Parsing season data:', seasonData.substring(0, 200) + '...');
    
    // Split by "Episode " to get individual episodes
    const episodeParts = seasonData.split(/Episode\s+(\d+)\s*:/);
    console.log('📺 Found episode parts:', episodeParts.length);
    
    for (let i = 1; i < episodeParts.length; i += 2) {
      const episodeNumber = parseInt(episodeParts[i]);
      const episodeLinks = episodeParts[i + 1];
      
      if (episodeLinks) {
        console.log(`📺 Processing Episode ${episodeNumber}:`, episodeLinks.substring(0, 100) + '...');
        
        // Parse download links for this episode
        const links = parseEpisodeLinks(episodeLinks, episodeNumber);
        
        if (links.length > 0) {
          episodes.push({
            id: `episode_${episodeNumber}`,
            episodeNumber,
            title: `Episode ${episodeNumber}`,
            downloadLinks: links
          });
          console.log(`✅ Added Episode ${episodeNumber} with ${links.length} links`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error parsing series episodes:', error);
  }
  
  console.log(`🎬 Total episodes parsed: ${episodes.length}`);
  return episodes;
};

// UPDATED: Parse individual episode download links - now only handles episode streaming files
const parseEpisodeLinks = (linkString, episodeNumber) => {
  if (!linkString) return [];
  
  const links = [];
  
  try {
    console.log(`🔗 Parsing links for episode ${episodeNumber}:`, linkString.substring(0, 150) + '...');
    
    // Split by " : " to separate different quality options
    const linkParts = linkString.split(' : ');
    console.log(`🔗 Found ${linkParts.length} link parts`);
    
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
        
        console.log(`✅ Parsed episode link ${index + 1}:`, {
          quality,
          size,
          downloadType: linkEntry.downloadType,
          url: cleanUrl.substring(0, 50) + '...'
        });
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
    console.log('📦 Parsing season zip data:', seasonZipData.substring(0, 200) + '...');
    
    // Split by " : " to separate different package options
    const zipParts = seasonZipData.split(' : ');
    console.log(`📦 Found ${zipParts.length} zip parts`);
    
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
        
        console.log(`✅ Parsed package link ${index + 1}:`, {
          quality,
          size,
          downloadType: linkEntry.downloadType,
          url: cleanUrl.substring(0, 50) + '...'
        });
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
      console.log(`🎬 Processing season ${seasonNumber} from column ${col}`);
      
      const episodes = parseSeriesEpisodes(row[col]);
      
      if (episodes.length > 0) {
        seasons[`season_${seasonNumber}`] = {
          seasonNumber,
          episodes,
          totalEpisodes: episodes.filter(ep => ep.episodeNumber !== 'complete').length
        };
        console.log(`✅ Added season ${seasonNumber} with ${episodes.length} episodes`);
      } else {
        console.log(`❌ No episodes found for season ${seasonNumber}`);
      }
    }
  });
  
  // UPDATED: Parse season zip packages from season_zip column
  let seasonZipLinks = [];
  if (row.season_zip && row.season_zip.trim() !== '') {
    console.log('📦 Processing season zip packages');
    seasonZipLinks = parseSeasonZipLinks(row.season_zip);
    console.log(`✅ Parsed ${seasonZipLinks.length} season package links`);
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
  
  console.log(`🎬 Series transformation complete:`, {
    title: row.title,
    totalSeasons,
    totalEpisodes,
    seasonZipLinks: seasonZipLinks.length,
    availableSeasons: Object.keys(seasons)
  });
  
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
    seriesCache.set(transformed.id, transformed);
    
    // Index series by categories
    transformed.categories.forEach(category => {
      if (!seriesCategoryIndex.has(category)) {
        seriesCategoryIndex.set(category, new Set());
      }
      seriesCategoryIndex.get(category).add(transformed.id);
    });
  });
  
  lastSeriesCacheUpdate = Date.now();
};

// Fetch all series from database
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

    console.log(`📺 Fetched ${data.length} series from database`);
    updateSeriesCache(data);
    return Array.from(seriesCache.values());
  } catch (error) {
    console.error("Error in fetchAllSeries:", error);
    return [];
  }
};

// All export functions
export const getAllSeries = async (limitCount = 1000) => {
  try {
    const series = await fetchAllSeries();
    return series.slice(0, limitCount || series.length);
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
};

export const getSeriesById = async (id) => {
  try {
    await fetchAllSeries();
    if (seriesCache.has(id)) {
      return seriesCache.get(id);
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
    await fetchAllSeries();
    
    if (!seriesCategoryIndex.has(category)) {
      return [];
    }
    
    const itemIds = Array.from(seriesCategoryIndex.get(category));
    const items = itemIds
      .map(id => seriesCache.get(id))
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
    const series = await fetchAllSeries();
    
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
    const series = await fetchAllSeries();
    
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
    const series = await fetchAllSeries();
    
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
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const series = await fetchAllSeries();
    
    let results = series.filter(item => {
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
    console.error("Error searching series:", error);
    return [];
  }
};

export const clearSeriesCache = () => {
  seriesCache.clear();
  seriesCategoryIndex.clear();
  lastSeriesCacheUpdate = null;
};

export const refreshSeries = async () => {
  clearSeriesCache();
  return await fetchAllSeries();
};

// Export series categories index for combined operations
export const getSeriesCategoryIndex = () => seriesCategoryIndex;
export const getSeriesCache = () => seriesCache;
