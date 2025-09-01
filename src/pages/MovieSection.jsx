import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';

const MovieSection = ({ title, movies, showNumbers }) => {
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    showLeftButton: false,
    showRightButton: true
  });
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Ensure title is a valid string
  const sectionId = typeof title === 'string' 
    ? `section-${title.replace(/\s+/g, '-').toLowerCase()}`
    : `section-${Math.random().toString(36).substr(2, 9)}`;

  // Optimized scroll handler with debounce
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    setScrollState({
      showLeftButton: scrollLeft > 10,
      showRightButton: scrollLeft < maxScroll - 10
    });
  }, []);

  // Memoized scroll function
  const scroll = useCallback((direction) => {
    const container = scrollRef.current;
    if (!container) return;
    
    // Calculate optimal scroll amount based on screen size
    const cardWidth = 240; // width of cards
    const gap = 16; // gap between cards 
    
    // Determine number of cards to scroll based on screen size
    const containerWidth = container.clientWidth;
    const cardsToScroll = Math.max(1, Math.floor(containerWidth / (cardWidth + gap)));
    
    // Scroll by the width of the visible cards
    const scrollAmount = direction === 'left' 
      ? -((cardWidth + gap) * cardsToScroll) 
      : (cardWidth + gap) * cardsToScroll;
      
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  // Initialize intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    if (scrollRef.current) {
      observer.observe(scrollRef.current);
    }
    
    return () => {
      if (scrollRef.current) {
        observer.unobserve(scrollRef.current);
      }
    };
  }, []);

  // Load resources when section comes into view
  useEffect(() => {
    if (isIntersecting) {
      // Check initial scroll position
      handleScroll();
      
      // Add event listener
      const currentRef = scrollRef.current;
      if (currentRef) {
        currentRef.addEventListener('scroll', handleScroll);
      }
      
      return () => {
        if (currentRef) {
          currentRef.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [isIntersecting, handleScroll]);

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      scroll('left');
    } else if (e.key === 'ArrowRight') {
      scroll('right');
    }
  }, [scroll]);

  return (
    <section className="movie-section mb-12 relative" aria-labelledby={sectionId}>
      <h2 
        id={sectionId} 
        className="text-2xl font-bold mb-6 flex items-center"
      >
        <span className="w-1 h-6 bg-gradient-to-b from-red-500 to-purple-600 mr-3 rounded-full hidden sm:block"></span>
        {title || 'Movies'}
      </h2>
      
      <div className="relative group">
        {scrollState.showLeftButton && (
          <button 
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white rounded-full p-2 shadow-lg transform transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 -ml-4 lg:opacity-0 lg:group-hover:opacity-100"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            onKeyDown={handleKeyDown}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pl-2 pr-4 py-2"
          onScroll={handleScroll}
          tabIndex="0"
          role="region"
          aria-label={`${title || 'Movies'} carousel`}
        >
          {Array.isArray(movies) && movies.length > 0 ? (
            movies.map((movie, index) => (
              <div 
                key={movie?.id || index} 
                className="flex-none w-[240px] transition-transform duration-300 hover:scale-[1.02] focus-within:scale-[1.02]"
              >
                <MovieCard 
                  movie={movie} 
                  onClick={setSelectedMovie} 
                  index={index}
                  showNumber={showNumbers}
                  useOptimizedImage={true}
                />
              </div>
            ))
          ) : (
            <div className="flex-1 py-8 text-center text-gray-400">
              No movies available in this section
            </div>
          )}
        </div>
        
        {scrollState.showRightButton && (
          <button 
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white rounded-full p-2 shadow-lg transform transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 -mr-4 lg:opacity-0 lg:group-hover:opacity-100"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            onKeyDown={handleKeyDown}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
      
      {selectedMovie && (
        <MovieDetails 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
        />
      )}
    </section>
  );
};

export default React.memo(MovieSection);