// services/movieService.js
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const getMoviesByCategory = async (category) => {
  console.log(`Attempting to fetch movies by category: ${category}`);
  
  try {
    const moviesCollectionRef = collection(db, "movies");
    const q = query(moviesCollectionRef, where("category", "array-contains", category));
    
    console.log(`Executing query for category: ${category}`);
    const querySnapshot = await getDocs(q);
    console.log(`Query executed successfully for category: ${category}`);
    
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

export const getMoviesByPlatform = async (platform) => {
  console.log(`Attempting to fetch movies by platform: ${platform}`);
  
  try {
    const moviesCollectionRef = collection(db, "movies");
    const q = query(moviesCollectionRef, where("platform", "==", platform));
    
    console.log(`Executing query for platform: ${platform}`);
    const querySnapshot = await getDocs(q);
    console.log(`Query executed successfully for platform: ${platform}`);
    
    const movies = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${movies.length} movies for platform: ${platform}`);
    return movies;
  } catch (error) {
    console.error(`Error fetching movies by platform ${platform}:`, error);
    return [];
  }
};

export const getAllMovies = async () => {
  console.log("Attempting to fetch all movies");
  
  try {
    const moviesCollectionRef = collection(db, "movies");
    
    console.log("Executing query for all movies");
    const querySnapshot = await getDocs(moviesCollectionRef);
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