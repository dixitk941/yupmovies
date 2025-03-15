import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Add this import
import MovieCard from './MovieCard';
import MovieDetails from './MovieDetails';

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
            <ChevronRight size={30} /> {/* This was the missing component */}
          </button>
        )}
      </div>
      {selectedMovie && (
        <MovieDetails movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
};

export default MovieSection;