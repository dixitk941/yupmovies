// hooks/usePaginatedMovies.js
import { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { transformMovieData } from '../services/movieService';

const BATCH_SIZE = 100;

export function usePaginatedMovies() {
  const [movies, setMovies] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch movies for a specific page
  const fetchMoviesPage = async (page) => {
    const start = page * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    try {
      const { data, error, count } = await supabase
        .from('movies')
        .select(`
          record_id,
          title,
          url_slug,
          featured_image,
          poster,
          categories,
          links,
          content,
          excerpt,
          status,
          date,
          modified_date
        `, { count: page === 0 ? 'exact' : undefined })
        .eq('status', 'publish')
        .order('modified_date', { ascending: false })
        .range(start, end);

      if (error) throw error;

      // Store total count on first load
      if (page === 0 && count !== null) {
        setTotalCount(count);
      }

      const transformedData = data ? data.map(transformMovieData).filter(Boolean) : [];
      
      return {
        data: transformedData,
        hasMore: transformedData.length === BATCH_SIZE
      };
    } catch (err) {
      throw new Error(`Failed to fetch movies: ${err.message}`);
    }
  };

  // Load initial 100 movies
  useEffect(() => {
    let isMounted = true;

    const loadInitialMovies = async () => {
      setInitialLoading(true);
      setError(null);

      try {
        const result = await fetchMoviesPage(0);
        
        if (isMounted) {
          setMovies(result.data);
          setCurrentPage(0);
          setHasMore(result.hasMore);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    loadInitialMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load more movies
  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const result = await fetchMoviesPage(nextPage);
      
      setMovies(prevMovies => [...prevMovies, ...result.data]);
      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    movies,
    loading,
    initialLoading,
    error,
    hasMore,
    loadMore,
    totalCount,
    loadedCount: movies.length
  };
}

// Transform function (add this if not in movieService)
const transformMovieData = (row) => {
  if (!row) return null;
  
  return {
    id: row.record_id?.toString() || row.url_slug,
    recordId: row.record_id,
    title: row.title || 'Untitled',
    slug: row.url_slug,
    featuredImage: row.featured_image,
    poster: row.poster,
    categories: row.categories ? row.categories.split(',').map(c => c.trim()) : [],
    releaseYear: extractReleaseYear(row.categories),
    status: row.status,
    publishDate: row.date,
    modifiedDate: row.modified_date
  };
};

function extractReleaseYear(categories) {
  if (!categories) return null;
  const yearMatch = categories.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : null;
}
