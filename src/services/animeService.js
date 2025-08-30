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

// Anime cache
let animeCache = new Map();
let animeCategoryIndex = new Map();
let lastAnimeCacheUpdate = null;

// Cache management for anime
const isAnimeCacheValid = () => {
  return lastAnimeCacheUpdate && (Date.now() - lastAnimeCacheUpdate < CACHE_DURATION);
};

// UPDATED: Enhanced anime episode parser - exact same format as series
const parseAnimeEpisodes = (seasonData) => {
  if (!seasonData || seasonData.trim() === '') return [];
  
  const episodes = [];
  
  try {
    console.log('🔍 Parsing anime season data:', seasonData.substring(0, 200) + '...');
    
    // Split by "Episode " to get individual episodes
    const episodeParts = seasonData.split(/Episode\s+(\d+)\s*:/);
    console.log('📺 Found anime episode parts:', episodeParts.length);
    
    for (let i = 1; i < episodeParts.length; i += 2) {
      const episodeNumber = parseInt(episodeParts[i]);
      const episodeLinks = episodeParts[i + 1];
      
      if (episodeLinks) {
        console.log(`📺 Processing Anime Episode ${episodeNumber}:`, episodeLinks.substring(0, 100) + '...');
        
        // Parse download links for this episode
        const links = parseAnimeEpisodeLinks(episodeLinks, episodeNumber);
        
        if (links.length > 0) {
          episodes.push({
            id: `episode_${episodeNumber}`,
            episodeNumber,
            title: `Episode ${episodeNumber}`,
            downloadLinks: links
          });
          console.log(`✅ Added Anime Episode ${episodeNumber} with ${links.length} links`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error parsing anime episodes:', error);
  }
  
  console.log(`🎬 Total anime episodes parsed: ${episodes.length}`);
  return episodes;
};

// UPDATED: Parse individual anime episode download links - exact same format as series
const parseAnimeEpisodeLinks = (linkString, episodeNumber) => {
  if (!linkString) return [];
  
  const links = [];
  
  try {
    console.log(`🔗 Parsing anime links for episode ${episodeNumber}:`, linkString.substring(0, 150) + '...');
    
    // Split by " : " to separate different quality options
    const linkParts = linkString.split(' : ');
    console.log(`🔗 Found ${linkParts.length} anime link parts`);
    
    linkParts.forEach((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      
      // Look for URLs - handle both direct URLs and those in brackets
      let url = '';
      let remainingText = trimmed;
      
      // Check for URL in square brackets first
      const bracketMatch = trimmed.match(/\[([^\]]+)\]/);
      if (bracketMatch) {
        url = bracketMatch[1];
        remainingText = trimmed.replace(/\[[^\]]+\]/, '').trim();
      } else {
        // Look for direct URL at the start
        const urlMatch = trimmed.match(/^(https?:\/\/[^\s,]+)/);
        if (urlMatch) {
          url = urlMatch[1];
          remainingText = trimmed.replace(/^https?:\/\/[^\s,]+/, '').trim();
        }
      }
      
      if (!url) {
        console.log(`⚠️ No URL found in part: ${trimmed.substring(0, 50)}...`);
        return;
      }
      
      // Parse quality and size from remaining text
      let quality = 'HD';
      let size = 'Unknown';
      
      // Try to match format like ",720p,229.05 MB" or ",1080p 10Bit,463.74 MB"
      const qualityMatch = remainingText.match(/,([^,]*(?:p|bit|K)[^,]*),([^,\n\r]+)/i);
      if (qualityMatch) {
        quality = qualityMatch[1].trim() || 'HD';
        size = qualityMatch[2].trim() || 'Unknown';
      } else {
        // Fallback: try to extract quality and size separately
        const qualityFallback = remainingText.match(/(480p|720p|1080p|4K|2160p|10bit)/i);
        if (qualityFallback) {
          quality = qualityFallback[1];
        }
        
        const sizeFallback = remainingText.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);
        if (sizeFallback) {
          size = sizeFallback[1];
        }
      }
      
      // Clean up the URL
      const cleanUrl = url.includes('?') 
        ? url.split('?')[0] + '?' + url.split('?')[1].split(',')[0] 
        : url;
      
      // Create episode link entry - EXACT SAME FORMAT AS SERIES
      const linkEntry = {
        url: cleanUrl,
        name: `Episode ${episodeNumber} - ${quality}`,
        title: `Episode ${episodeNumber}`,
        quality: quality,
        size: size,
        sizeInMB: parseSizeToMB(size),
        language: extractLanguageFromName(trimmed),
        episodeNumber: episodeNumber,
        isPackage: false,
        downloadType: 'episode'
      };
      
      links.push(linkEntry);
      
      console.log(`✅ Parsed anime episode link ${index + 1}:`, {
        episodeNumber,
        quality,
        size,
        url: cleanUrl.substring(0, 50) + '...'
      });
    });
    
  } catch (error) {
    console.error('💥 Error parsing anime episode links:', error);
  }
  
  console.log(`📺 Total anime episode links parsed: ${links.length}`);
  return links;
};

// UPDATED: Parse anime season zip/package links - exact same format as series
const parseAnimeSeasonZipLinks = (seasonZipData) => {
  if (!seasonZipData || seasonZipData.trim() === '') return [];
  
  const links = [];
  
  try {
    console.log('📦 Parsing anime season zip data:', seasonZipData.substring(0, 200) + '...');
    
    // Split by " : " to separate different package options
    const zipParts = seasonZipData.split(' : ');
    console.log(`📦 Found ${zipParts.length} anime zip parts`);
    
    zipParts.forEach((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      
      // Look for URLs - handle both direct URLs and those in brackets
      let url = '';
      let remainingText = trimmed;
      
      const bracketMatch = trimmed.match(/\[([^\]]+)\]/);
      if (bracketMatch) {
        url = bracketMatch[1];
        remainingText = trimmed.replace(/\[[^\]]+\]/, '').trim();
      } else {
        const urlMatch = trimmed.match(/^(https?:\/\/[^\s,]+)/);
        if (urlMatch) {
          url = urlMatch[1];
          remainingText = trimmed.replace(/^https?:\/\/[^\s,]+/, '').trim();
        }
      }
      
      if (!url) return;
      
      // Parse quality and size
      let quality = 'Season Package';
      let size = 'Unknown';
      
      const qualityMatch = remainingText.match(/,([^,]*(?:p|bit|K|Season)[^,]*),([^,\n\r]+)/i);
      if (qualityMatch) {
        quality = qualityMatch[1].trim() || 'Season Package';
        size = qualityMatch[2].trim() || 'Unknown';
      } else {
        const qualityFallback = remainingText.match(/(480p|720p|1080p|4K|2160p|Season)/i);
        if (qualityFallback) {
          quality = qualityFallback[1];
        }
        
        const sizeFallback = remainingText.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);
        if (sizeFallback) {
          size = sizeFallback[1];
        }
      }
      
      const cleanUrl = url.includes('?') 
        ? url.split('?')[0] + '?' + url.split('?')[1].split(',')[0] 
        : url;
      
      // EXACT SAME FORMAT AS SERIES
      const linkEntry = {
        url: cleanUrl,
        name: `Season Package - ${quality}`,
        title: `Season Package`,
        quality: quality,
        size: size,
        sizeInMB: parseSizeToMB(size),
        language: extractLanguageFromName(trimmed),
        episodeNumber: 'package',
        isPackage: true,
        downloadType: 'package'
      };
      
      links.push(linkEntry);
      
      console.log(`✅ Parsed anime package link ${index + 1}:`, {
        quality,
        size,
        url: cleanUrl.substring(0, 50) + '...'
      });
    });
    
  } catch (error) {
    console.error('💥 Error parsing anime season zip links:', error);
  }
  
  return links;
};

