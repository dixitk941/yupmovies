import React, { useEffect, useState, useRef } from 'react';
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
  const maskerRef = useRef(null);
  const intervalRef = useRef(null);
  
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

  // Completely new domain masking approach
  useEffect(() => {
    if (!isValidReferrer || isChecking || isApiRequest) return;
    
    // Domain to show in address bar
    const fakeDomain = 'https://aajdomainnhibataunga.com';

    // Implementation details
    const setupDomainMasking = () => {
      // 1. Create an iframe that will be our masking layer
      const masker = document.createElement('iframe');
      masker.style.position = 'absolute';
      masker.style.top = '0';
      masker.style.left = '0';
      masker.style.width = '100%';
      masker.style.height = '100%';
      masker.style.border = 'none';
      masker.style.zIndex = '-1';  // Behind everything
      masker.style.opacity = '0';  // Invisible
      masker.style.pointerEvents = 'none'; // Don't capture clicks
      masker.title = 'Domain Masker';
      masker.ariaHidden = 'true';
      
      // 2. Define the HTML content for our masker iframe
      // This uses HTML data URL to avoid cross-origin issues
      const maskerContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${fakeDomain.replace('https://', '')}</title>
          <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkZEOTU0NDk0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkZEOTU0NEE0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGRkQ5NTQ0NzRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGRkQ5NTQ0ODRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmDmwZkAAADiSURBVHjaYvz//z8DJYCJgULAYmRkdICBgX87ED+GYkFGAvbfB+L7QPwQqnc7yAIo/gDE94EWXCfSwHtQve+B+BDMAhD+DsT3GIgDd6H67kPpO4zYIpGBOPAAqvcBiAXRLHgNxA+INOAhVN8bqAUvsQUiyIK7QCxEpAWiUL33QRZ8wZYQQRbcIsECkN7bIAu+4kpdIAvOk2CBCVTfWZAFP/DlRpAFR0mwwAWq7xDIgl+EciPIgj0kWOAO1bcbZMFfYnIjyIJNJFiwAapvIzCQ/hGbG0EWLCHBgtVQfauIzY1My0pAAgwAGnVVMDr2JZ0AAAAASUVORK5CYII=">
          <script type="text/javascript">
            // JavaScript that runs in the iframe
            function updateMaskedURL() {
              try {
                // Get current path from the parent window
                const path = parent.location.pathname;
                const search = parent.location.search; 
                const hash = parent.location.hash;
                const fakeDomain = "${fakeDomain}";
                
                // Update the iframe's location bar via history API
                window.history.replaceState(null, "", fakeDomain + path + search + hash);
                
                // Force browser to show this in the address bar by focusing
                // Note: This is the key step that makes it work
                if (document.hasFocus()) {
                  window.focus();
                } 
              } catch(e) {
                console.log("Masking error", e);
              }
            }
            
            // Set up continuous updates
            updateMaskedURL();
            setInterval(updateMaskedURL, 500);
            
            // React to navigation
            window.addEventListener('blur', updateMaskedURL);
          </script>
        </head>
        <body style="margin:0;padding:0;background:transparent;">
          <!-- Empty transparent body -->
        </body>
        </html>
      `;
      
      // Convert the HTML to a data URL
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(maskerContent);
      masker.src = dataUrl;
      
      // Add the iframe to the document
      document.body.appendChild(masker);
      
      // Store reference for cleanup
      maskerRef.current = masker;
    };
    
    // Set up the primary URL masking
    const applyPrimaryMasking = () => {
      const path = window.location.pathname;
      const search = window.location.search; 
      const hash = window.location.hash;
      
      try {
        // Apply the fake domain via history API
        window.history.replaceState(
          { masked: true }, 
          document.title, 
          `${fakeDomain}${path}${search}${hash}`
        );
        
        // Update document title and favicon
        document.title = fakeDomain.replace('https://', '');
        
        // Update favicon
        const link = document.querySelector('link[rel*="icon"]') || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkZEOTU0NDk0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkZEOTU0NEE0QjdFMTFFQTlDN0JDNTAyQTM3RkMzNTAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGRkQ5NTQ0NzRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGRkQ5NTQ0ODRCN0UxMUVBOUM3QkM1MDJBMzdGQzM1MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmDmwZkAAADiSURBVHjaYvz//z8DJYCJgULAYmRkdICBgX87ED+GYkFGAvbfB+L7QPwQqnc7yAIo/gDE94EWXCfSwHtQve+B+BDMAhD+DsT3GIgDd6H67kPpO4zYIpGBOPAAqvcBiAXRLHgNxA+INOAhVN8bqAUvsQUiyIK7QCxEpAWiUL33QRZ8wZYQQRbcIsECkN7bIAu+4kpdIAvOk2CBCVTfWZAFP/DlRpAFR0mwwAWq7xDIgl+EciPIgj0kWOAO1bcbZMFfYnIjyIJNJFiwAapvIzCQ/hGbG0EWLCHBgtVQfauIzY1My0pAAgwAGnVVMDr2JZ0AAAAASUVORK5CYII=';
        if (!document.head.contains(link)) {
          document.head.appendChild(link);
        }
      } catch(e) {
        console.error("Error in primary masking", e);
      }
    };
    
    // First, set up both masking techniques
    setupDomainMasking();
    applyPrimaryMasking();
    
    // Then establish an interval to keep applying the masking
    intervalRef.current = setInterval(() => {
      applyPrimaryMasking();
    }, 1000);
    
    // Also track URL changes
    const handleUrlChange = () => {
      setTimeout(applyPrimaryMasking, 50);
    };
    
    // Add listeners
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('pushstate', handleUrlChange);
    window.addEventListener('replacestate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    
    // Monitor the document title changes
    const titleObserver = new MutationObserver(() => {
      document.title = fakeDomain.replace('https://', '');
    });
    
    titleObserver.observe(document.querySelector('title') || document.head, {
      subtree: true,
      characterData: true,
      childList: true
    });
    
    // Handle React Router navigation
    const originalPushState = window.history.pushState;
    window.history.pushState = function() {
      const result = originalPushState.apply(this, arguments);
      handleUrlChange();
      return result;
    };
    
    // Handle page focus/visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        applyPrimaryMasking();
      }
    });
    
    // Cleanup function
    return () => {
      if (maskerRef.current) {
        document.body.removeChild(maskerRef.current);
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('pushstate', handleUrlChange);
      window.removeEventListener('replacestate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      
      titleObserver.disconnect();
      window.history.pushState = originalPushState;
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