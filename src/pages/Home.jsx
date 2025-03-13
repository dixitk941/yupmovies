import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, ChevronLeft, ChevronRight, X, Download, Plus, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { platforms, getMoviesByCategory, getMoviesByPlatform } from '../data/mockData';

const MovieCard = ({ movie, onClick, index, showNumber }) => (
  <div className="movie-card cursor-pointer relative pl-12" onClick={() => onClick(movie)}>
    {showNumber && (
      <div className="trending-number">
        <span className="number">{index + 1}</span>
      </div>
    )}
    <img 
      src={movie.image} 
      alt={movie.title} 
      className="w-full h-[150px] object-cover rounded-sm"
    />
    <div className="opacity-0 hover:opacity-100 absolute inset-0 left-12 bg-black bg-opacity-75 p-4 transition-opacity rounded-sm">
      <h3 className="text-sm font-semibold mb-1">{movie.title}</h3>
      <div className="flex items-center text-xs mb-2">
        <Star className="text-yellow-400 fill-current" size={12} />
        <span className="ml-1">{movie.rating}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {movie.genre.slice(0, 2).map((g, index) => (
          <span key={index} className="text-xs bg-red-600 px-2 py-0.5 rounded">
            {g}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const MovieDetails = ({ movie, onClose }) => {
  const navigate = useNavigate();
  const [showQualityOptions, setShowQualityOptions] = useState(false);

  const qualities = [
    { label: '480p', value: '480' },
    { label: '720p', value: '720' },
    { label: '1080p', value: '1080' },
    { label: '4K', value: '2160' }
  ];

  const handleDownload = (quality) => {
    window.location.href = `https://my-blog-five-amber-64.vercel.app/redirect?movieId=${movie.id}&quality=${quality}`;
    onClose();
  };

  return (
    <div className="movie-details-overlay" onClick={onClose}>
      <div 
        className="relative w-[90%] max-w-4xl bg-[#181818] rounded-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 z-10 bg-black rounded-full p-1"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        
        <div className="relative">
          <img 
            src={movie.image} 
            alt={movie.title} 
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#181818]">
            <h2 className="text-4xl font-bold mb-4">{movie.title}</h2>
            <div className="flex gap-4 mb-6">
              <div className="relative">
                <button 
                  className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded"
                  onClick={() => setShowQualityOptions(!showQualityOptions)}
                >
                  <Download size={20} />
                  Download
                </button>
                {showQualityOptions && (
                  <div className="absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-32">
                    {qualities.map((quality) => (
                      <button
                        key={quality.value}
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-white"
                        onClick={() => handleDownload(quality.value)}
                      >
                        {quality.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="flex items-center gap-2 bg-gray-500 bg-opacity-50 px-6 py-2 rounded">
                <Plus size={20} />
                My List
              </button>
              <button className="flex items-center gap-2 bg-gray-500 bg-opacity-50 p-2 rounded-full">
                <ThumbsUp size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="flex gap-4 text-sm mb-6">
            <span className="text-green-500">98% Match</span>
            <span>{movie.releaseYear}</span>
            <span>{movie.duration}</span>
            <span className="border border-gray-500 px-1">HD</span>
          </div>

          <p className="text-gray-300 mb-6">{movie.description}</p>

          <div className="grid grid-cols-3 gap-8">
            <div>
              <span className="text-gray-400">Cast:</span>
              <p>{movie.cast.join(', ')}</p>
            </div>
            <div>
              <span className="text-gray-400">Genres:</span>
              <p>{movie.genre.join(', ')}</p>
            </div>
            <div>
              <span className="text-gray-400">Available in:</span>
              <p>{movie.language.join(', ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MovieSection = ({ title, movies, showNumbers }) => {
  const scrollRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const scroll = (direction) => {
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    setShowLeftButton(container.scrollLeft > 0);
    setShowRightButton(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    );
  };

  return (
    <div className="movie-section mb-12">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <div className="relative">
        {showLeftButton && (
          <button 
            className="scroll-button left"
            onClick={() => scroll('left')}
          >
            <ChevronLeft size={30} />
          </button>
        )}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pl-4"
          onScroll={handleScroll}
        >
          {movies.map((movie, index) => (
            <div key={movie.id} className="flex-none w-[240px]">
              <MovieCard 
                movie={movie} 
                onClick={setSelectedMovie} 
                index={index}
                showNumber={showNumbers}
              />
            </div>
          ))}
        </div>
        {showRightButton && (
          <button 
            className="scroll-button right"
            onClick={() => scroll('right')}
          >
            <ChevronRight size={30} />
          </button>
        )}
      </div>
      {selectedMovie && (
        <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
};

function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sections, setSections] = useState({
    featured: [],
    trending: [],
    new: [],
    topRated: []
  });
  const [selectedMovie, setSelectedMovie] = useState(null);
  const moviesPerPage = 20;

  useEffect(() => {
    setSections({
      featured: getMoviesByCategory('featured'),
      trending: getMoviesByCategory('trending'),
      new: getMoviesByCategory('new'),
      topRated: getMoviesByCategory('topRated')
    });
  }, []);

  const allMovies = selectedPlatform
    ? getMoviesByPlatform(selectedPlatform)
    : getMoviesByCategory('all');

  const filteredMovies = searchQuery
    ? allMovies.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
        movie.platform.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allMovies;

  const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * moviesPerPage,
    currentPage * moviesPerPage
  );

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
            <MovieSection title="Featured" movies={sections.featured} />
            <MovieSection title="Trending Now" movies={sections.trending} showNumbers={true} />
            <MovieSection title="New Releases" movies={sections.new} />
            <MovieSection title="Top Rated" movies={sections.topRated} />
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
                onClick={() => setCurrentPage(p => p - 1)}
                className={currentPage === 1 ? 'opacity-50' : ''}
              >
                Previous
              </button>
              <span className="flex items-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
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