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
        
        // Hide the real domain with a fake one after a short delay
        setTimeout(() => {
          // Using history.replaceState to change URL without navigation
          const fakeDomain = 'https://aajdomainnhibataunga.com';
          const path = window.location.pathname;
          const search = window.location.search;
          
          // Replace the current URL in history
          window.history.replaceState({}, document.title, fakeDomain + path + search);
          
          // Set a small favicon that matches the fake domain theme
          const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkZEOTU0NDk0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkZEOTU0NEE0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGRkQ5NTQ0NzRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGRkQ5NTQ0ODRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmDmwZkAAADiSURBVHjaYvz//z8DJYCJgULAYmRkdICBgX87ED+GYkFGAvbfB+L7QPwQqnc7yAIo/gDE94EWXCfSwHtQve+B+BDMAhD+DsT3GIgDd6H67kPpO4zYIpGBOPAAqvcBiAXRLHgNxA+INOAhVN8bqAUvsQUiyIK7QCxEpAWiUL33QRZ8wZYQQRbcIsECkN7bIAu+4kpdIAvOk2CBCVTfWZAFP/DlRpAFR0mwwAWq7xDIgl+EciPIgj0kWOAO1bcbZMFfYnIjyIJNJFiwAapvIzCQ/hGbG0EWLCHBgtVQfauIzY1My0pAAgwAGnVVMDr2JZ0AAAAASUVORK5CYII=';
          document.getElementsByTagName('head')[0].appendChild(link);
          
          // Also update the document title to match the fake domain
          document.title = 'aajdomainnhibataunga.com';
        }, 500);
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

    // Handle navigation events to maintain the fake URL
    const handleNavigation = () => {
      if (isValidReferrer) {
        const fakeDomain = 'https://aajdomainnhibataunga.com';
        const path = window.location.pathname;
        const search = window.location.search;
        
        setTimeout(() => {
          window.history.replaceState({}, document.title, fakeDomain + path + search);
        }, 100);
      }
    };

    // Listen for history changes (when using React Router)
    window.addEventListener('popstate', handleNavigation);

    // Cleanup the listener when component unmounts
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      // The devtools-detector library might not have a clean way to remove listeners
    };
  }, [isValidReferrer]);

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