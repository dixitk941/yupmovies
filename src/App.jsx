import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import VerifyDownload from './pages/VerifyDownload';
import DownloadPage from './pages/Download';
import { addListener, launch } from 'devtools-detector';

// Custom 404 Page component
const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white px-4">
      <div className="text-9xl font-bold mb-6 text-red-500">404</div>
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Page Not Found</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        This content is only available when accessed through hiicine.vercel.app
      </p>
      <a 
        href="https://hiicine.vercel.app" 
        className="px-6 py-3 bg-gradient-to-r from-red-600 to-purple-600 rounded-full hover:from-red-500 hover:to-purple-500 transition-all duration-300 font-medium"
      >
        Go to hiicine.vercel.app
      </a>
    </div>
  );
};

function App() {
  const [isValidReferrer, setIsValidReferrer] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  // Check referrer when component mounts
  useEffect(() => {
    // Function to check if the referrer or local storage indicates valid access
    const checkAccess = () => {
      // Get the referrer
      const referrer = document.referrer;
      // Check local storage for valid session
      const hasValidSession = localStorage.getItem('validSession') === 'true';
      
      // Valid referrers (including dev environment)
      const validReferrers = [
        'hiicine.vercel.app',
        'www.hiicine.vercel.app',
        'hiicine-git-main.vercel.app',
        'localhost'  // Allow localhost for development
      ];
      
      // Check if referrer contains any valid domain
      const isValid = validReferrers.some(domain => 
        referrer.includes(domain)
      );
      
      // If valid referrer or already has valid session
      if (isValid || hasValidSession) {
        // Set valid session flag
        localStorage.setItem('validSession', 'true');
        setIsValidReferrer(true);
      } else {
        // Clear any existing session
        localStorage.removeItem('validSession');
        setIsValidReferrer(false);
      }
      
      // Finish checking
      setIsChecking(false);
    };
    
    // Short delay to ensure referrer is available
    setTimeout(checkAccess, 100);
    
    // Add DevTools detection
    const handleDevToolsStatus = (isOpen) => {
      if (isOpen) {
        // Force reload when DevTools is opened
        window.location.reload();
      }
    };

    // Add the listener for DevTools status changes
    addListener(handleDevToolsStatus);
    
    // Start the detection
    launch();

    // Cleanup the listener when component unmounts
    return () => {
      // You likely meant to remove the listener here, not add again
      // addListener(handleDevToolsStatus);
      // The correct way to remove listeners depends on the library
    };
  }, []);

  // While checking referrer, show a loading state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      {isValidReferrer ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/secure-download" element={<VerifyDownload />} />
          <Route path="/download/:token" element={<DownloadPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;