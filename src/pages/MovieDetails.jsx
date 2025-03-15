import React, { useState } from 'react';
import { X, Download, Plus, ThumbsUp } from 'lucide-react';

const MovieDetails = ({ movie, onClose }) => {
  const [showQualityOptions, setShowQualityOptions] = useState(false);

  // Extract year from title if available
  const yearMatch = movie.title.match(/\((\d{4})\)/);
  const year = yearMatch ? yearMatch[1] : '';

  const handleDownload = (size) => {
    // Check if movie has final_links
    if (!movie || !movie.final_links || !Array.isArray(movie.final_links)) {
      console.error("No download links available for this movie");
      alert("No download links available for this movie");
      return;
    }

    // Find a link that matches the selected size
    const link = movie.final_links.find(link => {
      const linkSize = link.size || "";
      return linkSize.toLowerCase() === size.toLowerCase();
    });

    if (link) {
      // Create a sanitized movie name for the URL
      const movieName = movie.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
      
      // Build the redirect URL with parameters
      const redirectUrl = `https://my-blog-five-amber-64.vercel.app/redirect?` +
        `title=${encodeURIComponent(movie.title)}` +
        `&quality=${encodeURIComponent(size)}` +
        `&id=${encodeURIComponent(movie.id || movieName)}`;
      
      // Open the redirect URL in a new tab
      window.open(redirectUrl, '_blank');
    } else {
      console.error(`No download link found for size ${size}`);
      alert(`No download link found for size ${size}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
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
            src={movie.featured_image} 
            alt={movie.title} 
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#181818]">
            <h2 className="text-4xl font-bold mb-4">{movie.title}</h2>
            <div className="flex gap-4 mb-6">
              {movie.final_links && movie.final_links.length > 0 && (
                <div className="relative">
                  <button 
                    className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded"
                    onClick={() => setShowQualityOptions(!showQualityOptions)}
                  >
                    <Download size={20} />
                    Download
                  </button>
                  {showQualityOptions && (
                    <div className="absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-32 z-10">
                      {movie.final_links.map((link, index) => (
                        <button
                          key={index}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-white"
                          onClick={() => handleDownload(link.size)}
                        >
                          {link.size || `Option ${index + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
            {year && <span>{year}</span>}
            <span className="border border-gray-500 px-1">HD</span>
          </div>

          <p className="text-gray-300 mb-6">{movie.description || "No description available."}</p>

          <div className="grid grid-cols-3 gap-8">
            <div>
              <span className="text-gray-400">Cast:</span>
              <p>{movie.cast ? movie.cast.join(', ') : 'No cast information available'}</p>
            </div>
            <div>
              <span className="text-gray-400">Genres:</span>
              <p>{movie.category ? movie.category.join(', ') : 'No genre information available'}</p>
            </div>
            <div>
              <span className="text-gray-400">Available in:</span>
              <p>{movie.language ? movie.language.join(', ') : 'No language information available'}</p>
            </div>
          </div>
          
          {movie.movie_screenshots && movie.movie_screenshots.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Screenshots</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {movie.movie_screenshots.slice(0, 3).map((screenshot, index) => (
                  <img 
                    key={index}
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;