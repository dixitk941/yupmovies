import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Share2, MessageCircle } from 'lucide-react';
import { getMovieById } from '../data/mockData';

function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const movie = getMovieById(id);
  const [showQualityOptions, setShowQualityOptions] = useState(false);

  const qualities = [
    { label: '480p', value: '480' },
    { label: '720p', value: '720' },
    { label: '1080p', value: '1080' },
    { label: '4K', value: '2160' }
  ];

  const handleDownload = (quality) => {
    navigate(`/verify/${id}/${quality}`);
  };

  if (!movie) return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Movie not found</h1>
        <Link to="/" className="text-blue-400 hover:text-blue-300">
          Return to Home
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="relative">
        <img 
          src={movie.image} 
          alt={movie.title} 
          className="w-full h-[60vh] object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
        
        <div className="absolute top-4 left-4">
          <Link to="/" className="flex items-center text-white hover:text-blue-400">
            <ArrowLeft className="mr-2" />
            Back
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative">
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row gap-8">
            <img 
              src={movie.image} 
              alt={movie.title} 
              className="w-full md:w-80 h-96 object-cover rounded-lg shadow-lg"
            />
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold">{movie.title}</h1>
                <div className="flex items-center">
                  <Star className="text-yellow-400 fill-current" size={24} />
                  <span className="ml-2 text-xl">{movie.rating}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                {movie.genre.map((g, index) => (
                  <span key={index} className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                    {g}
                  </span>
                ))}
                <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">
                  {movie.platform}
                </span>
              </div>

              <p className="text-gray-300 mb-6">{movie.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-gray-400 mb-1">Director</h3>
                  <p>{movie.director}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 mb-1">Duration</h3>
                  <p>{movie.duration}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 mb-1">Release Year</h3>
                  <p>{movie.releaseYear}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 mb-1">Languages</h3>
                  <p>{movie.language.join(', ')}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1">
                  <button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
                    onClick={() => setShowQualityOptions(!showQualityOptions)}
                  >
                    Download
                  </button>
                  {showQualityOptions && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                      {qualities.map((quality) => (
                        <button
                          key={quality.value}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => handleDownload(quality.value)}
                        >
                          {quality.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
                  <Share2 size={20} />
                </button>
                <button className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
                  <MessageCircle size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieDetail;