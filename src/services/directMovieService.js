import supabase from './supabaseClient.js';
import { parseCategories, extractGenres, extractReleaseYear, extractLanguages, extractQualities, parseContentMetadata } from './utils.js';

/**
 * This module provides direct database access to movie details
 * bypassing the cache system for more up-to-date information
 */

// Parse download links from the raw string format
export const parseDownloadLinks = (linksString) => {
  if (!linksString || typeof linksString !== 'string') return [];
  
  try {
    const links = [];
    
    // Format: "url,title,sizeurl,title,size..." (concatenated without separators)
    // Use regex to find all patterns: https://...?download,title,size
    const linkPattern = /(https:\/\/[^,]+\?download),([^,]+),(\d+(?:\.\d+)?(?:MB|GB|TB))/gi;
    
    let match;
    while ((match = linkPattern.exec(linksString)) !== null) {
      const [, url, title, size] = match;
      
      // Extract quality from title
      let quality = 'HD';
      const qualityMatch = title.match(/(480p|720p|1080p|4K|2160p)/i);
      if (qualityMatch) {
        quality = qualityMatch[1].toUpperCase();
        if (quality === '2160P') quality = '4K';
      }
      
      // Fallback quality detection from size if not found in title
      if (quality === 'HD') {
        const sizeMatch = size.match(/(\d+(?:\.\d+)?)([MG]B)/i);
        if (sizeMatch) {
          const sizeNum = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toLowerCase();
          
          if (unit === 'gb') {
            if (sizeNum >= 2.5) quality = '1080P';
            else if (sizeNum >= 1.2) quality = '720P';
            else quality = '480P';
          } else if (unit === 'mb') {
            if (sizeNum >= 1500) quality = '1080P';
            else if (sizeNum >= 800) quality = '720P';
            else quality = '480P';
          }
        }
      }
      
      links.push({
        url: url.trim(),
        quality: quality,
        size: size.trim(),
        description: title.trim(),
        rawDatabaseDetails: title.trim() // Store complete database details
      });
    }
    
    // Sort by quality order
    const qualityOrder = { '480P': 1, '720P': 2, '1080P': 3, '4K': 4, 'HD': 2.5 };
    return links.sort((a, b) => (qualityOrder[a.quality] || 5) - (qualityOrder[b.quality] || 5));
    
  } catch (error) {
    console.error('Error parsing download links:', error);
    return [];
  }
};

// Transform movie data from the database row
const transformMovieData = (row) => {
  if (!row) return null;
  
  const categories = parseCategories(row.categories || '').slice(0, 10);
  
  // Parse download links with our enhanced parser
  const downloadLinks = parseDownloadLinks(row.links || '');
  
  // Handle seasons for series content
  let seasons = null;
  if (row.season_1 || row.season_2 || row.season_3) {
    seasons = {};
    for (let i = 1; i <= 10; i++) {
      const seasonKey = `season_${i}`;
      if (row[seasonKey]) {
        seasons[seasonKey] = row[seasonKey];
      }
    }
  }
  
  return {
    id: row.record_id?.toString() || row.url_slug,
    recordId: row.record_id,
    title: row.title || 'Untitled',
    slug: row.url_slug,
    featuredImage: row.featured_image,
    poster: row.poster,
    isSeries: !!seasons,
    categories: categories || [],
    genres: extractGenres(categories) || [],
    languages: extractLanguages(categories) || [],
    qualities: extractQualities(categories) || [],
    releaseYear: extractReleaseYear(categories),
    downloadLinks: downloadLinks || [],
    links: row.links, // Keep the raw links string for parsing
    availableQualities: [...new Set(downloadLinks.map(link => link.quality))],
    content: parseContentMetadata(row.content),
    excerpt: row.excerpt,
    status: row.status,
    date: row.date,
    modified_date: row.modified_date,
    seasons
  };
};

// Get movie details directly from the database by ID
export const getMovieDetailsById = async (id) => {
  try {
    console.log(`🔍 Fetching movie details directly from database for ID: ${id}`);
    
    // Try numeric ID first
    let data, error;
    
    if (!isNaN(parseInt(id))) {
      ({ data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('record_id', parseInt(id))
        .eq('status', 'publish')
        .single());
    }
    
    // If not found by ID, try by slug
    if (!data && (!error || error.code === 'PGRST116')) {
      ({ data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('url_slug', id)
        .eq('status', 'publish')
        .single());
    }
    
    if (error) {
      console.error('❌ Error fetching movie details:', error);
      return null;
    }
    
    // Transform the data
    const transformedMovie = transformMovieData(data);
    
    console.log(`✅ Movie details fetched successfully: ${transformedMovie?.title}`);
    console.log(`📊 Download links count: ${transformedMovie?.downloadLinks?.length || 0}`);
    
    return transformedMovie;
  } catch (error) {
    console.error('💥 Error in getMovieDetailsById:', error);
    return null;
  }
};

// Get series details directly from the database by ID
export const getSeriesDetailsById = async (id) => {
  try {
    console.log(`🔍 Fetching series details directly from database for ID: ${id}`);
    
    // Try numeric ID first
    let data, error;
    
    if (!isNaN(parseInt(id))) {
      ({ data, error } = await supabase
        .from('series')
        .select('*')
        .eq('record_id', parseInt(id))
        .eq('status', 'publish')
        .single());
    }
    
    // If not found by ID, try by slug
    if (!data && (!error || error.code === 'PGRST116')) {
      ({ data, error } = await supabase
        .from('series')
        .select('*')
        .eq('url_slug', id)
        .eq('status', 'publish')
        .single());
    }
    
    if (error) {
      console.error('❌ Error fetching series details:', error);
      return null;
    }
    
    // Transform the data
    const transformedSeries = transformMovieData(data);
    
    console.log(`✅ Series details fetched successfully: ${transformedSeries?.title}`);
    console.log(`📊 Download links count: ${transformedSeries?.downloadLinks?.length || 0}`);
    
    return transformedSeries;
  } catch (error) {
    console.error('💥 Error in getSeriesDetailsById:', error);
    return null;
  }
};

// Get content details by type and ID (unified function)
export const getContentDetailsById = async (contentType, id) => {
  if (contentType === 'series') {
    return getSeriesDetailsById(id);
  } else {
    return getMovieDetailsById(id);
  }
};

// Utility function to create a test file for link parsing
export const createTestLinkParser = () => {
  return {
    parseLinks: parseDownloadLinks
  };
};
