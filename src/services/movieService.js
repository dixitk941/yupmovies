import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, limit } from 'firebase/firestore';

// Cache to avoid repeated fetches
let moviesCache = [];
let seriesCache = [];

/**
 * Get all movies from Firestore
 * @param {number} limitCount - Maximum number of movies to fetch
 * @returns {Array} Array of movie objects
 */
export const getAllMovies = async (limitCount = 100) => {
  try {
    if (moviesCache.length > 0) {
      return limitCount ? moviesCache.slice(0, limitCount) : moviesCache;
    }

    const moviesCollection = collection(db, 'movies');
    const moviesQuery = limitCount ? query(moviesCollection, limit(limitCount)) : moviesCollection;
    const snapshot = await getDocs(moviesQuery);
    
    moviesCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return moviesCache;
  } catch (error) {
    console.error("Error fetching movies:", error);
    return [];
  }
};

/**
 * Get all TV series from Firestore
 * @param {number} limitCount - Maximum number of series to fetch
 * @returns {Array} Array of series objects
 */
export const getAllSeries = async (limitCount = 100) => {
  try {
    if (seriesCache.length > 0) {
      return limitCount ? seriesCache.slice(0, limitCount) : seriesCache;
    }

    const seriesCollection = collection(db, 'series');
    const seriesQuery = limitCount ? query(seriesCollection, limit(limitCount)) : seriesCollection;
    const snapshot = await getDocs(seriesQuery);
    
    seriesCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isSeries: true // Flag to distinguish series from movies
    }));
    
    return seriesCache;
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
};

/**
 * Get movies and series by category
 * @param {string} category - Category to filter by
 * @param {number} limitCount - Maximum number of results to return
 * @returns {Array} Array of movies and series matching the category
 */
export const getMoviesByCategory = async (category, limitCount = 20) => {
  try {
    const [movies, series] = await Promise.all([
      getAllMovies(),
      getAllSeries()
    ]);
    
    const combinedResults = [
      ...movies.filter(movie => movie.category && movie.category.includes(category)),
      ...series.filter(show => show.category && show.category.includes(category))
    ];
    
    return combinedResults.slice(0, limitCount);
  } catch (error) {
    console.error(`Error fetching by category ${category}:`, error);
    return [];
  }
};

/**
 * Get a specific movie or series by ID
 * @param {string} id - The document ID
 * @param {boolean} isSeries - Whether to look in series collection
 * @returns {Object|null} The movie or series object, or null if not found
 */
