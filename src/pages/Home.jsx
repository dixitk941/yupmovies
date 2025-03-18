// Update imports to include SeriesDetail component
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Menu, X, TrendingUp, Star, Clock, Award, Film, Tv } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { platforms } from '../data/mockData';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';
import SeriesDetail from './SeriesDetail'; // Import the SeriesDetail component
import MovieSection from './MovieSection';
import movieService from '../services/movieService';

function Home() {
  // Add new state for content type (movies/series)
  const [contentType, setContentType] = useState('movies'); // 'movies' or 'series'
  
  // Keep your existing states
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]); // Add state for series
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const moviesPerPage = 20;
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);

  // Keep existing scroll effect
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
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
      }
      
      lastScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', controlNavbar);
    
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, []);

  // Modify to fetch both movies and series
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const [movies, series] = await Promise.all([
          movieService.getAllMovies(),
          movieService.getAllSeries()
        ]);
        
        setAllMovies(movies);
        setAllSeries(series);
        setTimeout(() => setIsLoading(false), 800);
      } catch (error) {
        console.error("Error fetching content:", error);
        setIsLoading(false);
      }
    };

    fetchContent();
  }, []);

  const [filteredContent, setFilteredContent] = useState([]);
  const [paginatedContent, setPaginatedContent] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  // Update filtering based on content type
  useEffect(() => {
    // Select the appropriate content based on content type
    const contentToFilter = contentType === 'movies' ? allMovies : allSeries;
    
    let filtered = [...contentToFilter];

    if (searchQuery) {
      filtered = filtered.filter(item =>
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedPlatform) {
      filtered = filtered.filter(item => 
        item.category && item.category.toLowerCase().includes(selectedPlatform.toLowerCase())
      );
    }

    setFilteredContent(filtered);
    setTotalPages(Math.ceil(filtered.length / moviesPerPage));
    setPaginatedContent(filtered.slice(0, moviesPerPage));
  }, [searchQuery, selectedPlatform, allMovies, allSeries, contentType, moviesPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const start = (page - 1) * moviesPerPage;
    const end = start + moviesPerPage;
    setPaginatedContent(filteredContent.slice(start, end));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
    if (!showMobileMenu) setShowSearch(false);
    document.body.classList.toggle('overflow-hidden', !showMobileMenu);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setShowMobileMenu(false);
      document.body.classList.remove('overflow-hidden');
    }
  };

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setActiveSection('all');
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

  // Add handler for switching between movies and series
  const handleContentTypeSwitch = (type) => {
    setContentType(type);
    setActiveSection('all');
    setSelectedPlatform(null);
    setCurrentPage(1);
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

  const [sections, setSections] = useState({
    featured: [],
    trending: [],
    topRated: [],
    newReleases: [],
    series: [] // Series section
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const data = await movieService.getHomePageSections(10);
        setSections(data);
      } catch (error) {
        console.error("Error loading home page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  // Get the current content to display
  const currentContent = contentType === 'movies' ? allMovies : allSeries;

  // Helper function to filter content by category
  const filterByCategory = (content, category) => {
    return content.filter(item => item.category && item.category.toLowerCase().includes(category.toLowerCase()));
  };

  // Render the appropriate detail component based on content type
  const renderDetailComponent = () => {
    if (!selectedMovie) return null;
    
    // Check if the selected content is a series
    const isSeries = selectedMovie.isSeries || 
      Object.keys(selectedMovie).some(key => key.startsWith('Season ') && selectedMovie[key]);
    
    // Render SeriesDetail for series, MovieDetails for movies
    if (isSeries) {
      return (
        <SeriesDetail 
          series={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
        />
      );
    } else {
      return (
        <MovieDetails 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
        />
      );
    }
  };

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
                placeholder={`Search ${contentType === 'movies' ? 'movies' : 'series'}...`}
                className="w-full bg-[#1e1e1e] border border-gray-700 group-focus-within:border-red-500 rounded-full px-10 py-2 focus:outline-none transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            
            {/* Movie/Series Toggle (Desktop) */}
            <div className="hidden md:flex items-center mr-4">
              <div className="bg-[#1e1e1e] p-1 rounded-full flex">
                <button
                  className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                    contentType === 'movies' 
                      ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => handleContentTypeSwitch('movies')}
                >
                  <Film size={16} />
                  <span>Movies</span>
                </button>
                <button
                  className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                    contentType === 'series' 
                      ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => handleContentTypeSwitch('series')}
                >
                  <Tv size={16} />
                  <span>Series</span>
                </button>
              </div>
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
                placeholder={`Search ${contentType === 'movies' ? 'movies' : 'series'}...`}
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

      {/* Mobile Menu - With Movie/Series Toggle */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-70 backdrop-blur-sm">
          <div 
            className="fixed top-[60px] left-0 h-[calc(100vh-60px)] w-4/5 max-w-xs bg-[#161616] transform transition-all duration-300 ease-in-out overflow-y-auto"
            style={{ boxShadow: '5px 0 15px rgba(0,0,0,0.3)' }}
          >
            <div className="p-5">
              {/* Content Type Switcher - Mobile */}
              <div className="w-full bg-[#1a1a1a] p-1 rounded-full flex mb-6">
                <button
                  className={`flex-1 py-2 rounded-full flex items-center justify-center gap-1.5 transition-all ${
                    contentType === 'movies' 
                      ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' 
                      : 'text-gray-400'
                  }`}
                  onClick={() => handleContentTypeSwitch('movies')}
                >
                  <Film size={16} />
                  <span>Movies</span>
                </button>
                <button
                  className={`flex-1 py-2 rounded-full flex items-center justify-center gap-1.5 transition-all ${
                    contentType === 'series' 
                      ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' 
                      : 'text-gray-400'
                  }`}
                  onClick={() => handleContentTypeSwitch('series')}
                >
                  <Tv size={16} />
                  <span>Series</span>
                </button>
              </div>
            
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-600 to-purple-600 flex items-center justify-center mb-4">
                  <span className="text-xl font-bold">YM</span>
                </div>
                <p className="text-sm text-gray-400">
                  {contentType === 'movies' ? 'Discover amazing movies' : 'Watch your favorite series'}
                </p>
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
                      <span className='font-10'>{contentType === 'movies' ? 'All Movies' : 'All Series'}</span>
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
                      className={`w-full flex items-center gap-3 p-2 rounded-lg ${activeSection === 'topSeries' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                      onClick={() => handleSectionChange('topSeries')}
                    >
                      <Tv size={18} />
                      <span>Top 10 Series</span>
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
      <div className="hidden md:block fixed top-16 w-full bg-[#121212] bg-opacity-95 backdrop-blur-sm z-40 transition-all duration-300 text-[12px]">
      <div className="container mx-auto px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            <button
              className={`px-4 py-1  rounded-full transition-all duration-300 ${
                !selectedPlatform && activeSection === 'all' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'
              }`}
              onClick={() => handleSectionChange('all')}
            >
              {contentType === 'movies' ? 'All Movies' : 'All Series'}
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
                !selectedPlatform && activeSection === 'topSeries' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white' : 'bg-[#1e1e1e] hover:bg-gray-800'
              }`}
              onClick={() => handleSectionChange('topSeries')}
            >
              Top 10 Series
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
            {/* Movie or Series label */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold">
                {contentType === 'movies' ? (
                  <span className="flex items-center">
                    <Film className="inline mr-2 text-red-500" size={28} /> Movies
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Tv className="inline mr-2 text-purple-500" size={28} /> TV Series
                  </span>
                )}
              </h1>
            </div>
          
            {/* Movie sections based on active section */}
            {!searchQuery && !selectedPlatform && (
              activeSection === 'all' ? (
                <>
                  {/* Featured section */}
                  <MovieSection 
                    title={<><Star className="inline mr-2 text-yellow-500" size={20} /> Featured</>}
                    movies={contentType === 'movies' ? sections.featured.filter(item => !item.isSeries) : sections.featured.filter(item => item.isSeries)} 
                  />

                  {/* Trending section */}
                  <MovieSection 
                    title={<><TrendingUp className="inline mr-2 text-blue-500" size={20} /> Trending Now</>}
                    movies={contentType === 'movies' ? sections.trending.filter(item => !item.isSeries) : sections.trending.filter(item => item.isSeries)}
                    showNumbers={true} 
                  />

                  {/* Top Series section - always display if available */}
                  {contentType === 'series' && (
                    <MovieSection 
                      title={<><Tv className="inline mr-2 text-purple-500" size={20} /> Top Series</>}
                      movies={sections.series.slice(0, 10)}
                      showNumbers={true}
                    />
                  )}

                  {/* New releases */}
                  <MovieSection 
                    title={<><Clock className="inline mr-2 text-green-500" size={20} /> New Releases</>}
                    movies={contentType === 'movies' ? sections.newReleases.filter(item => !item.isSeries) : sections.newReleases.filter(item => item.isSeries)}
                  />

                  {/* Top rated */}
                  <MovieSection 
                    title={<><Award className="inline mr-2 text-amber-500" size={20} /> Top Rated</>}
                    movies={contentType === 'movies' ? sections.topRated.filter(item => !item.isSeries) : sections.topRated.filter(item => item.isSeries)}
                  />
                </>
              ) : activeSection === 'trending' ? (
                <div className="mt-4">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <TrendingUp className="mr-2 text-blue-500" size={24} />
                    Trending {contentType === 'movies' ? 'Movies' : 'Series'}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {sections.trending
                      .filter(item => contentType === 'movies' ? !item.isSeries : item.isSeries)
                      .map((item, index) => (
                        <MovieCard 
                          key={item.id || index}
                          movie={item} 
                          onClick={setSelectedMovie}
                          index={index}
                          showNumber={true}
                        />
                      ))
                    }
                  </div>
                </div>
              ) : activeSection === 'topSeries' ? (
                <div className="mt-4">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <Tv className="mr-2 text-purple-500" size={24} />
                    Top 10 Series
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {sections.series
                      .slice(0, 10)
                      .map((item, index) => (
                        <MovieCard 
                          key={item.id || index}
                          movie={item} 
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
                    New {contentType === 'movies' ? 'Movies' : 'Series'} Releases
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {sections.newReleases
                      .filter(item => contentType === 'movies' ? !item.isSeries : item.isSeries)
                      .map((item, index) => (
                        <MovieCard 
                          key={item.id || index}
                          movie={item} 
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
                    Top Rated {contentType === 'movies' ? 'Movies' : 'Series'}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {sections.topRated
                      .filter(item => contentType === 'movies' ? !item.isSeries : item.isSeries)
                      .map((item, index) => (
                        <MovieCard 
                          key={item.id || index}
                          movie={item} 
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
                paginatedContent.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {paginatedContent.map((movie, index) => (
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

      {/* Replace the MovieDetails component with the dynamic renderer */}
      {selectedMovie && renderDetailComponent()}

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