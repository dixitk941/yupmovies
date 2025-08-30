import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Film, Tv, Play, Star } from 'lucide-react';
import { platforms } from '../data/mockData';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';
import SeriesDetail from './SeriesDetail';

// Updated imports - including anime service
import { getAllMovies } from '../services/movieService';
import { getAllSeries } from '../services/seriesService';
import { getAllAnime } from '../services/animeService';

function Home() {
  const [contentType, setContentType] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Separate loading states for each content type
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [allAnime, setAllAnime] = useState([]);
  
  // Individual loading states
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [animeLoading, setAnimeLoading] = useState(false);
  
  // Track which data has been fetched
  const [moviesLoaded, setMoviesLoaded] = useState(false);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [animeLoaded, setAnimeLoaded] = useState(false);
  
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);

  const MOVIES_PER_PAGE = 20;

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

  // Fetch movies on initial load (default tab)
  useEffect(() => {
    if (!moviesLoaded) {
      fetchMovies();
    }
  }, [moviesLoaded]);

  // Fetch data when switching content type
  useEffect(() => {
    setCurrentPage(1); // Reset pagination when switching types
    
    switch (contentType) {
      case 'movies':
        if (!moviesLoaded) {
          fetchMovies();
        }
        break;
      case 'series':
        if (!seriesLoaded) {
          fetchSeries();
        }
        break;
      case 'anime':
        if (!animeLoaded) {
          fetchAnime();
        }
        break;
    }
  }, [contentType, moviesLoaded, seriesLoaded, animeLoaded]);

  // Optimized fetch functions
  const fetchMovies = async () => {
    if (moviesLoaded) return;
    
    setMoviesLoading(true);
    console.log('🎬 Fetching movies...');
    
    try {
      const movies = await getAllMovies();
      console.log('✅ Movies loaded:', movies.length);
      setAllMovies(movies);
      setMoviesLoaded(true);
    } catch (error) {
      console.error('❌ Error loading movies:', error);
    } finally {
      setMoviesLoading(false);
    }
  };

  const fetchSeries = async () => {
    if (seriesLoaded) return;
    
    setSeriesLoading(true);
    console.log('📺 Fetching series...');
    
    try {
      const series = await getAllSeries();
      console.log('✅ Series loaded:', series.length);
      setAllSeries(series);
      setSeriesLoaded(true);
    } catch (error) {
      console.error('❌ Error loading series:', error);
    } finally {
      setSeriesLoading(false);
    }
  };

  const fetchAnime = async () => {
    if (animeLoaded) return;
    
    setAnimeLoading(true);
    console.log('🌟 Fetching anime...');
    
    try {
      const anime = await getAllAnime();
      console.log('✅ Anime loaded:', anime.length);
      setAllAnime(anime);
      setAnimeLoaded(true);
    } catch (error) {
      console.error('❌ Error loading anime:', error);
    } finally {
      setAnimeLoading(false);
    }
  };

  // Enhanced content detection function to include anime
  const isSeriesContent = (content) => {
    if (!content) return false;
    
    // Check explicit series or anime flag
    if (content.isSeries === true || content.isAnime === true) return true;
    
    // Check for seasons object
    if (content.seasons && Object.keys(content.seasons).length > 0) return true;
    
    // Check for old season format (Season 1, Season 2, etc.)
    const hasSeasonKeys = Object.keys(content).some(key => 
      key.startsWith('Season ') || key.startsWith('season_')
    );
    if (hasSeasonKeys) return true;
    
    // Check categories for series/anime indicator
    if (content.categories && Array.isArray(content.categories)) {
      const hasSeriesCategory = content.categories.some(cat => 
        cat.toLowerCase().includes('series') || 
        cat.toLowerCase().includes('show') ||
        cat.toLowerCase().includes('anime')
      );
      if (hasSeriesCategory) return true;
    }
    
    return false;
  };

  // Debug wrapper for content selection
  const handleContentSelect = (content) => {
    console.log('🎬 Content selected:', content.title, 
      content.isSeries ? 'Series' : content.isAnime ? 'Anime' : 'Movie');
    console.log('🎬 Content data:', content);
    console.log('🎬 Is series/anime check result:', isSeriesContent(content));
    setSelectedMovie(content);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Optimized content type switcher
  const handleContentTypeChange = (newType) => {
    if (newType === contentType) return; // No change needed
    
    console.log(`🔄 Switching from ${contentType} to ${newType}`);
    setContentType(newType);
    setSearchQuery(''); // Clear search when switching types
  };

  // Get current content and loading state
  const getCurrentContentAndState = () => {
    switch (contentType) {
      case 'movies':
        return { content: allMovies, loading: moviesLoading, loaded: moviesLoaded };
      case 'series':
        return { content: allSeries, loading: seriesLoading, loaded: seriesLoaded };
      case 'anime':
        return { content: allAnime, loading: animeLoading, loaded: animeLoaded };
      default:
        return { content: allMovies, loading: moviesLoading, loaded: moviesLoaded };
    }
  };

  // Group content by platforms/categories - UPDATED for all content types
  const getGroupedContent = () => {
    const { content: currentContent } = getCurrentContentAndState();
    
    if (searchQuery.trim()) {
      const filtered = currentContent.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return [{ title: 'Search Results', items: filtered }];
    }

    const sections = [];

    // Trending section
    const trending = currentContent
      .filter(item => {
        const rating = item.content?.rating || item.rating;
        return rating && parseFloat(rating) > 7;
      })
      .slice(0, 15);
    if (trending.length > 0) {
      sections.push({ title: 'Trending', items: trending, showNumbers: true });
    }

    // Recently Added
    const recentlyAdded = [...currentContent]
      .sort((a, b) => new Date(b.modifiedDate || b.date || 0) - new Date(a.modifiedDate || a.date || 0))
      .slice(0, 15);
    if (recentlyAdded.length > 0) {
      sections.push({ title: 'Recently Added', items: recentlyAdded });
    }

    // Content-specific sections
    if (contentType === 'anime') {
      // Anime-specific categories
      const animeGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Thriller'];
      animeGenres.forEach(genre => {
        const genreContent = currentContent.filter(item => {
          if (item.genres && Array.isArray(item.genres)) {
            return item.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()));
          }
          if (item.categories && Array.isArray(item.categories)) {
            return item.categories.some(cat => 
              cat.toLowerCase().includes(genre.toLowerCase())
            );
          }
          return false;
        }).slice(0, 15);
        
        if (genreContent.length > 0) {
          sections.push({
            title: `${genre} Anime`,
            items: genreContent
          });
        }
      });
    } else {
      // Platform-specific sections for movies and series
      platformList.forEach(platform => {
        const platformContent = currentContent.filter(item => {
          if (item.categories && Array.isArray(item.categories)) {
            return item.categories.some(cat => 
              cat.toLowerCase().includes(platform.name.toLowerCase())
            );
          }
          return item.category && 
                 item.category.toLowerCase().includes(platform.name.toLowerCase());
        }).slice(0, 15);
        
        if (platformContent.length > 0) {
          sections.push({
            title: platform.name,
            items: platformContent
          });
        }
      });
    }

    return sections;
  };

  // Optimized skeleton component
  const MovieSkeleton = () => (
    <div 
      className="animate-pulse bg-gray-800 rounded-lg overflow-hidden flex-shrink-0"
      style={{ width: '112px', aspectRatio: '2/3' }}
    >
      <div className="w-full h-full bg-gray-700"></div>
    </div>
  );

  // Loading state for tab switching
  const TabLoadingState = () => (
    <div className="space-y-8 px-4 md:px-8">
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading {contentType}...</p>
        </div>
      </div>
    </div>
  );

  const ScrollableRow = ({ title, items, showNumbers = false }) => {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
      if (scrollRef.current) {
        const scrollAmount = 320;
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    return (
      <div className="mb-8 group">
        <div className="flex items-center justify-between mb-4 px-4 md:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {title}
          </h2>
          <div className="hidden md:flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={16} className="text-white" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={16} className="text-white" />
            </button>
          </div>
        </div>
        
        <div
          ref={scrollRef}
          className="flex space-x-2 md:space-x-4 overflow-x-auto scrollbar-hide pb-4 px-4 md:px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((content, idx) => (
            <div key={content.id || idx} className="flex-shrink-0">
              <MovieCard
                movie={content}
                onClick={handleContentSelect}
                index={idx}
                showNumber={showNumbers}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Updated All Content Section to handle loading states
  const AllContentSection = () => {
    const { content: currentContent, loading } = getCurrentContentAndState();
    
    if (loading) return <TabLoadingState />;
    if (currentContent.length === 0) return null;

    const totalPages = Math.ceil(currentContent.length / MOVIES_PER_PAGE);
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    const endIndex = startIndex + MOVIES_PER_PAGE;
    const paginatedContent = currentContent.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Get section title based on content type
    const getSectionTitle = () => {
      switch (contentType) {
        case 'movies':
          return 'All Movies';
        case 'series':
          return 'All TV Shows';
        case 'anime':
          return 'All Anime';
        default:
          return 'All Content';
      }
    };

    return (
      <div className="mb-8 px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
          {getSectionTitle()}
        </h2>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 md:gap-4 mb-6">
          {paginatedContent.map((content, idx) => (
            <MovieCard
              key={content.id || idx}
              movie={content}
              onClick={handleContentSelect}
              index={startIndex + idx}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 md:gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className={`px-3 py-2 rounded-full text-sm md:text-base ${
                currentPage === 1 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-600 to-purple-600 text-white hover:from-red-500 hover:to-purple-500'
              }`}
            >
              <ChevronLeft className="inline mr-1" size={18} />
              Previous
            </button>
            
            <div className="flex items-center justify-center bg-[#1e1e1e] rounded-full px-4 py-2 min-w-[100px]">
              <span className="text-sm md:text-base font-medium text-white">
                {currentPage} of {totalPages}
              </span>
            </div>
            
            <button
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className={`px-3 py-2 rounded-full text-sm md:text-base ${
                currentPage === totalPages 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-600 to-purple-600 text-white hover:from-red-500 hover:to-purple-500'
              }`}
            >
              Next
              <ChevronRight className="inline ml-1" size={18} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Enhanced render detail component to handle anime as series
  const renderDetailComponent = () => {
    console.log('🎬 renderDetailComponent called, selectedMovie:', selectedMovie);
    
    if (!selectedMovie) {
      console.log('❌ No selected content, returning null');
      return null;
    }
    
    const isSeries = isSeriesContent(selectedMovie);
    console.log('🎯 Enhanced series/anime check result:', isSeries);

    // Add error boundary fallback
    try {
      if (isSeries) {
        console.log('📺 Rendering SeriesDetail component (for series or anime)');
        return <SeriesDetail series={selectedMovie} onClose={() => setSelectedMovie(null)} />;
      } else {
        console.log('🎬 Rendering MovieDetails component');
        
        if (!MovieDetails) {
          console.error('❌ MovieDetails component not found or not imported properly');
          return (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="bg-white text-black p-8 rounded">
                <h2>Movie Details</h2>
                <p>Movie: {selectedMovie.title}</p>
                <p>Error: MovieDetails component not available</p>
                <button 
                  onClick={() => setSelectedMovie(null)}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                >
                  Close
                </button>
              </div>
            </div>
          );
        }
        
        return <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />;
      }
    } catch (error) {
      console.error('💥 Error rendering detail component:', error);
      return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white text-black p-8 rounded">
            <h2>Error</h2>
            <p>Failed to render detail view for: {selectedMovie.title}</p>
            <p>Error: {error.message}</p>
            <button 
              onClick={() => setSelectedMovie(null)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
  };

  // Updated Bottom navigation bar with loading indicators
  const BottomBar = () => (
    <nav className="fixed z-50 bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-gray-800 flex md:hidden items-center justify-around h-16">
      <button
        className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none transition-colors ${
          contentType === 'movies' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={() => handleContentTypeChange('movies')}
      >
        <div className="relative">
          <Film size={20} />
          {moviesLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        <span className="text-xs mt-1">Movies</span>
      </button>
      <button
        className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none transition-colors ${
          contentType === 'series' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={() => handleContentTypeChange('series')}
      >
        <div className="relative">
          <Tv size={20} />
          {seriesLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        <span className="text-xs mt-1">Series</span>
      </button>
      <button
        className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none transition-colors ${
          contentType === 'anime' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={() => handleContentTypeChange('anime')}
      >
        <div className="relative">
          <Star size={20} />
          {animeLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        <span className="text-xs mt-1">Anime</span>
      </button>
    </nav>
  );

  const { content: currentContent, loading: isCurrentLoading } = getCurrentContentAndState();
  const groupedContent = getGroupedContent();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* NETFLIX-STYLE HEADER - Updated with loading indicators */}
      <header 
        ref={headerRef} 
        className="fixed top-0 w-full bg-black bg-opacity-0 z-50 transition-all duration-300 transform"
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <div className="flex items-center space-x-8">
            <div className="text-red-600 text-2xl font-bold">
              StreamFlix
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <button
                className={`text-sm font-medium transition-colors relative ${
                  contentType === 'movies' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleContentTypeChange('movies')}
              >
                Movies
                {moviesLoading && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
              <button
                className={`text-sm font-medium transition-colors relative ${
                  contentType === 'series' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleContentTypeChange('series')}
              >
                TV Shows
                {seriesLoading && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
              <button
                className={`text-sm font-medium transition-colors relative ${
                  contentType === 'anime' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleContentTypeChange('anime')}
              >
                Anime
                {animeLoading && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
              <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                My List
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder={`Search ${contentType}...`}
                className="w-48 md:w-64 bg-black/50 border border-gray-700 rounded px-10 py-2 text-sm focus:outline-none focus:border-white transition-colors"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="pt-20 pb-20">
        {/* HERO SECTION */}
        {!searchQuery && !isCurrentLoading && groupedContent[0]?.items[0] && (
          <div className="relative h-[40vh] md:h-[50vh] mb-8 overflow-hidden">
            {groupedContent[0].items[0].featuredImage || groupedContent[0].items[0].featured_image || groupedContent[0].items[0].poster || groupedContent[0].items[0].image ? (
              <img
                src={groupedContent[0].items[0].featuredImage || groupedContent[0].items[0].featured_image || groupedContent[0].items[0].poster || groupedContent[0].items[0].image}
                alt={groupedContent[0].items[0].title}
                width={1920}
                height={1080}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-700 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">
                    {contentType === 'anime' ? '🌟' : '🎬'}
                  </div>
                  <h2 className="text-2xl font-bold">Featured Content</h2>
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-2xl">
              <h1 className="text-2xl md:text-4xl font-bold mb-4 text-white">
                {groupedContent[0].items[0].title?.replace(/\(\d{4}\)/, '').trim()}
              </h1>
              <p className="text-md md:text-lg text-gray-300 mb-6 line-clamp-3">
                {groupedContent[0].items[0].content?.description || groupedContent[0].items[0].excerpt || "Discover amazing content and enjoy unlimited streaming."}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleContentSelect(groupedContent[0].items[0])}
                  className="flex items-center space-x-2 bg-white text-black px-6 py-3 rounded hover:bg-gray-200 transition-colors"
                >
                  <Play size={20} fill="currentColor" />
                  <span className="font-medium">Play</span>
                </button>
                <button
                  onClick={() => handleContentSelect(groupedContent[0].items[0])}
                  className="flex items-center space-x-2 bg-gray-600/70 text-white px-6 py-3 rounded hover:bg-gray-600 transition-colors"
                >
                  <span className="font-medium">More Info</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT SECTIONS */}
        <div>
          {isCurrentLoading ? (
            <TabLoadingState />
          ) : (
            <>
              {groupedContent.length > 0 && groupedContent.map((section, index) => (
                <ScrollableRow
                  key={index}
                  title={section.title}
                  items={section.items}
                  showNumbers={section.showNumbers}
                />
              ))}

              {!searchQuery && <AllContentSection />}

              {groupedContent.length === 0 && currentContent.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-6xl mb-4">😕</div>
                  <p className="text-gray-400 text-center mb-2">No content found</p>
                  <p className="text-gray-500 text-sm text-center max-w-md">
                    We couldn't find any {contentType} that matches your search.
                  </p>
                  {searchQuery && (
                    <button
                      className="mt-4 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selectedMovie && renderDetailComponent()}
      <BottomBar />

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default Home;
