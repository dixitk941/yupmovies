// Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Menu, X, TrendingUp, Star, Clock, Award } from 'lucide-react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const moviesPerPage = 20;
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);

  // Hide header on scroll down
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > 200) { // Show header background after scrolling
          headerRef.current.classList.add('bg-opacity-95', 'backdrop-blur-md');
          headerRef.current.classList.remove('bg-opacity-0');
        } else {
          headerRef.current.classList.remove('bg-opacity-95', 'backdrop-blur-md');
          headerRef.current.classList.add('bg-opacity-0');
        }
        
        if (window.scrollY > 100 && window.scrollY > lastScrollY.current) {
          // Scrolling down
          headerRef.current.classList.add('-translate-y-full');
        } else {
          // Scrolling up
          headerRef.current.classList.remove('-translate-y-full');
        }
      }
      
      lastScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', controlNavbar);
    
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, []);

  useEffect(() => {
    const fetchAllMovies = async () => {
      setIsLoading(true);
      try {
        const movies = await getAllMovies();
        setAllMovies(movies);
        setTimeout(() => setIsLoading(false), 800); // Simulate loading for visual effect
      } catch (error) {
        console.error("Error fetching all movies:", error);
        setIsLoading(false);
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
    
    // Scroll with animation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
    // Close search when opening menu
    if (!showMobileMenu) setShowSearch(false);
    // Add body class to prevent scrolling when menu is open
    document.body.classList.toggle('overflow-hidden', !showMobileMenu);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    // Close menu when opening search
    if (!showSearch) {
      setShowMobileMenu(false);
      document.body.classList.remove('overflow-hidden');
    }
  };

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setActiveSection('all');
    // Close mobile menu after selection on mobile
    if (window.innerWidth < 768) {
      setShowMobileMenu(false);
      document.body.classList.remove('overflow-hidden');
    }
  };
  
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSelectedPlatform(null);
    setSearchQuery('');
    
    if (window.innerWidth < 768) {
      setShowMobileMenu(false);
      document.body.classList.remove('overflow-hidden');
    }
  };

  // Skeleton loader component for movies grid
  const MovieSkeleton = () => (
    <div className="animate-pulse bg-gray-800 rounded-md overflow-hidden">
      <div className="h-[150px] bg-gray-700"></div>
      <div className="p-2">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Floating Header */}
      <header 
        ref={headerRef}
        className="fixed top-0 w-full bg-[#121212] bg-opacity-0 z-50 shadow-lg transition-all duration-300 transform"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                className="md:hidden mr-3 text-gray-300 hover:text-white focus:outline-none"
                onClick={toggleMobileMenu}
                aria-label="Toggle menu"
              >
                <div className="relative w-6 h-5">
                  <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${showMobileMenu ? 'rotate-45 top-2' : 'top-0'}`}></span>
                  <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${showMobileMenu ? 'opacity-0' : 'top-2'}`}></span>
                  <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${showMobileMenu ? '-rotate-45 top-2' : 'top-4'}`}></span>
                </div>
              </button>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                YupMovies
              </h1>
            </div>
            
            {/* Desktop Search */}
            <div className="hidden md:flex relative flex-1 max-w-xl mx-4 group">
              <input
                type="text"
                placeholder="Search movies..."
                className="w-full bg-[#1e1e1e] border border-gray-700 group-focus-within:border-red-500 rounded-full px-10 py-2 focus:outline-none transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            
            {/* Mobile Search Icon */}
            <button 
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
              onClick={toggleSearch}
              aria-label="Toggle search"
            >
              {showSearch ? (
                <X size={24} className="transition-all duration-300 transform rotate-90" />
              ) : (
                <Search size={24} className="transition-all duration-300" />
              )}
            </button>
          </div>
          
          {/* Mobile Search Input */}
          {showSearch && (
            <div className="md:hidden mt-3 pb-2 relative animate-slideDown">
              <input
                type="text"
                placeholder="Search movies..."
                className="w-full bg-[#1e1e1e] border border-gray-700 focus:border-red-500 rounded-full px-10 py-2 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-2.5 text-gray-400"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu - Slide from left */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-70 backdrop-blur-sm">
          <div 
            className="fixed top-[60px] left-0 h-[calc(100vh-60px)] w-4/5 max-w-xs bg-[#161616] transform transition-all duration-300 ease-in-out overflow-y-auto"
            style={{ boxShadow: '5px 0 15px rgba(0,0,0,0.3)' }}
          >
            <div className="p-5">
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-600 to-purple-600 flex items-center justify-center mb-4">
                  <span className="text-xl font-bold">YM</span>
                </div>
                <p className="text-sm text-gray-400">Discover amazing movies</p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-sm uppercase text-gray-500 font-medium tracking-wider mb-3">Browse</h3>
                <ul className="space-y-2">
                  <li>
                    <button 
                      className={`w-full flex items-center gap-3 p-2 rounded-lg ${activeSection === 'all' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                      onClick={() => handleSectionChange('all')}
                    >
                      <Star size={18} />
                      <span>All Movies</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`w-full flex items-center gap-3 p-2 rounded-lg ${activeSection === 'trending' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                      onClick={() => handleSectionChange('trending')}
                    >
                      <TrendingUp size={18} />
                      <span>Trending</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`w-full flex items-center gap-3 p-2 rounded-lg ${activeSection === 'new' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                      onClick={() => handleSectionChange('new')}
                    >
                      <Clock size={18} />
                      <span>New Releases</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`w-full flex items-center gap-3 p-2 rounded-lg ${activeSection === 'topRated' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                      onClick={() => handleSectionChange('topRated')}
                    >
                      <Award size={18} />
                      <span>Top Rated</span>
                    </button>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm uppercase text-gray-500 font-medium tracking-wider mb-3">Platforms</h3>
                <ul className="space-y-1">
                  {platforms.map((platform) => (
                    <li key={platform.id}>
                      <button
                        className={`w-full text-left p-2 rounded-md ${selectedPlatform === platform.name ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                        onClick={() => handlePlatformSelect(platform.name)}
                      >
                        {platform.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Tap outside to close */}
          <div 
            className="h-full w-full"
            onClick={toggleMobileMenu}
          />
        </div>
      )}

      {/* Desktop Categories */}
      <div className="hidden md:block fixed top-16 w-full bg-[#121212] bg-opacity-95 backdrop-blur-sm z-40 transition-all duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            <button
              className={`px-4 py-1 rounded-full transition-all duration-300 ${
                !selectedPlatform && activeSection === 'all' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'
              }`}
              onClick={() => handleSectionChange('all')}
            >
              All Movies
            </button>
            <button
              className={`px-4 py-1 rounded-full transition-all duration-300 ${
                !selectedPlatform && activeSection === 'trending' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'
              }`}
              onClick={() => handleSectionChange('trending')}
            >
              Trending
            </button>
            <button
              className={`px-4 py-1 rounded-full transition-all duration-300 ${
                !selectedPlatform && activeSection === 'new' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'
              }`}
              onClick={() => handleSectionChange('new')}
            >
              New Releases
            </button>
            <button
              className={`px-4 py-1 rounded-full transition-all duration-300 ${
                !selectedPlatform && activeSection === 'topRated' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'
              }`}
              onClick={() => handleSectionChange('topRated')}
            >
              Top Rated
            </button>
            <div className="border-r border-gray-700 mx-2"></div>
            {platforms.map((platform) => (
              <button
                key={platform.id}
                className={`px-4 py-1 rounded-full whitespace-nowrap transition-all duration-300 ${
                  selectedPlatform === platform.name ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'
                }`}
                onClick={() => handlePlatformSelect(platform.name)}
              >
                {platform.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-16 md:pt-36">
        {/* Loading state */}
        {isLoading ? (
          <div className="animate-pulse space-y-8">
            <div>
              <div className="h-8 bg-gray-800 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {[...Array(6)].map((_, i) => (
                  <MovieSkeleton key={i} />
                ))}
              </div>
            </div>
            <div>
              <div className="h-8 bg-gray-800 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {[...Array(6)].map((_, i) => (
                  <MovieSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Movie sections based on active section */}
            {!searchQuery && !selectedPlatform && (
              activeSection === 'all' ? (
                <>
                  <MovieSection 
                    title={<><Star className="inline mr-2 text-yellow-500" size={20} /> Featured</>} 
                    movies={allMovies.filter(movie => movie.category?.includes('featured'))} 
                  />
                  <MovieSection 
                    title={<><TrendingUp className="inline mr-2 text-blue-500" size={20} /> Trending Now</>}
                    movies={allMovies.filter(movie => movie.category?.includes('trending'))} 
                    showNumbers={true} 
                  />
                  <MovieSection 
                    title={<><Clock className="inline mr-2 text-green-500" size={20} /> New Releases</>}
                    movies={allMovies.filter(movie => movie.category?.includes('new'))} 
                  />
                  <MovieSection 
                    title={<><Award className="inline mr-2 text-amber-500" size={20} /> Top Rated</>}
                    movies={allMovies.filter(movie => movie.category?.includes('topRated'))} 
                  />
                </>
              ) : activeSection === 'trending' ? (
                <div className="mt-4">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <TrendingUp className="mr-2 text-blue-500" size={24} />
                    Trending Movies
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {allMovies.filter(movie => movie.category?.includes('trending'))
                      .map((movie, index) => (
                        <MovieCard 
                          key={movie.id || index}
                          movie={movie} 
                          onClick={setSelectedMovie}
                          index={index}
                          showNumber={true}
                        />
                      ))
                    }
                  </div>
                </div>
              ) : activeSection === 'new' ? (
                <div className="mt-4">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <Clock className="mr-2 text-green-500" size={24} />
                    New Releases
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {allMovies.filter(movie => movie.category?.includes('new'))
                      .map((movie, index) => (
                        <MovieCard 
                          key={movie.id || index}
                          movie={movie} 
                          onClick={setSelectedMovie}
                          index={index}
                        />
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <Award className="mr-2 text-amber-500" size={24} />
                    Top Rated
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {allMovies.filter(movie => movie.category?.includes('topRated'))
                      .map((movie, index) => (
                        <MovieCard 
                          key={movie.id || index}
                          movie={movie} 
                          onClick={setSelectedMovie}
                          index={index}
                        />
                      ))
                    }
                  </div>
                </div>
              )
            )}

            {/* Search and platform filtered results */}
            <div className={`mt-8 ${!searchQuery && !selectedPlatform ? 'pt-4 border-t border-gray-800' : ''}`}>
              <h2 className="text-xl font-bold mb-6 px-1 flex items-center">
                {searchQuery ? (
                  <>
                    <Search className="mr-2 text-blue-400" size={20} />
                    Search Results for "{searchQuery}"
                  </>
                ) : selectedPlatform ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-blue-600 mr-2"></div>
                    {selectedPlatform} Movies
                  </>
                ) : activeSection !== 'all' ? null : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-purple-600 mr-2"></div>
                    All Movies
                  </>
                )}
              </h2>
              
              {(searchQuery || selectedPlatform || activeSection === 'all') && (
                paginatedMovies.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {paginatedMovies.map((movie, index) => (
                      <div 
                        key={movie.id || index}
                        className="transform transition-transform duration-300 hover:scale-105"
                      >
                        <MovieCard 
                          movie={movie} 
                          onClick={setSelectedMovie}
                          index={index}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-lg">
                    <div className="text-6xl mb-4">😕</div>
                    <p className="text-gray-400 text-center mb-2">No movies found</p>
                    <p className="text-gray-500 text-sm text-center max-w-md mb-6">
                      We couldn't find any movies that match your search. Try adjusting your filters.
                    </p>
                    {searchQuery && (
                      <button 
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 transform transition-transform duration-300 hover:scale-105"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                )
              )}
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 md:gap-4 mt-8 mb-16 px-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={`px-3 py-2 rounded-full text-sm md:text-base transition-all duration-300 ${
                      currentPage === 1 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white shadow-lg hover:shadow-red-900/20'
                    }`}
                  >
                    <ChevronLeft className="inline md:mr-1" size={18} />
                    <span className="hidden md:inline">Previous</span>
                  </button>
                  
                  <div className="flex items-center justify-center bg-[#1e1e1e] rounded-full px-4 py-1 min-w-[80px]">
                    <span className="text-sm md:text-base font-medium">
                      {currentPage} / {totalPages}
                    </span>
                  </div>
                  
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={`px-3 py-2 rounded-full text-sm md:text-base transition-all duration-300 ${
                      currentPage === totalPages 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white shadow-lg hover:shadow-red-900/20'
                    }`}
                  >
                    <span className="hidden md:inline">Next</span>
                    <ChevronRight className="inline md:ml-1" size={18} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {selectedMovie && (
        <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}

      {/* Add custom animations to your CSS */}
      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease forwards;
        }
        
        /* Hide scrollbar but keep functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default Home;