// services/movieService.js
import { db } from '../firebase';
import { collection, getDocs, query, where, limit, orderBy, getDoc, doc } from 'firebase/firestore';

/**
 * Fetch movies by category (including special categories)
 * @param {string} category - Category to fetch (e.g. "Action", "Comedy", "Featured", "Trending Now")
 * @param {number} limitCount - Optional limit on number of results (default 20)
 */
export const getMoviesByCategory = async (category, limitCount = 20) => {
  console.log(`Fetching movies by category: ${category}`);
  
  try {
    const moviesCollectionRef = collection(db, "movies");
    
    // For special categories, we need to be more careful with the query
    const movieQuery = query(
      moviesCollectionRef, 
      where("category", "array-contains", category),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(movieQuery);
    
    const movies = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${movies.length} movies for category: ${category}`);
    return movies;
  } catch (error) {
    console.error(`Error fetching movies by category ${category}:`, error);
    return [];
  }
};

/**
 * Get a movie by its ID
 */
export const getMovieById = async (movieId) => {
  try {
    const movieRef = doc(db, "movies", movieId);
    const movieSnap = await getDoc(movieRef);
    
    if (movieSnap.exists()) {
      return {
        id: movieSnap.id,
        ...movieSnap.data()
      };
    } else {
      console.log(`No movie found with ID: ${movieId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching movie by ID ${movieId}:`, error);
    return null;
  }
};

/**
 * Get all movies with optional limit
 */
export const getAllMovies = async (limitCount = 100) => {
  console.log(`Attempting to fetch all movies (limit: ${limitCount})`);
  
  try {
    const moviesCollectionRef = collection(db, "movies");
    const movieQuery = query(moviesCollectionRef, limit(limitCount));
    
    console.log("Executing query for all movies");
    const querySnapshot = await getDocs(movieQuery);
    console.log("Query executed successfully for all movies");
    
    const movies = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${movies.length} movies in total`);
    return movies;
  } catch (error) {
    console.error("Error fetching all movies:", error);
    return [];
  }
};

/**
 * Get movies for home page sections (Featured, Trending Now, Top Rated, New Release)
 * @returns {Object} Object containing arrays of movies for each section
 */
export const getHomePageSections = async (count = 10) => {
  try {
    // Fetch all movies once for efficiency
    const allMovies = await getAllMovies(200);  // Fetch more to ensure we get enough for each category
    
    if (!allMovies.length) {
      return {
        featured: [],
        trending: [],
        topRated: [],
        newReleases: []
      };
    }
    
    const featuredMovies = allMovies
      .filter(movie => movie.category && movie.category.includes("Featured"))
      .slice(0, count);
      
    const trendingMovies = allMovies
      .filter(movie => movie.category && movie.category.includes("Trending Now"))
      .slice(0, count);
      
    const topRatedMovies = allMovies
      .filter(movie => movie.category && movie.category.includes("Top Rated"))
      .slice(0, count);
      
    const newReleaseMovies = allMovies
      .filter(movie => movie.category && movie.category.includes("New Release"))
      .slice(0, count);
    
    // Function to get random movies
    const getRandomMovies = (n) => {
      const shuffled = [...allMovies].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, n);
    };
    
    // Fill in sections with at least some movies
    return {
      featured: featuredMovies.length ? featuredMovies : getRandomMovies(count),
      trending: trendingMovies.length ? trendingMovies : getRandomMovies(count),
      topRated: topRatedMovies.length ? topRatedMovies : getRandomMovies(count),
      newReleases: newReleaseMovies.length ? newReleaseMovies : getRandomMovies(count)
    };
  } catch (error) {
    console.error("Error fetching home page sections:", error);
    return {
      featured: [],
      trending: [],
      topRated: [],
      newReleases: []
    };
  }
};

/**
 * Search movies by title or other criteria
 * @param {string} searchTerm - The term to search for
 * @param {number} limitCount - Maximum number of results to return
 */
export const searchMovies = async (searchTerm, limitCount = 20) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    
    // Since we can't do case-insensitive search directly in Firestore,
    // we fetch a reasonable number of movies and filter client-side
    const allMovies = await getAllMovies(100);
    
    const searchTermLower = searchTerm.toLowerCase();
    const results = allMovies
      .filter(movie => {
        // Check title
        if (movie.title && movie.title.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Check categories
        if (movie.category && movie.category.some(cat => 
          cat.toLowerCase().includes(searchTermLower)
        )) {
          return true;
        }
        
        return false;
      })
      .slice(0, limitCount);
    
    return results;
  } catch (error) {
    console.error(`Error searching movies for "${searchTerm}":`, error);
    return [];
  }
};

export default {
  getMoviesByCategory,
  getHomePageSections,
  getMovieById,
  getAllMovies,
  searchMovies
};