// UPDATED: Transform anime data - EXACT SAME FORMAT AS SERIES
const transformAnimeData = (row) => {
  const categories = parseCategories(row.categories || '');
  
  // Parse seasons data - EXACT SAME APPROACH AS SERIES
  const seasons = {};
  const seasonColumns = [
    'season_1', 'season_2', 'season_3', 'season_4', 'season_5',
    'season_6', 'season_7', 'season_8', 'season_9', 'season_10'
  ];
  
  seasonColumns.forEach((col, index) => {
    if (row[col] && row[col].trim() !== '') {
      const seasonNumber = index + 1;
      console.log(`🎬 Processing anime season ${seasonNumber} from column ${col}`);
      
      const episodes = parseAnimeEpisodes(row[col]);
      
      if (episodes.length > 0) {
        seasons[`season_${seasonNumber}`] = {
          seasonNumber,
          episodes,
          totalEpisodes: episodes.length
        };
        console.log(`✅ Added anime season ${seasonNumber} with ${episodes.length} episodes`);
      }
    }
  });
  
  // Parse season zip packages
  let seasonZipLinks = [];
  if (row.season_zip && row.season_zip.trim() !== '') {
    console.log('📦 Processing anime season zip packages');
    seasonZipLinks = parseAnimeSeasonZipLinks(row.season_zip);
    console.log(`✅ Parsed ${seasonZipLinks.length} anime season package links`);
  }
  
  const genres = extractGenres(categories);
  const releaseYear = extractReleaseYear(categories);
  const languages = extractLanguages(categories);
  const qualities = extractQualities(categories);
  const metadata = parseContentMetadata(row.content);
  
  // Calculate total statistics
  const totalSeasons = Object.keys(seasons).length;
  const allEpisodes = Object.values(seasons).flatMap(season => season.episodes);
  const totalEpisodes = allEpisodes.length;
  
  // All download links (episodes + packages)
  const allDownloadLinks = [
    ...allEpisodes.flatMap(ep => ep.downloadLinks),
    ...seasonZipLinks
  ];
  
  console.log(`🎬 Anime transformation complete:`, {
    title: row.title,
    totalSeasons,
    totalEpisodes,
    totalDownloadLinks: allDownloadLinks.length,
    seasonZipLinks: seasonZipLinks.length,
    availableSeasons: Object.keys(seasons)
  });
  
  // EXACT SAME RETURN FORMAT AS SERIES
  return {
    id: row.record_id?.toString() || row.url_slug,
    recordId: row.record_id,
    title: row.title,
    slug: row.url_slug,
    
    // Media assets
    featuredImage: row.featured_image,
    poster: row.poster,
    
    // Mark as both anime and series for compatibility
    isAnime: true,
    isSeries: true, // This ensures SeriesDetail component treats it correctly
    seasons,
    totalSeasons,
    totalEpisodes,
    seasonZipLinks,
    
    // All download links for compatibility
    downloadLinks: allDownloadLinks,
    
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
    modifiedDate: row.modified_date,
    date: row.date,
    modified_date: row.modified_date
  };
};

