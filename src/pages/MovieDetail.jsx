// Updated MovieDetail component with eye-comfortable colors
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Download, Share2, MessageCircle } from 'lucide-react';
import { getMovieById } from '../data/mockData';

function MovieDetail() {
  const { id } = useParams();
  const movie = getMovieById(id);
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsQualityMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!movie) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-cyan-400 mb-4">Movie not found</h1>
        <Link to="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
          Return to Home
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <img 
          src={movie.image} 
          alt={movie.title} 
          className="w-full h-[60vh] object-cover filter blur-2xl brightness-50 absolute inset-0"
        />
        <img 
          src={movie.image} 
          alt={movie.title} 
          className="w-full h-[60vh] object-cover absolute inset-0 mix-blend-multiply opacity-30"
        />
        
        <div className="relative container mx-auto px-4">
          <div className="flex items-center justify-between pt-8 pb-12">
            <Link to="/" className="flex items-center text-white hover:text-cyan-400 transition-colors">
              <ArrowLeft className="mr-2 w-6 h-6" />
              Back
            </Link>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-all">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-all">
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-gradient-to-b from-transparent to-black/70 p-8 rounded-2xl backdrop-blur-lg">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-64 h-96 flex-none">
              <img 
                src={movie.image} 
                alt={movie.title} 
                className="w-full h-full object-cover rounded-2xl shadow-xl hover:shadow-2xl transition-shadow group"
              />
              <div className="absolute -bottom-6 left-0 w-full h-12 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            
            <div className="flex-1">
              <div className="mb-6">
                <h1 className="text-4xl font-bold mb-2 text-cyan-400">{movie.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Star className="text-yellow-400 w-5 h-5" />
                  <span>{movie.rating}</span>
                  <span>|</span>
                  <span>{movie.releaseYear}</span>
                  <span>|</span>
                  <span>{movie.duration}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {movie.genre.map((g, index) => (
                  <span 
                    key={index} 
                    className="px-4 py-1.5 bg-cyan-600 rounded-full text-xs font-semibold hover:bg-cyan-700 transition-colors"
                  >
                    {g}
                  </span>
                ))}
                <span className="px-4 py-1.5 bg-purple-600 rounded-full text-xs font-semibold">
                  {movie.platform}
                </span>
              </div>

              <p className="text-gray-200 mb-8 leading-relaxed">
                {movie.description}
              </p>

              <div className="flex items-center gap-8 mb-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-gray-400 text-sm">Director</h3>
                  <p className="text-white">{movie.director}</p>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-gray-400 text-sm">Languages</h3>
                  <p className="text-white">{movie.language.join(', ')}</p>
                </div>
              </div>

              <div className="flex gap-4" ref={dropdownRef}>
                <div className="relative flex-1">
                  <button
                    onClick={() => setIsQualityMenuOpen(!isQualityMenuOpen)}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-4 rounded-2xl font-semibold flex items-center gap-3 justify-center transition-colors"
                  >
                    <Download className="w-6 h-6" />
                    Download
                    {isQualityMenuOpen && (
                      <svg className="w-3 h-3 rotate-180 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    )}
                    {!isQualityMenuOpen && (
                      <svg className="w-3 h-3 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    )}
                  </button>
                  {isQualityMenuOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-cyan-800 rounded-2xl shadow-xl py-3">
                      {movie.quality.map((quality) => (
                        <div
                          key={quality}
                          onClick={() => {
                            alert(`Downloading ${quality} quality`);
                            setIsQualityMenuOpen(false);
                          }}
                          className="px-6 py-3 hover:bg-cyan-700 cursor-pointer rounded-xl transition-colors"
                        >
                          <span className="text-sm">{quality}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieDetail;