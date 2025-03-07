import React, { useState, useEffect } from 'react';
import { Search, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { platforms, getMoviesByCategory, getMoviesByPlatform } from '../data/mockData';

const MovieCard = ({ movie }) => (
  <Link to={`/movie/${movie.id}`} className="flex-none basis-[14rem] bg-gray-800 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-transform duration-300">
    <img src={movie.image} alt={movie.title} className="w-full h-36 object-cover" />
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold line-clamp-1">{movie.title}</h3>
        <div className="flex items-center">
          <Star className="text-yellow-400 fill-current" size={14} />
          <span className="ml-1 text-xs">{movie.rating}</span>
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-2">{movie.platform}</div>
      <div className="flex flex-wrap gap-2">
        {movie.genre.map((g, index) => (
          <span key={index} className="bg-gray-700 px-2 py-1 rounded-full text-xxs">
            {g}
          </span>
        ))}
      </div>
    </div>
  </Link>
);

const MovieSection = ({ title, movies }) => {
  const [currentBatch, setCurrentBatch] = useState(0);
  const batchSize = 6;

  const handleNextBatch = () => {
    if ((currentBatch + 1) * batchSize < movies.length) {
      setCurrentBatch(currentBatch + 1);
    }
  };

  const handlePrevBatch = () => {
    if (currentBatch > 0) {
      setCurrentBatch(currentBatch - 1);
    }
  };

  const startIndex = currentBatch * batchSize;
  const endIndex = startIndex + batchSize;
  const currentMovies = movies.slice(startIndex, endIndex);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="flex items-center">
        {currentBatch > 0 && (
          <button
            className="bg-gray-700 p-2 rounded-full hover:bg-gray-600 transition-colors"
            onClick={handlePrevBatch}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex overflow-x-auto gap-3 pb-4 movie-scroll scrollbar-hide">
          {currentMovies.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
        {endIndex < movies.length && (
          <button
            className="bg-gray-700 p-2 rounded-full hover:bg-gray-600 transition-colors"
            onClick={handleNextBatch}
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

const AllMoviesSection = ({ title, movies }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 12;
  const totalPages = Math.ceil(movies.length / itemsPerPage);

  const handlePrevious = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMovies = movies.slice(startIndex, endIndex);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {currentMovies.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No movies found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentMovies.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0}
          className="bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-gray-400">
          Page {currentPage + 1} of {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages - 1}
          className="bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedMovies, setDisplayedMovies] = useState([]);
  const [sections, setSections] = useState({
    featured: [],
    trending: [],
    new: [],
    topRated: [],
    all: []
  });

  useEffect(() => {
    setSections({
      featured: getMoviesByCategory('featured'),
      trending: getMoviesByCategory('trending'),
      new: getMoviesByCategory('new'),
      topRated: getMoviesByCategory('topRated'),
      all: getMoviesByCategory('all')
    });
  }, []);

  useEffect(() => {
    let filtered = selectedPlatform
      ? getMoviesByPlatform(selectedPlatform)
      : getMoviesByCategory('all');

    if (searchQuery) {
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
        movie.platform.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setDisplayedMovies(filtered);
  }, [selectedPlatform, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">MovieReviews</h1>
            <div className="relative flex-1 max-w-xl mx-8">
              <input
                type="text"
                placeholder="Search movies..."
                className="w-full bg-gray-700 rounded-full px-6 py-2 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-2.5 text-gray-400" size={20} />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-full font-medium transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      <div className="bg-gray-800 py-4 shadow-md sticky top-20 z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              className={`bg-gray-700 px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-transform hover:scale-105 ${
                !selectedPlatform ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedPlatform(null)}
            >
              All Platforms
            </button>
            {platforms.map((platform) => (
              <button
                key={platform.id}
                className={`${platform.color} px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-transform hover:scale-105 ${
                  selectedPlatform === platform.name ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedPlatform(platform.name)}
              >
                {platform.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {searchQuery || selectedPlatform ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              {searchQuery ? 'Search Results' : `Movies on ${selectedPlatform}`}
            </h2>
            <div className="movie-grid">
              {displayedMovies.map(movie => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
            {displayedMovies.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No movies found
              </div>
            )}
          </div>
        ) : (
          <>
            <MovieSection title="Featured" movies={sections.featured} />
            <MovieSection title="Trending Now" movies={sections.trending} />
            <MovieSection title="New Releases" movies={sections.new} />
            <MovieSection title="Top Rated" movies={sections.topRated} />
            <AllMoviesSection title="All Movies" movies={sections.all} />
          </>
        )}
      </main>
    </div>
  );
}

export default Home;