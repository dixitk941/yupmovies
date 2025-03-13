import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMovieById } from '../data/mockData';
import { Download, ArrowLeft } from 'lucide-react';

function DownloadPage() {
  const { id, quality } = useParams();
  const movie = getMovieById(id);

  if (!movie) return null;

  const getDownloadLink = () => {
    // This would be your actual download link
    return `https://example.com/download/${id}/${quality}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="mr-2" size={20} />
          Back to Home
        </Link>

        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">{movie.title}</h1>
          <p className="text-xl text-gray-300 mb-8">{quality}p Quality Download</p>

          <div className="bg-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Download Ready</h2>
            <p className="text-gray-300 mb-6">
              Your download link has been generated. Click the button below to start downloading.
            </p>
            
            <a
              href={getDownloadLink()}
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={20} />
              Start Download
            </a>
          </div>

          <div className="text-left">
            <h3 className="text-lg font-semibold mb-3">Download Information:</h3>
            <ul className="space-y-2 text-gray-300">
              <li>File Name: {movie.title.toLowerCase().replace(/\s+/g, '_')}_{quality}p.mkv</li>
              <li>Size: {quality === '2160' ? '8.5 GB' : quality === '1080' ? '2.1 GB' : quality === '720' ? '1.2 GB' : '800 MB'}</li>
              <li>Format: MKV</li>
              <li>Quality: {quality}p</li>
              <li>Audio: 5.1 Channel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DownloadPage;