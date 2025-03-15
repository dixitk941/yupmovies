import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// import { getMovieById } from '../data/mockData';

function VerifyDownload() {
  const { id, quality } = useParams();
  const movie = getMovieById(id);
  const [verifyTimer, setVerifyTimer] = useState(10);
  const [showContinue, setShowContinue] = useState(false);
  const [continueTimer, setContinueTimer] = useState(5);

  useEffect(() => {
    if (verifyTimer > 0) {
      const timer = setInterval(() => {
        setVerifyTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setShowContinue(true);
    }
  }, [verifyTimer]);

  useEffect(() => {
    if (showContinue && continueTimer > 0) {
      const timer = setInterval(() => {
        setContinueTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (showContinue && continueTimer === 0) {
      // Redirect to the download domain
      window.location.href = `http://download.moviedownload.local:3000/${id}/${quality}`;
    }
  }, [showContinue, continueTimer, id, quality]);

  if (!movie) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{movie.title} - {quality}p Download</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Important Information</h2>
          <p className="text-gray-300 mb-4">
            Before downloading {movie.title}, please read the following guidelines:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
            <li>This content is for personal use only</li>
            <li>Do not distribute or share the download links</li>
            <li>Ensure you have stable internet connection</li>
            <li>Download size may vary based on selected quality</li>
          </ul>

          {!showContinue ? (
            <button 
              className={`w-full py-3 rounded-lg font-semibold ${verifyTimer > 0 ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={verifyTimer > 0}
            >
              {verifyTimer > 0 ? `Verify (${verifyTimer}s)` : 'Verified'}
            </button>
          ) : (
            <button 
              className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold"
              disabled={continueTimer > 0}
            >
              {continueTimer > 0 ? `Continue (${continueTimer}s)` : 'Continuing...'}
            </button>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Download Information</h2>
          <div className="grid grid-cols-2 gap-4 text-gray-300">
            <div>
              <p className="font-medium">Quality</p>
              <p>{quality}p</p>
            </div>
            <div>
              <p className="font-medium">File Size</p>
              <p>{quality === '2160' ? '8.5 GB' : quality === '1080' ? '2.1 GB' : quality === '720' ? '1.2 GB' : '800 MB'}</p>
            </div>
            <div>
              <p className="font-medium">Format</p>
              <p>MKV</p>
            </div>
            <div>
              <p className="font-medium">Audio</p>
              <p>5.1 Channel</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyDownload;