import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Calendar, Star, Globe, Tv, Play, Download, 
  Bookmark, ThumbsUp, ChevronDown, Info, Package,
  Archive, Award, Clock, Users, Film
} from 'lucide-react';
import { seriesService } from '../services/seriesService';
import { formatDateString, debugDate } from '../services/utils';
import { LoadingDots } from '../components/Skeleton';

const SeriesDetail = ({ series, isOpen, onClose, isMobile }) => {
  // State management
  const [activeTab, setActiveTab] = useState('episodes');
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [currentSeriesData, setCurrentSeriesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingLinks, setDownloadingLinks] = useState(new Set());
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [expandGenres, setExpandGenres] = useState(false);
  
  // Refs
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  // Extract series data
  const seriesDataExtracted = series || {};
  
  // Process seasons data
  const availableSeasons = React.useMemo(() => {
    if (!seriesDataExtracted.seasons) return [];
    
    return Object.entries(seriesDataExtracted.seasons)
      .filter(([key, value]) => value && value.trim && value.trim() !== '')
      .map(([key, value]) => ({
        key,
        name: key.replace('_', ' ').toUpperCase(),
        episodes: value
      }));
  }, [seriesDataExtracted.seasons]);

  // Get year from series data
  const year = seriesDataExtracted.year || 
               (seriesDataExtracted.publishDate ? new Date(seriesDataExtracted.publishDate).getFullYear() : null);

  // Handle download function
  const handleDownload = async (link, episodeIndex, isPackage = false) => {
    try {
      // Your download logic here
      console.log('Downloading:', link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Get categories function
  const getCategories = () => {
    return seriesDataExtracted.genres || [];
  };

  // Load series data on mount
  useEffect(() => {
    if (isOpen && series) {
      setIsLoading(true);
      // Set initial data
      setCurrentSeriesData(series);
      setIsLoading(false);
      
      // Select first season if available
      if (availableSeasons.length > 0) {
        setSelectedSeason(availableSeasons[0]);
      }
    }
  }, [isOpen, series, availableSeasons]);

  // Close handler
  const handleClose = useCallback(() => {
    onClose();
    setActiveTab('episodes');
    setSelectedSeason(null);
    setCurrentSeriesData(null);
    setIsLoading(true);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !series) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 p-2 bg-black/80 rounded-full text-white hover:bg-black transition-colors"
      >
        <X size={20} />
      </button>

      {/* Modal content */}
      <div className={`relative bg-black overflow-hidden ${
        isMobile 
          ? 'w-full h-full' 
          : 'w-[90vw] h-[85vh] max-w-6xl rounded-lg border border-gray-800'
      }`}>
        
        {/* MOBILE LAYOUT */}
        {isMobile && (
          <>
            {/* Hero section - Mobile */}
            <div className="relative h-[30vh] overflow-hidden">
              {/* Background image */}
              <div className="absolute inset-0 bg-gray-900 animate-pulse"></div>
              
              <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
                <img 
                  src={seriesDataExtracted.image} 
                  alt={seriesDataExtracted.title} 
                  className="w-full h-full object-cover transition-opacity duration-700 opacity-0"
                  onLoad={(e) => {
                    e.target.classList.add('opacity-100');
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x600/1a1a1a/666?text=No+Image';
                  }}
                />
              </div>

              {/* Overlay gradients */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40"></div>
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
              
              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex flex-col gap-2">
                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium backdrop-blur-sm">
                      <Tv size={12} className="mr-1" /> Series
                    </div>
                    
                    {seriesDataExtracted.rating && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                        <Star size={12} className="mr-1 fill-yellow-400" /> {seriesDataExtracted.rating}
                      </div>
                    )}
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-xl font-bold text-white drop-shadow-lg line-clamp-2">
                    {seriesDataExtracted.title}
                  </h2>
                  
                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-300">
                    {year && (
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {year}
                      </span>
                    )}
                    {availableSeasons.length > 0 && (
                      <span className="flex items-center">
                        <Tv size={14} className="mr-1 text-gray-400" />
                        {availableSeasons.length} Seasons
                      </span>
                    )}
                    {seriesDataExtracted.languages && seriesDataExtracted.languages.length > 0 && (
                      <span className="flex items-center">
                        <Globe size={14} className="mr-1 text-gray-400" />
                        {seriesDataExtracted.languages[0]}
                      </span>
                    )}
                  </div>
                  
                  {/* Added date */}
                  {(seriesDataExtracted.modifiedDate || seriesDataExtracted.publishDate) && (
                    <span className="flex items-center bg-red-600 text-white px-2 py-0.5 rounded text-xs shadow-sm self-start">
                      <Calendar size={10} className="mr-1" />
                      Added: {formatDateString(seriesDataExtracted.modifiedDate || seriesDataExtracted.publishDate)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <button 
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`relative flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                    isBookmarked ? 'bg-red-600' : 'bg-black/70 border border-gray-700'
                  }`}
                >
                  <Bookmark size={16} className={`${isBookmarked ? 'text-white fill-white' : 'text-white'}`} />
                </button>
                
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`relative flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                    isLiked ? 'bg-red-600' : 'bg-black/70 border border-gray-700'
                  }`}
                >
                  <ThumbsUp size={16} className={`${isLiked ? 'text-white fill-white' : 'text-white'}`} />
                </button>
              </div>
            </div>

            {/* Navigation tabs - Mobile */}
            <div className="flex items-center justify-around bg-black border-b border-gray-800 sticky top-0 z-20">
              <button 
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'episodes' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('episodes')}
              >
                <div className="flex flex-col items-center">
                  <Play size={16} className={activeTab === 'episodes' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Episodes</span>
                </div>
                {activeTab === 'episodes' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                )}
              </button>
              
              <button 
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'packages' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('packages')}
              >
                <div className="flex flex-col items-center">
                  <Package size={16} className={activeTab === 'packages' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Packs</span>
                </div>
                {activeTab === 'packages' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                )}
              </button>
              
              <button 
                className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'details' ? 'text-red-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('details')}
              >
                <div className="flex flex-col items-center">
                  <Info size={16} className={activeTab === 'details' ? 'text-red-500' : 'text-gray-400'} />
                  <span className="mt-1">Details</span>
                </div>
                {activeTab === 'details' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                )}
              </button>
            </div>

            {/* Tab content container - Mobile */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto bg-black scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-black"
              style={{WebkitOverflowScrolling: 'touch'}}
            >
              {/* EPISODES TAB */}
              {activeTab === 'episodes' && (
                <div className="p-4 pb-12">
                  {isLoading ? (
                    <div className="text-center py-10">
                      <LoadingDots size="md" color="red" className="justify-center mb-4" />
                      <p className="text-gray-400">Loading episodes...</p>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Play size={32} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400">Episodes coming soon</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* PACKAGES TAB */}
              {activeTab === 'packages' && (
                <div className="p-4 pb-20 space-y-6">
                  <div className="text-center py-10">
                    <Package size={32} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">Season packs coming soon</p>
                  </div>
                </div>
              )}
              
              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div className="p-4 pb-20 space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">
                      Synopsis
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {seriesDataExtracted.description || 'No description available.'}
                    </p>
                  </div>
                  
                  {/* Genres */}
                  {seriesDataExtracted.genres && seriesDataExtracted.genres.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Genres
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {seriesDataExtracted.genres.map((genre, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gray-800 text-white border border-gray-700"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {seriesDataExtracted.languages && seriesDataExtracted.languages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {seriesDataExtracted.languages.map((language, idx) => (
                          <span 
                            key={idx}
                            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gray-800 text-white border border-gray-700"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Series seasons */}
                  {availableSeasons.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Seasons Available
                      </h3>
                      <div className="space-y-3">
                        {availableSeasons.map((season, idx) => (
                          <div 
                            key={idx}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                          >
                            <div className="text-white text-sm font-bold mb-2">
                              {season.name}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {typeof season.episodes === 'string' ? season.episodes : 'Available'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* DESKTOP LAYOUT */}
        {!isMobile && (
          <div className="flex h-full">
            {/* Left side - Image */}
            <div className="w-1/3 h-full relative">
              <div className="absolute inset-0 bg-gray-900 animate-pulse"></div>
              
              <div ref={backdropRef} className="absolute inset-0 overflow-hidden">
                <img 
                  src={seriesDataExtracted.image} 
                  alt={seriesDataExtracted.title} 
                  className="w-full h-full object-cover transition-opacity duration-700 opacity-0"
                  onLoad={(e) => {
                    e.target.classList.add('opacity-100');
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x600/1a1a1a/666?text=No+Image';
                  }}
                />
              </div>

              {/* Overlay gradients */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/70"></div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex flex-col gap-2">
                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium backdrop-blur-sm">
                      <Tv size={12} className="mr-1" /> Series
                    </div>
                    
                    {seriesDataExtracted.rating && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium backdrop-blur-sm">
                        <Star size={12} className="mr-1 fill-yellow-400" /> {seriesDataExtracted.rating}
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-bold text-white drop-shadow-lg">
                    {seriesDataExtracted.title}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-300">
                    {year && (
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {year}
                      </span>
                    )}
                    {availableSeasons.length > 0 && (
                      <span className="flex items-center">
                        <Tv size={14} className="mr-1 text-gray-400" />
                        {availableSeasons.length} Seasons
                      </span>
                    )}
                    {seriesDataExtracted.languages && seriesDataExtracted.languages.length > 0 && (
                      <span className="flex items-center">
                        <Globe size={14} className="mr-1 text-gray-400" />
                        {seriesDataExtracted.languages[0]}
                      </span>
                    )}
                  </div>
                  
                  {(seriesDataExtracted.modifiedDate || seriesDataExtracted.publishDate) && (
                    <span className="flex items-center bg-red-600 text-white px-2 py-0.5 rounded text-xs shadow-sm self-start">
                      <Calendar size={10} className="mr-1" />
                      Added: {formatDateString(seriesDataExtracted.modifiedDate || seriesDataExtracted.publishDate)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="absolute bottom-16 left-4 flex space-x-2">
                <button 
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`relative flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                    isBookmarked ? 'bg-red-600' : 'bg-black/70 border border-gray-700'
                  }`}
                >
                  <Bookmark size={16} className={`${isBookmarked ? 'text-white fill-white' : 'text-white'}`} />
                </button>
                
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`relative flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                    isLiked ? 'bg-red-600' : 'bg-black/70 border border-gray-700'
                  }`}
                >
                  <ThumbsUp size={16} className={`${isLiked ? 'text-white fill-white' : 'text-white'}`} />
                </button>
              </div>
            </div>

            {/* Right side - Content with tabs */}
            <div className="w-2/3 flex flex-col h-full overflow-hidden bg-black">
              {/* Tabs navigation */}
              <div className="flex items-center justify-around border-b border-gray-800 bg-black sticky top-0 z-20">
                <button 
                  className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'episodes' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('episodes')}
                >
                  <div className="flex flex-col items-center">
                    <Play size={16} className={activeTab === 'episodes' ? 'text-red-500' : 'text-gray-400'} />
                    <span className="mt-1">Episodes</span>
                  </div>
                  {activeTab === 'episodes' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                  )}
                </button>
                
                <button 
                  className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'packages' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('packages')}
                >
                  <div className="flex flex-col items-center">
                    <Package size={16} className={activeTab === 'packages' ? 'text-red-500' : 'text-gray-400'} />
                    <span className="mt-1">Packs</span>
                  </div>
                  {activeTab === 'packages' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                  )}
                </button>
                
                <button 
                  className={`flex-1 py-3 text-sm font-medium relative overflow-hidden ${activeTab === 'details' ? 'text-red-500' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('details')}
                >
                  <div className="flex flex-col items-center">
                    <Info size={16} className={activeTab === 'details' ? 'text-red-500' : 'text-gray-400'} />
                    <span className="mt-1">Details</span>
                  </div>
                  {activeTab === 'details' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                  )}
                </button>
              </div>
              
              {/* Content area */}
              <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-black">
                {/* Episodes Tab */}
                {activeTab === 'episodes' && (
                  <div className="p-6 pb-20">
                    {isLoading ? (
                      <div className="text-center py-10">
                        <LoadingDots size="md" color="red" className="justify-center mb-4" />
                        <p className="text-gray-400">Loading episodes...</p>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Play size={32} className="mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-400">Episodes coming soon</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Packages Tab */}
                {activeTab === 'packages' && (
                  <div className="p-6 pb-20">
                    <div className="text-center py-10">
                      <Package size={32} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400">Season packs coming soon</p>
                    </div>
                  </div>
                )}
                
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="p-6 pb-20 space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">Synopsis</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {seriesDataExtracted.description || 'No description available.'}
                      </p>
                    </div>
                    
                    {seriesDataExtracted.genres && seriesDataExtracted.genres.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-3">Genres</h3>
                        <div className="flex flex-wrap gap-2">
                          {seriesDataExtracted.genres.map((genre, idx) => (
                            <span key={idx} className="inline-block text-xs px-3 py-1.5 rounded-full bg-gray-800 text-white border border-gray-700">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {seriesDataExtracted.languages && seriesDataExtracted.languages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-3">Languages</h3>
                        <div className="flex flex-wrap gap-2">
                          {seriesDataExtracted.languages.map((language, idx) => (
                            <span key={idx} className="inline-block text-xs px-3 py-1.5 rounded-full bg-gray-800 text-white border border-gray-700">
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {availableSeasons.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-3">Seasons Available</h3>
                        <div className="space-y-3">
                          {availableSeasons.map((season, idx) => (
                            <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                              <div className="text-white text-sm font-bold mb-2">{season.name}</div>
                              <div className="text-gray-400 text-sm">
                                {typeof season.episodes === 'string' ? season.episodes : 'Available'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesDetail;