// Rest of the service functions remain the same...
const updateAnimeCache = (data) => {
  animeCache.clear();
  animeCategoryIndex.clear();
  
  data.forEach(item => {
    const transformed = transformAnimeData(item);
    animeCache.set(transformed.id, transformed);
    
    // Index anime by categories
    transformed.categories.forEach(category => {
      if (!animeCategoryIndex.has(category)) {
        animeCategoryIndex.set(category, new Set());
      }
      animeCategoryIndex.get(category).add(transformed.id);
    });
  });
  
  lastAnimeCacheUpdate = Date.now();
};

const fetchAllAnime = async () => {
  if (isAnimeCacheValid() && animeCache.size > 0) {
    return Array.from(animeCache.values());
  }

  try {
    const { data, error } = await supabase
      .from('anime')
      .select('*')
      .eq('status', 'publish')
      .order('modified_date', { ascending: false });

    if (error) {
      console.error('Error fetching anime:', error);
      return [];
    }

    console.log(`📺 Fetched ${data.length} anime from database`);
    updateAnimeCache(data);
    return Array.from(animeCache.values());
  } catch (error) {
    console.error("Error in fetchAllAnime:", error);
    return [];
  }
};

// Export functions
export const getAllAnime = async (limitCount = 1000) => {
  try {
    const anime = await fetchAllAnime();
    return anime.slice(0, limitCount || anime.length);
  } catch (error) {
    console.error("Error fetching anime:", error);
    return [];
  }
};

