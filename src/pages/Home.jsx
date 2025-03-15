// Home.jsx
import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { platforms } from '../data/mockData';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';
import MovieSection from './MovieSection';
import { getAllMovies } from '../services/movieService';

function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allMovies, setAllMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const moviesPerPage = 20;

  useEffect(() => {
    const fetchAllMovies = async () => {
      try {
        const movies = await getAllMovies();
        setAllMovies(movies);
      } catch (error) {
        console.error("Error fetching all movies:", error);
      }
    };

    fetchAllMovies();
  }, []);

  const [filteredMovies, setFilteredMovies] = useState([]);
  const [paginatedMovies, setPaginatedMovies] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let filtered = [...allMovies];

    if (searchQuery) {
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (movie.genre && movie.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (movie.platform && movie.platform.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedPlatform) {
      filtered = filtered.filter(movie => movie.platform === selectedPlatform);
    }

    setFilteredMovies(filtered);
    setTotalPages(Math.ceil(filtered.length / moviesPerPage));
    setPaginatedMovies(filtered.slice(0, moviesPerPage));
  }, [searchQuery, selectedPlatform, allMovies, moviesPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const start = (page - 1) * moviesPerPage;
    const end = start + moviesPerPage;
    setPaginatedMovies(filteredMovies.slice(start, end));
  };

  return (
    <div className="min-h-screen bg-[#141414]">
      <header className="fixed top-0 w-full bg-[#141414] bg-opacity-90 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-red-600">MovieReviews</h1>
            <div className="relative flex-1 max-w-xl">
              <input
                type="text"
                placeholder="Search movies..."
                className="w-full bg-[#181818] rounded px-10 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="fixed top-16 w-full bg-[#141414] z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            <button
              className={`px-4 py-1 rounded ${
                !selectedPlatform ? 'bg-red-600' : 'bg-[#181818]'
              }`}
              onClick={() => setSelectedPlatform(null)}
            >
              All
            </button>
            {platforms.map((platform) => (
              <button
                key={platform.id}
                className={`px-4 py-1 rounded whitespace-nowrap ${
                  selectedPlatform === platform.name ? 'bg-red-600' : 'bg-[#181818]'
                }`}
                onClick={() => setSelectedPlatform(platform.name)}
              >
                {platform.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-36">
        {!searchQuery && !selectedPlatform && (
          <>
            <MovieSection title="Featured" movies={allMovies.filter(movie => movie.category?.includes('featured'))} />
            <MovieSection title="Trending Now" movies={allMovies.filter(movie => movie.category?.includes('trending'))} showNumbers={true} />
            <MovieSection title="New Releases" movies={allMovies.filter(movie => movie.category?.includes('new'))} />
            <MovieSection title="Top Rated" movies={allMovies.filter(movie => movie.category?.includes('topRated'))} />
            <MovieSection title="Uncategorized Movies" movies={allMovies.filter(movie => !movie.category || movie.category.length === 0)} />
          </>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">
            {searchQuery ? 'Search Results' : 'All Movies'}
          </h2>
          <div className="movie-grid">
            {paginatedMovies.map((movie, index) => (
              <MovieCard 
                key={movie.id} 
                movie={movie} 
                onClick={setSelectedMovie}
                index={index}
              />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className={currentPage === 1 ? 'opacity-50' : ''}
              >
                Previous
              </button>
              <span className="flex items-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className={currentPage === totalPages ? 'opacity-50' : ''}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      {selectedMovie && (
        <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}

export default Home;