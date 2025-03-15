import React from 'react';
import { Link } from 'react-router-dom';

const MovieCard = ({ movie, onClick, index, showNumber }) => {
  // Safety check to prevent errors with incomplete data
  if (!movie || !movie.title || !movie.featured_image) {
    return null;
  }

  return (
    <div className="movie-card cursor-pointer relative pl-12" onClick={() => onClick(movie)}>
      {showNumber && (
        <div className="trending-number">
          <span className="number">{index + 1}</span>
        </div>
      )}
      <img 
        src={movie.featured_image} 
        alt={movie.title} 
        className="w-full h-[150px] object-cover rounded-sm"
      />
      <div className="opacity-0 hover:opacity-100 absolute inset-0 left-12 bg-black bg-opacity-75 p-4 transition-opacity rounded-sm">
        <h3 className="text-sm font-semibold mb-1">{movie.title}</h3>
        <div className="flex items-center text-xs mb-2">
          <span className="ml-1">{movie.rating || 'N/A'}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {movie.category && Array.isArray(movie.category) && movie.category.slice(0, 2).map((g, index) => (
            <span key={index} className="text-xs bg-red-600 px-2 py-0.5 rounded">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;