export const getAnimeById = async (id) => {
  try {
    await fetchAllAnime();
    if (animeCache.has(id)) {
      return animeCache.get(id);
    }

    let { data, error } = await supabase
      .from('anime')
      .select('*')
      .eq('record_id', parseInt(id))
      .eq('status', 'publish')
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: slugData, error: slugError } = await supabase
        .from('anime')
        .select('*')
        .eq('url_slug', id)
        .eq('status', 'publish')
        .single();
      
      data = slugData;
      error = slugError;
    }

    if (error) {
      console.error(`Error fetching anime with ID ${id}:`, error);
      return null;
    }

    return transformAnimeData(data);
  } catch (error) {
    console.error(`Error fetching anime with ID ${id}:`, error);
    return null;
  }
};

export const getAnimeEpisodes = async (animeId, seasonNumber = null) => {
  try {
    const anime = await getAnimeById(animeId);
    if (!anime) return [];

    if (seasonNumber) {
      const season = anime.seasons[`season_${seasonNumber}`];
      return season ? season.episodes : [];
    }

    return Object.values(anime.seasons).flatMap(season => season.episodes);
  } catch (error) {
    console.error("Error fetching anime episodes:", error);
    return [];
  }
};

export const getAnimeEpisodeDownloadLinks = async (animeId, seasonNumber, episodeNumber) => {
  try {
    const episodes = await getAnimeEpisodes(animeId, seasonNumber);
    const episode = episodes.find(ep => ep.episodeNumber === episodeNumber);
    return episode ? episode.downloadLinks : [];
  } catch (error) {
    console.error("Error fetching anime episode download links:", error);
    return [];
  }
};

// Rest of the export functions (getAnimeByCategory, searchAnime, etc.) remain the same...
export const getAnimeByCategory = async (category, limitCount = 20) => {
  try {
    await fetchAllAnime();
    
    if (!animeCategoryIndex.has(category)) {
      return [];
    }
    
    const itemIds = Array.from(animeCategoryIndex.get(category));
    const items = itemIds
      .map(id => animeCache.get(id))
      .filter(item => item)
      .slice(0, limitCount);
    
    return items;
  } catch (error) {
    console.error("Error fetching anime by category:", error);
    return [];
  }
};

export const searchAnime = async (searchQuery, filters = {}) => {
  if (!searchQuery || searchQuery.trim() === '') return [];
  
  try {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const anime = await fetchAllAnime();
    
    let results = anime.filter(item => {
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
      
      return new Date(b.modifiedDate) - new Date(a.modifiedDate);
    });

    return results.slice(0, filters.limit || 50);
  } catch (error) {
    console.error("Error searching anime:", error);
    return [];
  }
};

export const clearAnimeCache = () => {
  animeCache.clear();
  animeCategoryIndex.clear();
  lastAnimeCacheUpdate = null;
};

export const refreshAnime = async () => {
  clearAnimeCache();
  return await fetchAllAnime();
};

export const getAnimeCategoryIndex = () => animeCategoryIndex;
export const getAnimeCache = () => animeCache;