export const getMovieById = async (id, isSeries = false) => {
  try {
    const collectionName = isSeries ? 'series' : 'movies';
    const docRef = doc(db, collectionName, id);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
        isSeries
      };
    }
    
    // If not found and isSeries flag wasn't specified, try the other collection
    if (isSeries === false) {
      return getMovieById(id, true);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching item with ID ${id}:`, error);
    return null;
  }
};

/**
 * Get movies and series for home page sections
 * @param {number} count - Number of items to include in each section
 * @returns {Object} Object containing arrays for each section
 */
export const getHomePageSections = async (count = 10) => {
  try {
    const [allMovies, allSeries] = await Promise.all([
      getAllMovies(),
      getAllSeries()
    ]);
    
    // Combine movies and series
    const allContent = [...allMovies, ...allSeries];
    
    // Extract categories from all content
    const featuredContent = allContent
      .filter(item => item.category && item.category.includes("Featured"))
      .slice(0, count);
      
    const trendingContent = allContent
      .filter(item => item.category && item.category.includes("Trending Now"))
      .slice(0, count);
      
    const topRatedContent = allContent
      .filter(item => item.category && item.category.includes("Top Rated"))
      .slice(0, count);
      
    const newReleaseContent = allContent
      .filter(item => item.category && item.category.includes("New Release"))
      .slice(0, count);
    
    // Function to get random items
    const getRandomContent = (n) => {
      const shuffled = [...allContent].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, n);
    };
    
    // Fill in sections with at least some content
    return {
      featured: featuredContent.length ? featuredContent : getRandomContent(count),
      trending: trendingContent.length ? trendingContent : getRandomContent(count),
      topRated: topRatedContent.length ? topRatedContent : getRandomContent(count),
      newReleases: newReleaseContent.length ? newReleaseContent : getRandomContent(count),
      series: allSeries.slice(0, count) // Add a dedicated series section
    };
  } catch (error) {
    console.error("Error fetching home page sections:", error);
    return {
      featured: [],
      trending: [],
      topRated: [],
      newReleases: [],
      series: []
    };
  }
};

/**
 * Search movies and series by title or category
 * @param {string} searchTerm - The term to search for
 * @param {number} limitCount - Maximum number of results to return
 * @returns {Array} Array of matching movies and series
 */
export const searchMovies = async (searchTerm, limitCount = 20) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    
    // Fetch both movies and series
    const [allMovies, allSeries] = await Promise.all([
      getAllMovies(100),
      getAllSeries(100)
    ]);
    
    // Combine movies and series for searching
    const allContent = [...allMovies, ...allSeries];
    
    const searchTermLower = searchTerm.toLowerCase();
    const results = allContent
      .filter(item => {
        // Check title
        if (item.title && item.title.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Check categories
        if (item.category) {
          // Handle both string and array categories
          if (Array.isArray(item.category)) {
            if (item.category.some(cat => cat.toLowerCase().includes(searchTermLower))) {
              return true;
            }
          } else if (typeof item.category === 'string') {
            if (item.category.toLowerCase().includes(searchTermLower)) {
              return true;
            }
          }
        }
        
        // For series, also check season information
        if (item.isSeries) {
          for (let i = 1; i <= 14; i++) {
            const seasonKey = `Season ${i}`;
            if (item[seasonKey] && item[seasonKey].toLowerCase().includes(searchTermLower)) {
              return true;
            }
          }
        }
        
        return false;
      })
      .slice(0, limitCount);
    
    return results;
  } catch (error) {
    console.error(`Error searching content for "${searchTerm}":`, error);
    return [];
  }
};

/**
 * Get all available seasons for a series
 * @param {Object} series - The series object
 * @returns {Array} Array of available season numbers
 */
export const getAvailableSeasons = (series) => {
  if (!series || !series.isSeries) {
    return [];
  }
  
  const availableSeasons = [];
  for (let i = 1; i <= 14; i++) {
    const seasonKey = `Season ${i}`;
    if (series[seasonKey] && series[seasonKey] !== null) {
      availableSeasons.push(i);
    }
  }
  
  return availableSeasons;
};

/**
 * Parse episodes information from a season text
 * @param {string} seasonText - The season text containing episode information
 * @returns {Array} Array of episode objects with links and details
 */
export const parseEpisodes = (seasonText) => {
  if (!seasonText) return [];
  
  const episodes = [];
  const lines = seasonText.split('\n');
  
  for (const line of lines) {
    if (line.toLowerCase().includes('episode') && line.includes(':')) {
      // Extract episode number
      const episodeMatch = line.match(/Episode\s*(\d+)/i);
      const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : null;
      
      if (!episodeNumber) continue;
      
      // Extract download links
      // The format is typically: https://domain.com/path, quality, size
      const parts = line.split(':');
      if (parts.length < 3) continue;
      
      // First part is "Episode X ", second part is typically empty or has a space
      // Third part onwards contains the URL and additional info
      const urlPart = parts.slice(2).join(':').trim();
      
      // Extract the URL (it's the first part before a comma)
      const urlMatch = urlPart.match(/(https?:\/\/[^,\s]+)/);
      if (!urlMatch) continue;
      
      const url = urlMatch[1];
      
      // Extract quality info (typically after the URL and before size)
      // This could be patterns like "720p", "720p 10Bit", etc.
      const qualityMatch = urlPart.match(/,\s*([\w\s]+p(?:\s+\d+Bit)?)/);
      const quality = qualityMatch ? qualityMatch[1].trim() : 'Unknown';
      
      // Extract file size (typically at the end, patterns like "268.88 MB", "1.63 GB")
      const sizeMatch = urlPart.match(/,\s*([\d.]+\s*[GMK]B)/);
      const size = sizeMatch ? sizeMatch[1].trim() : '';
      
      episodes.push({
        number: episodeNumber,
        link: url,
        quality,
        size
      });
    }
  }
  
  // Sort episodes by number
  return episodes.sort((a, b) => a.number - b.number);
};

/**
 * Parse full season download links
 * @param {string} seasonText - The season text containing download information
 * @returns {Array} Array of download options with quality and size
 */
export const parseFullSeasonDownloads = (seasonText) => {
  if (!seasonText) return [];
  
  const downloads = [];
  const lines = seasonText.split('\n');
  
  // Look for lines with "Season X :" pattern
  for (const line of lines) {
    if (line.match(/Season\s+\d+\s*:/) && !line.toLowerCase().includes('episode')) {
      // Extract all URLs and their details
      const parts = line.split(':');
      if (parts.length < 3) continue;
      
      // Starting from part 2, we have the URLs and details
      const urlPart = parts.slice(2).join(':').trim();
      
      // Find all URLs in the line
      const urlMatches = urlPart.match(/(https?:\/\/[^\s,]+)/g);
      if (!urlMatches) continue;
      
      // Process each URL and associated information
      for (let i = 0; i < urlMatches.length; i++) {
        const url = urlMatches[i];
        // Extract the text following this URL until next URL or end of line
        const nextUrl = (i < urlMatches.length - 1) ? urlMatches[i + 1] : '';
        let infoText = '';
        
        if (nextUrl) {
          const startIdx = urlPart.indexOf(url) + url.length;
          const endIdx = urlPart.indexOf(nextUrl);
          infoText = urlPart.substring(startIdx, endIdx);
        } else {
          const startIdx = urlPart.indexOf(url) + url.length;
          infoText = urlPart.substring(startIdx);
        }
        
        // Parse quality and size from the info text
        const qualityMatch = infoText.match(/,\s*([\w\s]+p(?:\s+\d+Bit)?)/);
        const quality = qualityMatch ? qualityMatch[1].trim() : 'Unknown';
        
        const sizeMatch = infoText.match(/,\s*([\d.]+\s*[GMK]B)/);
        const size = sizeMatch ? sizeMatch[1].trim() : '';
        
        downloads.push({
          url,
          quality,
          size
        });
      }
    }
  }
  
  return downloads;
};

/**
 * Search content by title
 * @param {string} searchQuery - The search query
 * @param {string} contentType - The type of content ('movies' or 'series')
 * @returns {Array} Array of matching content
 */
export const searchContent = async (searchQuery, contentType = 'movies') => {
  if (!searchQuery || searchQuery.trim() === '') {
    // Return empty array for empty queries
    return [];
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  
  try {
    // Use the existing cached methods for better performance and reliability
    const allItems = contentType === 'movies' 
      ? await getAllMovies(500) 
      : await getAllSeries(500);
    
    // Filter items where title contains the search query (case insensitive)
    const results = allItems.filter(item => 
      item.title && item.title.toLowerCase().includes(trimmedQuery)
    );
    
    // Sort results by relevance (exact matches first)
    results.sort((a, b) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      
      // Exact match at the beginning gets highest priority
      if (aTitle.startsWith(trimmedQuery) && !bTitle.startsWith(trimmedQuery)) return -1;
      if (!aTitle.startsWith(trimmedQuery) && bTitle.startsWith(trimmedQuery)) return 1;
      
      // Next, exact matches anywhere in the title
      const aIncludes = aTitle.includes(trimmedQuery);
      const bIncludes = bTitle.includes(trimmedQuery);
      if (aIncludes && !bIncludes) return -1;
      if (!aIncludes && bIncludes) return 1;
      
      // Finally, sort alphabetically
      return aTitle.localeCompare(bTitle);
    });
    
    return results;
  } catch (error) {
    console.error("Error searching content:", error);
    return [];
  }
};

export default {
  getMoviesByCategory,
  getHomePageSections,
  getMovieById,
  getAllMovies,
  getAllSeries,
  searchMovies,
  getAvailableSeasons,
  parseEpisodes,
  parseFullSeasonDownloads,
  searchContent
};