import React, { useState } from 'react';
import { Search, Star, StarHalf, Clock, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';

interface Movie {
  id: number;
  title: string;
  rating: number;
  releaseYear: number;
  image: string;
  genre: string[];
}

const movies: Movie[] = [
  {
    id: 1,
    title: "Dune: Part Two",
    rating: 4.5,
    releaseYear: 2024,
    image: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?auto=format&fit=crop&q=80&w=500",
    genre: ["Sci-Fi", "Adventure"]
  },
  {
    id: 2,
    title: "Poor Things",
    rating: 4.2,
    releaseYear: 2024,
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=500",
    genre: ["Drama", "Romance"]
  },
  {
    id: 3,
    title: "Civil War",
    rating: 4.0,
    releaseYear: 2024,
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=500",
    genre: ["Action", "Drama"]
  }
];

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">MovieReviews</h1>
            <div className="relative flex-1 max-w-xl mx-8">
              <input
                type="text"
                placeholder="Search movies..."
                className="w-full bg-gray-700 rounded-full px-6 py-2 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-2.5 text-gray-400" size={20} />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-full font-medium transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Featured Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {movies.map(movie => (
              <div key={movie.id} className="bg-gray-800 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-transform duration-300">
                <img src={movie.image} alt={movie.title} className="w-full h-64 object-cover" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold">{movie.title}</h3>
                    <div className="flex items-center">
                      <Star className="text-yellow-400 fill-current" size={18} />
                      <span className="ml-1">{movie.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm mb-4">
                    <Clock size={16} className="mr-2" />
                    <span>{movie.releaseYear}</span>
                    <div className="mx-2">•</div>
                    <div className="flex gap-2">
                      {movie.genre.map((g, index) => (
                        <span key={index} className="bg-gray-700 px-2 py-1 rounded-full text-xs">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <button className="flex items-center hover:text-blue-400">
                      <ThumbsUp size={18} className="mr-1" />
                      <span>2.1k</span>
                    </button>
                    <button className="flex items-center hover:text-blue-400">
                      <MessageCircle size={18} className="mr-1" />
                      <span>128</span>
                    </button>
                    <button className="flex items-center hover:text-blue-400">
                      <Share2 size={18} className="mr-1" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Latest Reviews Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Latest Reviews</h2>
            <button className="text-blue-400 hover:text-blue-300">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {movies.map(movie => (
              <div key={movie.id} className="flex bg-gray-800 rounded-lg overflow-hidden">
                <img src={movie.image} alt={movie.title} className="w-32 h-32 object-cover" />
                <div className="p-4 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{movie.title}</h3>
                    <div className="flex items-center">
                      <StarHalf className="text-yellow-400" size={16} />
                      <span className="ml-1 text-sm">{movie.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    A compelling narrative that keeps you engaged throughout...
                  </p>
                  <div className="flex items-center text-sm text-gray-400">
                    <span>By John Doe</span>
                    <div className="mx-2">•</div>
                    <span>2 hours ago</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;