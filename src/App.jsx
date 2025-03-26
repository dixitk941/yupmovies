import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VerifyDownload from './pages/VerifyDownload';
import DownloadPage from './pages/Download';
import { addListener, launch } from 'devtools-detector';

// Custom 403/404 Pages
const ForbiddenPage = () => {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white px-4">
      <div className="text-9xl font-bold mb-6 text-red-500">403</div>
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Access Forbidden</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        Direct API requests are not allowed. This content is only accessible through the website.
      </p>
    </div>
  );
};

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
  const [isApiRequest, setIsApiRequest] = useState(false);
  
  useEffect(() => {
    // Security layer: API tool detection
    const detectApiTools = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Check for common API tools in User-Agent
      const apiTools = ['postman', 'insomnia', 'curl', 'wget', 'python-requests', 'axios', 'hoppscotch'];
      const isApiTool = apiTools.some(tool => userAgent.includes(tool));
      
      // Check for missing browser properties
      const hasWindow = typeof window !== 'undefined';
      const hasDocument = typeof document !== 'undefined';
      const hasNavigator = typeof navigator !== 'undefined';
      
      // Check for browser-specific objects
      const hasHistory = typeof history !== 'undefined';
      const hasLocation = typeof location !== 'undefined';
      
      // Check for event handling capability
      const canHandleEvents = typeof addEventListener !== 'undefined';
      
      const isStandardBrowser = hasWindow && hasDocument && hasNavigator && 
                               hasHistory && hasLocation && canHandleEvents;
      
      return isApiTool || !isStandardBrowser;
    };
    
    // If detected as API request, mark as invalid
    if (detectApiTools()) {
      setIsApiRequest(true);
      setIsValidReferrer(false);
      setIsChecking(false);
      return;
    }
    
    // Function to check if the referrer or local storage indicates valid access
    const checkAccess = () => {
      // Get the referrer
      const referrer = document.referrer;
      
      // Check local storage for valid session token with timestamp validation
      const sessionToken = localStorage.getItem('secureSessionToken');
      let hasValidSession = false;
      
      if (sessionToken) {
        try {
          const tokenData = JSON.parse(atob(sessionToken));
          // Check if token is still valid (expires after 24 hours)
          const isExpired = (Date.now() - tokenData.timestamp) > (24 * 60 * 60 * 1000);
          hasValidSession = !isExpired && tokenData.valid;
        } catch (e) {
          // Invalid token format, clear it
          localStorage.removeItem('secureSessionToken');
        }
      }
      
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
        // Set valid session token with timestamp
        const newToken = btoa(JSON.stringify({
          valid: true,
          timestamp: Date.now(),
          referrer: isValid ? referrer : 'session'
        }));
        localStorage.setItem('secureSessionToken', newToken);
        setIsValidReferrer(true);
      } else {
        // Clear any existing session
        localStorage.removeItem('secureSessionToken');
        setIsValidReferrer(false);
      }
      
      // Finish checking
      setIsChecking(false);
    };
    
    // Short delay to ensure referrer is available
    setTimeout(checkAccess, 200);
    
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
  }, []);

  // URL and domain masking
  useEffect(() => {
    if (!isValidReferrer || isChecking || isApiRequest) return;
    
    const fakeDomain = 'https://aajdomainnhibataunga.com';
    
    // More robust domain masking implementation
    const applyDomainMasking = () => {
      try {
        // Get current path components
        const path = window.location.pathname;
        const search = window.location.search;
        const hash = window.location.hash;
        
        // Apply fake domain to URL bar
        window.history.replaceState(
          { ...window.history.state, maskedUrl: true }, 
          document.title, 
          `${fakeDomain}${path}${search}${hash}`
        );
        
        // Update favicon
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.head.appendChild(link);
        }
        link.type = 'image/x-icon';
        link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkZEOTU0NDk0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkZEOTU0NEE0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGRkQ5NTQ0NzRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGRkQ5NTQ0ODRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmDmwZkAAADiSURBVHjaYvz//z8DJYCJgULAYmRkdICBgX87ED+GYkFGAvbfB+L7QPwQqnc7yAIo/gDE94EWXCfSwHtQve+B+BDMAhD+DsT3GIgDd6H67kPpO4zYIpGBOPAAqvcBiAXRLHgNxA+INOAhVN8bqAUvsQUiyIK7QCxEpAWiUL33QRZ8wZYQQRbcIsECkN7bIAu+4kpdIAvOk2CBCVTfWZAFP/DlRpAFR0mwwAWq7xDIgl+EciPIgj0kWOAO1bcbZMFfYnIjyIJNJFiwAapvIzCQ/hGbG0EWLCHBgtVQfauIzY1My0pAAgwAGnVVMDr2JZ0AAAAASUVORK5CYII=';
        
        // Update document title
        document.title = 'aajdomainnhibataunga.com';
        
        // Create a meta tag to help with SEO blocking
        let metaRobots = document.querySelector("meta[name='robots']");
        if (!metaRobots) {
          metaRobots = document.createElement('meta');
          metaRobots.name = 'robots';
          document.head.appendChild(metaRobots);
        }
        metaRobots.content = 'noindex, nofollow';
      } catch (e) {
        console.error("Failed to apply domain masking", e);
      }
    };
    
    // Apply domain masking initially and after a slight delay
    applyDomainMasking();
    setTimeout(applyDomainMasking, 500);  // Apply again after 500ms to ensure it works
    
    // Advanced event interception for React Router and browser navigation
    const interceptNavigation = () => {
      // 1. Set up a mutation observer for title changes
      const titleObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.target.nodeName === 'TITLE') {
            document.title = 'aajdomainnhibataunga.com';
          }
        }
      });
      
      titleObserver.observe(document.head, { 
        childList: true, 
        subtree: true, 
        characterData: true,
        attributes: true 
      });
      
      // 2. Intercept all history state methods
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      window.history.pushState = function() {
        const result = originalPushState.apply(this, arguments);
        setTimeout(applyDomainMasking, 10);
        return result;
      };
      
      window.history.replaceState = function() {
        const result = originalReplaceState.apply(this, arguments);
        // Only apply domain masking if this isn't our own call
        if (!arguments[0]?.maskedUrl) {
          setTimeout(applyDomainMasking, 10);
        }
        return result;
      };
      
      // 3. Monitor browser navigation events
      window.addEventListener('popstate', () => setTimeout(applyDomainMasking, 10));
      window.addEventListener('hashchange', () => setTimeout(applyDomainMasking, 10));
      
      // 4. Watch URL bar focus to reapply masking when user might see it
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          applyDomainMasking();
        }
      });
      
      // 5. Watch for fullscreen changes which might update URL
      document.addEventListener('fullscreenchange', applyDomainMasking);
      
      // Return cleanup functions
      return {
        titleObserver,
        originalPushState,
        originalReplaceState
      };
    };
    
    // Start the navigation interceptor
    const { titleObserver, originalPushState, originalReplaceState } = interceptNavigation();
    
    // Cleanup function
    return () => {
      titleObserver.disconnect();
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [isValidReferrer, isChecking, isApiRequest]);

  // While checking referrer, show a loading state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // For API requests, show 403 forbidden
  if (isApiRequest) {
    return <ForbiddenPage />;
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