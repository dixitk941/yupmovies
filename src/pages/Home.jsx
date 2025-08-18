import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Film, Tv } from 'lucide-react';
import { platforms } from '../data/mockData';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';
import SeriesDetail from './SeriesDetail';
import movieService from '../services/movieService';

function Home() {
  const [contentType, setContentType] = useState('movies');
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const moviesPerPage = 20;
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);

  const [searchTimeout, setSearchTimeout] = useState(null);
  const [filteredContent, setFilteredContent] = useState([]);
  const [paginatedContent, setPaginatedContent] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  // Remove these platforms from filters (case-insensitive)
  const removePlatforms = ["zee5", "sonyliv", "voot", "mx player"];
  const platformList = platforms.filter(
    p => !removePlatforms.some(name => p.name.toLowerCase().includes(name))
  );

  useEffect(() => {
    const controlNavbar = () => {
      if (!headerRef.current) return;
      if (window.scrollY > 200) {
        headerRef.current.classList.add('bg-opacity-95', 'backdrop-blur-md');
        headerRef.current.classList.remove('bg-opacity-0');
      } else {
        headerRef.current.classList.remove('bg-opacity-95', 'backdrop-blur-md');
        headerRef.current.classList.add('bg-opacity-0');
      }
      if (window.scrollY > 100 && window.scrollY > lastScrollY.current) {
        headerRef.current.classList.add('-translate-y-full');
      } else {
        headerRef.current.classList.remove('-translate-y-full');
      }
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([movieService.getAllMovies(), movieService.getAllSeries()])
      .then(([movies, series]) => {
        setAllMovies(movies);
        setAllSeries(series);
        setTimeout(() => setIsLoading(false), 800);
      }).catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (searchQuery) return;
    const contentToFilter = contentType === 'movies' ? allMovies : allSeries;
    let filtered = [...contentToFilter];
    if (selectedPlatform) {
      filtered = filtered.filter(item =>
        item.category &&
        item.category.toLowerCase().includes(selectedPlatform.toLowerCase())
      );
    }
    setFilteredContent(filtered);
    setTotalPages(Math.ceil(filtered.length / moviesPerPage));
    setPaginatedContent(filtered.slice(0, moviesPerPage));
    setCurrentPage(1);
  }, [selectedPlatform, allMovies, allSeries, contentType]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      if (value.trim()) {
        setIsLoading(true);
        movieService.searchContent(value, contentType)
          .then(results => {
            setFilteredContent(results);
            setPaginatedContent(results.slice(0, moviesPerPage));
            setTotalPages(Math.ceil(results.length / moviesPerPage));
            setCurrentPage(1);
          })
          .finally(() => setIsLoading(false));
      } else {
        const currentContent = contentType === 'movies' ? allMovies : allSeries;
        setFilteredContent(currentContent);
        setPaginatedContent(currentContent.slice(0, moviesPerPage));
        setTotalPages(Math.ceil(currentContent.length / moviesPerPage));
      }
    }, 400);
    setSearchTimeout(timeout);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const start = (page - 1) * moviesPerPage;
    setPaginatedContent(filteredContent.slice(start, start + moviesPerPage));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setSearchQuery('');
  };

  const handleContentTypeSwitch = (type) => {
    setContentType(type);
    setSelectedPlatform(null);
    setCurrentPage(1);
    setSearchQuery('');
  };

  const MovieSkeleton = () => (
    <div className="animate-pulse bg-gray-800 rounded-md overflow-hidden">
      <div className="h-[150px] bg-gray-700"></div>
      <div className="p-2">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  );

  const renderDetailComponent = () => {
    if (!selectedMovie) return null;
    const isSeries = selectedMovie.isSeries || Object.keys(selectedMovie).some(key => key.startsWith('Season ') && selectedMovie[key]);
    return isSeries
      ? <SeriesDetail series={selectedMovie} onClose={() => setSelectedMovie(null)} />
      : <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />;
  };

  // Bottom navigation bar (mobile)
  const BottomBar = () => (
    <nav className="fixed z-50 bottom-0 left-0 right-0 bg-[#18181f] border-t border-[#28282f] flex md:hidden items-center justify-around h-16">
      <button
        className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none ${contentType === 'movies' ? 'text-red-500 font-semibold' : 'text-gray-400'}`}
        onClick={() => handleContentTypeSwitch('movies')}
      >
        <Film size={24} /><span className="text-xs">Movies</span>
      </button>
      <button
        className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none ${contentType === 'series' ? 'text-purple-500 font-semibold' : 'text-gray-400'}`}
        onClick={() => handleContentTypeSwitch('series')}
      >
        <Tv size={24} /><span className="text-xs">Series</span>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-20">
      {/* HEADER (without logo and with desktop toggle only) */}
      <header ref={headerRef} className="fixed top-0 w-full bg-[#121212] bg-opacity-0 z-50 shadow-lg transition-all duration-300 transform">
        <div className="container mx-auto px-4 py-3 flex items-center justify-end">
          <div className="hidden md:flex items-center mr-4">
            <div className="bg-[#1e1e1e] p-1 rounded-full flex">
              <button className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${contentType === 'movies' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => handleContentTypeSwitch('movies')}
              ><Film size={16} /><span>Movies</span></button>
              <button className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${contentType === 'series' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => handleContentTypeSwitch('series')}
              ><Tv size={16} /><span>Series</span></button>
            </div>
          </div>
          {/* Desktop Search */}
          <div className="flex items-center flex-1 max-w-xl mx-4 group">
            <input
              type="text"
              placeholder={`Search ${contentType === 'movies' ? 'movies' : 'series'}...`}
              className="w-full bg-[#1e1e1e] border border-gray-700 group-focus-within:border-red-500 rounded-full px-10 py-2 focus:outline-none transition-all duration-300"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {isLoading ? (
          <div className="animate-pulse space-y-8">{[...Array(3)].map((_, i) => <div key={i} className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2 md:gap-4">{[...Array(6)].map((__, j) => <MovieSkeleton key={j} />)}</div>)}</div>
        ) : (
          <>
            {/* PLATFORM FILTERS ONLY (no section filters) */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {platformList.map(platform => (
                <button key={platform.id}
                  className={`px-4 py-1 rounded-full whitespace-nowrap ${selectedPlatform === platform.name ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'}`}
                  onClick={() => handlePlatformSelect(platform.name)}
                >{platform.name}</button>
              ))}
            </div>

            {/* MAIN CONTENT */}
            <div>
              {paginatedContent.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2 md:gap-4">
                  {paginatedContent.map((movie, idx) => <MovieCard key={movie.id || idx} movie={movie} onClick={setSelectedMovie} index={idx} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-lg">
                  <div className="text-6xl mb-4">😕</div>
                  <p className="text-gray-400 text-center mb-2">No content found</p>
                  <p className="text-gray-500 text-sm text-center max-w-md mb-6">
                    We couldn't find any content that matches your search. Try adjusting your filters.
                  </p>
                  {searchQuery && (
                    <button className="px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500"
                      onClick={() => setSearchQuery('')}>Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 md:gap-4 mt-8 mb-16 px-1">
                <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}
                  className={`px-3 py-2 rounded-full text-sm md:text-base ${currentPage === 1 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-purple-600 text-white'}`}>
                  <ChevronLeft className="inline md:mr-1" size={18} />
                  <span className="hidden md:inline">Previous</span>
                </button>
                <div className="flex items-center justify-center bg-[#1e1e1e] rounded-full px-4 py-1 min-w-[80px]">
                  <span className="text-sm md:text-base font-medium">{currentPage} / {totalPages}</span>
                </div>
                <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}
                  className={`px-3 py-2 rounded-full text-sm md:text-base ${currentPage === totalPages ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-purple-600 text-white'}`}>
                  <span className="hidden md:inline">Next</span>
                  <ChevronRight className="inline md:ml-1" size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedMovie && renderDetailComponent()}
      <BottomBar />
      <style jsx>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideDown { animation: slideDown 0.3s ease forwards; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default Home;
