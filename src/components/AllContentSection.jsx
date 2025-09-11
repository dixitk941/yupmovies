// components/AllContentSection.jsx
import React, { memo } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { usePaginatedMovies } from '../hooks/usePaginatedMovies';
import MovieCard from './MovieCard';
import { LoadingDots } from './Skeleton';

const AllContentSection = memo(({ contentType = 'movies', onContentSelect }) => {
  const { 
    movies, 
    loading, 
    initialLoading, 
    error, 
    hasMore, 
    loadMore, 
    totalCount, 
    loadedCount 
  } = usePaginatedMovies();

  // Show initial loading skeleton
  if (initialLoading) {
    return (
      <div className="mb-8 px-4 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-700 rounded w-48 animate-pulse"></div>
          <div className="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2 md:gap-4">
          {Array.from({ length: 24 }).map((_, index) => (
            <div 
              key={index}
              className="aspect-[2/3] bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 px-4 md:px-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-2">Failed to load movies</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
      {/* Header with count */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          {getSectionTitle()}
        </h2>
        <div className="text-sm text-gray-400">
          <span className="text-white font-medium">{loadedCount.toLocaleString()}</span>
          {totalCount > 0 && (
            <>
              <span className="mx-1">of</span>
              <span className="text-gray-300">{totalCount.toLocaleString()}</span>
            </>
          )}
          <span className="ml-1">movies</span>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="mb-6">
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-red-500 to-purple-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((loadedCount / totalCount) * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {Math.round((loadedCount / totalCount) * 100)}% loaded
          </div>
        </div>
      )}
      
      {/* Movie Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2 md:gap-4 mb-8">
        {movies.map((movie, idx) => (
          <MovieCard
            key={movie.id || idx}
            movie={movie}
            onClick={onContentSelect}
            index={idx}
            useOptimizedImage={true}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className={`group flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 ${
              loading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 hover:shadow-lg hover:scale-105'
            }`}
          >
            {loading ? (
              <>
                <LoadingDots size="sm" color="white" />
                <span>Loading Next 100...</span>
              </>
            ) : (
              <>
                <span>Load More Movies</span>
                <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      )}

      {/* End of content */}
      {!hasMore && movies.length > 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-gray-300 text-lg font-medium mb-2">
            You've reached the end!
          </p>
          <p className="text-gray-500">
            All {loadedCount.toLocaleString()} movies have been loaded
          </p>
        </div>
      )}

      {/* No content */}
      {!hasMore && movies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">😕</div>
          <p className="text-gray-400 mb-2">No movies found</p>
          <p className="text-gray-500">Check back later for new content</p>
        </div>
      )}
    </div>
  );
});

AllContentSection.displayName = 'AllContentSection';

export default AllContentSection;
