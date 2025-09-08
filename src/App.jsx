import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedPage from "./pages/ProtectedPage";
import NotFoundPage from "./pages/NotFoundPage";
import { CardSkeleton } from "./components/Skeleton";
import { addListener, launch } from "devtools-detector";
import { KJUR, b64utoutf8 } from "jsrsasign";

const SECRET = "hiicine_demo_secret_2025";

// URL Masking function
function maskURL() {
  try {
    // Store the original URL for functionality
    window.originalURL = window.location.href;
    
    // Change the displayed URL to google.co.in
    const maskedURL = 'https://google.co.in';
    
    // Use replaceState to change the URL without page reload
    window.history.replaceState(
      { maskedURL: true, originalURL: window.originalURL }, 
      '', 
      maskedURL
    );
    
    console.log('URL masked successfully');
  } catch (error) {
    console.log('URL masking failed:', error);
  }
}

// Desktop Detection and Blocking System
function useDesktopBlocking() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Check if we're in production environment
    const isProd = (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      !window.location.hostname.includes("localhost") &&
      process.env.NODE_ENV === 'production'
    );
    setIsProduction(isProd);

    // Desktop detection function
    const detectDesktop = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Multiple layers of desktop detection
      const isDesktopUA = !(
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
        /mobile|tablet|phone/i.test(userAgent)
      );
      
      // Screen resolution check (desktop typically has larger screens)
      const isDesktopScreen = screenWidth >= 1024 || screenHeight >= 768;
      
      // Window size check
      const isDesktopWindow = windowWidth >= 768;
      
      // Touch capability check (desktops typically don't have touch)
      const hasNoTouch = !('ontouchstart' in window) && !navigator.maxTouchPoints;
      
      // Device pixel ratio check (mobile devices often have higher DPR)
      const hasDesktopDPR = window.devicePixelRatio <= 2;
      
      // Orientation check (desktops don't typically change orientation)
      const hasNoOrientationAPI = typeof window.orientation === 'undefined';
      
      // Check for mouse/trackpad (desktop specific)
      const hasPointer = window.matchMedia('(any-pointer: fine)').matches;
      
      // Check for keyboard navigation (more common on desktop)
      const hasKeyboard = window.matchMedia('(any-hover: hover)').matches;
      
      // Additional checks for desktop environments
      const desktopIndicators = [
        isDesktopUA,
        isDesktopScreen,
        isDesktopWindow,
        hasNoTouch,
        hasDesktopDPR,
        hasNoOrientationAPI,
        hasPointer,
        hasKeyboard
      ];
      
      // If majority of indicators suggest desktop, block it
      const desktopScore = desktopIndicators.filter(Boolean).length;
      const isLikelyDesktop = desktopScore >= 5; // Strict threshold
      
      console.log('Desktop Detection Report:', {
        userAgent: isDesktopUA,
        screenSize: isDesktopScreen,
        windowSize: isDesktopWindow,
        noTouch: hasNoTouch,
        desktopDPR: hasDesktopDPR,
        noOrientation: hasNoOrientationAPI,
        pointer: hasPointer,
        keyboard: hasKeyboard,
        score: desktopScore,
        isDesktop: isLikelyDesktop,
        production: isProd
      });
      
      return isLikelyDesktop;
    };

    // Initial check
    if (isProd) {
      const isDesktopDevice = detectDesktop();
      setIsDesktop(isDesktopDevice);
      
      if (isDesktopDevice) {
        console.log('🚫 DESKTOP ACCESS BLOCKED IN PRODUCTION');
        // Additional security - disable all mouse events
        document.body.style.pointerEvents = 'none';
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'not-allowed';
      }
    }

    // Monitor window resize to catch desktop users trying to resize
    const handleResize = () => {
      if (isProd && window.innerWidth >= 768) {
        setIsDesktop(true);
        console.log('🚫 Desktop-like window size detected - BLOCKING');
      }
    };

    // Monitor orientation change (mobile specific)
    const handleOrientationChange = () => {
      if (isProd && typeof window.orientation === 'undefined') {
        setIsDesktop(true);
        console.log('🚫 No orientation API - likely desktop - BLOCKING');
      }
    };

    // Monitor for desktop-specific events
    const handleMouseMove = (e) => {
      if (isProd && e.movementX !== undefined && e.movementY !== undefined) {
        // Precise mouse movement suggests desktop
        if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5) {
          setIsDesktop(true);
          console.log('🚫 Precise mouse movement detected - BLOCKING');
        }
      }
    };

    const handleKeyDown = (e) => {
      if (isProd) {
        // Desktop-specific key combinations
        const desktopKeys = [
          'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
          'PrintScreen', 'ScrollLock', 'Pause', 'Insert', 'Home', 'End', 'PageUp', 'PageDown'
        ];
        
        if (desktopKeys.includes(e.key) || 
            (e.ctrlKey && e.altKey) || // Ctrl+Alt combinations
            (e.ctrlKey && e.shiftKey && e.key !== 'I') || // Desktop shortcuts
            e.key === 'ContextMenu') {
          setIsDesktop(true);
          console.log('🚫 Desktop keyboard shortcut detected - BLOCKING');
        }
      }
    };

    if (isProd) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleOrientationChange);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('keydown', handleKeyDown);
      
      // Additional periodic checks
      const desktopCheckInterval = setInterval(() => {
        if (detectDesktop()) {
          setIsDesktop(true);
        }
      }, 5000);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('keydown', handleKeyDown);
        clearInterval(desktopCheckInterval);
      };
    }
  }, []);

  return { isDesktop, isProduction };
}

// Desktop Blocked Page Component
function DesktopBlockedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-black text-white p-4">
      <div className="max-w-md text-center space-y-6">
        {/* Mobile Phone Icon */}
        <div className="mx-auto w-24 h-24 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="white"
            className="drop-shadow-lg"
          >
            <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 4h10v14H7V4zm5 15c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"/>
          </svg>
        </div>
        
        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-red-400">
            📱 Mobile Only
          </h1>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-red-500/20">
            <h2 className="text-xl font-semibold mb-3 text-red-300">
              Desktop Access Restricted
            </h2>
            <p className="text-gray-300 leading-relaxed">
              This application is exclusively designed for mobile devices. 
              Desktop access is not permitted in production environment.
            </p>
          </div>
          
          <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-500/20">
            <p className="text-yellow-200 text-sm">
              <strong>⚠️ Security Notice:</strong> This restriction helps maintain 
              optimal security and user experience standards.
            </p>
          </div>
          
          <div className="space-y-2 text-sm text-gray-400">
            <p>• Please switch to a mobile device</p>
            <p>• Use your smartphone or tablet</p>
            <p>• iOS and Android supported</p>
          </div>
        </div>
        
        {/* QR Code Placeholder */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <p className="text-xs text-gray-400 mb-2">Scan with mobile device:</p>
          <div className="w-24 h-24 bg-white rounded mx-auto flex items-center justify-center">
            <span className="text-black text-xs">QR Code</span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 text-xs text-gray-500 text-center">
        <p>System ID: {Math.random().toString(36).substring(7)}</p>
        <p>Access denied at {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

function isApiTool() {
  try {
    const userAgent = navigator.userAgent.toLowerCase();
    const apiTools = ["postman", "insomnia", "curl", "wget", "python-requests", "axios", "hoppscotch", "httpclient", "powershell", "httpie"];
    const weirdProps = ["callPhantom","_phantom","phantom","__nightmare","selenium","webdriver", "__selenium_unwrapped","__webdriver_evaluate"];
    for (const tool of apiTools) { if (userAgent.includes(tool)) return true; }
    for (const p of weirdProps) { if (window[p]) return true; }
    if (navigator.webdriver) return true;
    if (/headlesschrome/.test(userAgent)) return true;
    return false;
  } catch {
    return true;
  }
}

function isLocalhost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

// Enhanced DevTools Detection and Network Protection
function useDevToolsProtection() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (isLocalhost()) return; // Skip protection in development

    // Set viewport meta tag to prevent zooming
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    } else {
      // Create viewport meta if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }
    
    // Add CSS to disable zooming
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        touch-action: pan-x pan-y;
        -ms-touch-action: pan-x pan-y;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        overscroll-behavior: none;
      }
      * {
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);

    // Console warnings and deterrents
    console.clear();
    console.log('%cSTOP!', 'color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);');
    console.log('%cThis is a browser feature intended for developers.', 'color: red; font-size: 16px; font-weight: bold;');
    console.log('%cUnauthorized access to network requests or content may violate terms of service.', 'color: red; font-size: 14px;');
    console.log('%cThis session is being monitored for security purposes.', 'color: orange; font-size: 12px;');

    // Advanced DevTools Detection
    const detectDevTools = () => {
      const threshold = 160;
      const heightDiff = window.outerHeight - window.innerHeight;
      const widthDiff = window.outerWidth - window.innerWidth;
      
      // More accurate detection - consider both dimensions and avoid false positives from browser UI
      const isDevToolsOpen = (
        (heightDiff > threshold && heightDiff < 800) || // Avoid full-screen false positives
        (widthDiff > threshold && widthDiff < 800)
      ) && (
        heightDiff > 100 || widthDiff > 100 // Minimum threshold to avoid normal browser variations
      );
      
      if (isDevToolsOpen) {
        // Double-check with a small delay to avoid false positives
        setTimeout(() => {
          const heightDiff2 = window.outerHeight - window.innerHeight;
          const widthDiff2 = window.outerWidth - window.innerWidth;
          if ((heightDiff2 > threshold && heightDiff2 < 800) || (widthDiff2 > threshold && widthDiff2 < 800)) {
            setIsBlocked(true);
            window.location.reload();
          }
        }, 500);
      }
    };

    // Console interception removed to prevent false positives
    // Protection now relies on window size detection and keyboard shortcuts only

    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Detect common developer keyboard shortcuts
    const handleKeyDown = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.shiftKey && e.keyCode === 67) || // Ctrl+Shift+C
        // Block zoom keyboard shortcuts
        (e.ctrlKey && e.keyCode === 107) || // Ctrl + Plus (+)
        (e.ctrlKey && e.keyCode === 109) || // Ctrl + Minus (-)
        (e.ctrlKey && e.keyCode === 187) || // Ctrl + Plus (+) in some browsers
        (e.ctrlKey && e.keyCode === 189) || // Ctrl + Minus (-) in some browsers
        (e.ctrlKey && e.keyCode === 61) || // Ctrl + = (zoom in)
        (e.ctrlKey && e.keyCode === 173) || // Ctrl + - (zoom out)
        (e.ctrlKey && (e.wheelDelta || e.detail)) // Ctrl + mouse wheel
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert('🚨 Developer tools access is restricted!\n\nThis action has been logged for security purposes.');
        return false;
      }
    };

    // Detect select all (Ctrl+A) to prevent source viewing
    const handleSelectAll = (e) => {
      if (e.ctrlKey && e.keyCode === 65) {
        e.preventDefault();
        return false;
      }
    };

    // Prevent zooming with mouse wheel or trackpad
    const handleWheel = (e) => {
      // Block zoom attempts
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    // Prevent pinch-to-zoom on touch devices
    const handleTouchMove = (e) => {
      // Detect pinch gestures
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent touch gestures with multiple fingers (pinch)
    const handleTouchStart = (e) => {
      // Block multi-touch gestures
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    // Handle gesture events for Safari/iOS
    const handleGestureStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Reset zoom level if somehow changed
    const checkAndResetZoom = () => {
      if (document.documentElement.clientWidth !== window.innerWidth) {
        // Force reset zoom
        document.body.style.zoom = 1;
        // Alternative method
        document.body.style.transform = 'scale(1)';
        document.body.style.transformOrigin = '0 0';
      }
    };

    // Monitor window focus (DevTools might change focus)
    let isWindowFocused = true;
    const handleFocus = () => { isWindowFocused = true; };
    const handleBlur = () => { isWindowFocused = false; };

    // Periodic checks
    const devToolsCheckInterval = setInterval(() => {
      detectDevTools();
      
      // Check and reset zoom level
      checkAndResetZoom();
      
      // Additional check for performance timing (DevTools affects performance) - only if window size indicates DevTools might be open
      const heightDiff = window.outerHeight - window.innerHeight;
      const widthDiff = window.outerWidth - window.innerWidth;
      
      if (heightDiff > 160 || widthDiff > 160) {
        const start = performance.now();
        debugger; // This will pause if DevTools is open
        const end = performance.now();
        if (end - start > 100) {
          setIsBlocked(true);
          window.location.reload();
        }
      }
    }, 2000); // Increased interval to reduce false positives

    // Network request monitoring and obfuscation
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      // Add random delay to make network inspection harder
      const delay = Math.random() * 100;
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(originalFetch.apply(this, args));
        }, delay);
      });
    };

    // XMLHttpRequest monitoring
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      // Log suspicious network activity
      if (this._url && !this._url.includes('localhost')) {
        console.warn('Network request intercepted:', this._url);
      }
      return originalXHRSend.apply(this, args);
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleSelectAll);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });
    document.addEventListener('gesturechange', handleGestureStart, { passive: false });
    document.addEventListener('gestureend', handleGestureStart, { passive: false });
    window.addEventListener('resize', checkAndResetZoom);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Detect if user is inspecting elements
    const detectInspection = () => {
      const element = document.createElement('div');
      element.id = 'detect-inspection';
      element.style.display = 'none';
      document.body.appendChild(element);
      
      let isInspecting = false;
      Object.defineProperty(element, 'id', {
        get: function() {
          isInspecting = true;
          setIsBlocked(true);
          alert('🚨 Element inspection detected!\n\nThis session will be terminated.');
          window.location.reload();
          return 'detect-inspection';
        },
        configurable: false
      });
    };

    detectInspection();

    // Cleanup function
    return () => {
      clearInterval(devToolsCheckInterval);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleSelectAll);
      document.removeEventListener('wheel', handleWheel, { passive: false });
      document.removeEventListener('touchmove', handleTouchMove, { passive: false });
      document.removeEventListener('touchstart', handleTouchStart, { passive: false });
      document.removeEventListener('gesturestart', handleGestureStart, { passive: false });
      document.removeEventListener('gesturechange', handleGestureStart, { passive: false });
      document.removeEventListener('gestureend', handleGestureStart, { passive: false });
      window.removeEventListener('resize', checkAndResetZoom);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      // Restore original functions
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, []);

  return isBlocked;
}

// Connection Broken Page - Shows when user comes directly
function ConnectionBrokenPage() {
  const goToVerification = () => {
    window.location.href = "http://127.0.0.1:5501/index.html";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
      <div className="flex flex-col items-center max-w-md text-center">
        {/* Connection Broken SVG */}
        <svg 
          width="120" 
          height="120" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#ff4444" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="mb-8"
        >
          <path d="M16.5 9.4l-9-5.19"/>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polygon points="2.5 8.5 12 15.5 21.5 8.5"/>
          <path d="m12 22.5v-7"/>
          <path d="M7.5 4.21l9 5.19"/>
        </svg>
        
        {/* Error Message */}
        <h1 className="text-3xl font-bold text-red-400 mb-4">
          Connection Broken
        </h1>
        
        <p className="text-gray-300 mb-8 leading-relaxed">
          Direct access is not allowed. You must verify yourself first before accessing this content.
        </p>
        
        {/* Verification Button */}
        <button
          onClick={goToVerification}
          className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Start Verification Process
        </button>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>This helps us ensure secure access to premium content</p>
        </div>
      </div>
    </div>
  );
}

// Manual Token Entry Page - Only shown if coming with a token or from verification
function EnterTokenPage({ setHasAccess, comingFromVerification }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If user came directly (not from verification), show connection broken page
  if (!comingFromVerification) {
    return <ConnectionBrokenPage />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const token = input.trim();
    if (!token) {
      setError("Please enter a token.");
      setLoading(false);
      return;
    }
    try {
      const isValid = KJUR.jws.JWS.verify(token, SECRET, ["HS256"]);
      if (!isValid) {
        setError("Invalid token signature. This is not a valid token.");
        setLoading(false);
        return;
      }
      const payloadObj = KJUR.jws.JWS.readSafeJSONString(
        b64utoutf8(token.split(".")[1])
      );
      const now = Math.floor(Date.now() / 1000);
      if (!payloadObj.exp || now > payloadObj.exp) {
        setError("Token expired! Please generate a new token.");
        setLoading(false);
        return;
      }
      if (!payloadObj.verified) {
        setError("Token not verified. Please complete the verification process.");
        setLoading(false);
        return;
      }
      setHasAccess(true);
      sessionStorage.setItem("hiiCineSessionValidated", "1");
      sessionStorage.setItem("hiiCineTokenPayload", JSON.stringify(payloadObj));
    } catch (err) {
      setError("Token format is invalid or corrupted.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212]">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-3xl mb-4 text-center font-bold text-red-500">Enter Access Token</h1>
        <p className="text-gray-400 mb-6 text-center text-sm">
          Paste your verification token to access premium content.
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JWT access token here"
          className="w-full px-3 py-2 rounded bg-gray-900 text-white mb-3"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-4 py-2 rounded w-full font-bold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Verifying JWT..." : "Validate Token"}
        </button>
        {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
        
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => window.location.href = "http://127.0.0.1:5501/index.html"}
            className="text-orange-400 hover:text-orange-300 text-sm underline"
          >
            Get New Access Token →
          </button>
        </div>
      </form>
    </div>
  );
}

function useTokenAutoLogin(setHasAccess, setComingFromVerification) {
  const location = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    
    if (token) {
      // User is coming from verification process
      setComingFromVerification(true);
      
      try {
        const isValid = KJUR.jws.JWS.verify(token, SECRET, ["HS256"]);
        if (!isValid) {
          return;
        }
        
        const payloadObj = KJUR.jws.JWS.readSafeJSONString(
          b64utoutf8(token.split(".")[1])
        );
        
        const now = Math.floor(Date.now() / 1000);
        if (!payloadObj.exp || now > payloadObj.exp) {
          return;
        }
        
        if (!payloadObj.verified) {
          return;
        }
        
        sessionStorage.setItem("hiiCineSessionValidated", "1");
        sessionStorage.setItem("hiiCineTokenPayload", JSON.stringify(payloadObj));
        setHasAccess(true);
        
        // Clean URL immediately after successful validation
        const cleanUrl = window.location.protocol + '//' + 
                        window.location.host + 
                        window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
      } catch (error) {
        // Handle error silently
      }
    } else {
      // No token parameter - user came directly
      setComingFromVerification(false);
    }
  }, [location, setHasAccess, setComingFromVerification]);
}

// Obfuscated fetch function for network requests
const obfuscatedFetch = async (endpoint, data = null, options = {}) => {
  const obfuscatedEndpoint = btoa(endpoint).replace(/[+/=]/g, ''); // Remove padding
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(7);
  
  const requestData = data ? {
    payload: btoa(JSON.stringify(data)),
    timestamp,
    nonce
  } : null;

  const headers = {
    'Content-Type': 'application/octet-stream',
    'X-Request-ID': Math.random().toString(36),
    'X-Client-Time': timestamp,
    'X-Nonce': nonce,
    ...options.headers
  };

  // Add random delay to obfuscate timing
  const delay = Math.random() * 200 + 100;
  await new Promise(resolve => setTimeout(resolve, delay));

  return fetch(`/api/v2/${obfuscatedEndpoint}`, {
    method: data ? 'POST' : 'GET',
    headers,
    body: requestData ? JSON.stringify(requestData) : null,
    ...options
  });
};

function App() {
  const [block, setBlock] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [comingFromVerification, setComingFromVerification] = useState(false);
  
  // Use enhanced DevTools protection
  const isProtectionBlocked = useDevToolsProtection();
  
  // Use desktop blocking system
  const { isDesktop, isProduction } = useDesktopBlocking();

  useEffect(() => {
    if (isApiTool()) setBlock(true);
  }, []);

  // Standard DevTools detection (keeping your original code)
  useEffect(() => {
    if (!isLocalhost()) {
      const handleDevToolsStatus = (isOpen) => {
        if (isOpen) {
          window.location.reload();
          setIsDevToolsOpen(true);
        } else {
          setIsDevToolsOpen(false);
        }
      };
      addListener(handleDevToolsStatus);
      launch();
      return () => {
        addListener(handleDevToolsStatus);
      };
    }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("hiiCineSessionValidated") === "1") {
      setHasAccess(true);
      setComingFromVerification(true); // Assume they came through proper process
      
      // Apply URL masking after successful validation
      setTimeout(() => {
        maskURL();
      }, 1000); // Delay to ensure page is fully loaded
    }
    setIsChecking(false);
  }, []);

  // Priority 1: Block desktop access in production (HIGHEST PRIORITY)
  if (isProduction && isDesktop) {
    console.log('🚫 DESKTOP ACCESS BLOCKED - Production environment detected');
    return <DesktopBlockedPage />;
  }

  // Priority 2: Block if any other protection mechanism is triggered
  if (block || isDevToolsOpen || isProtectionBlocked) {
    return <NotFoundPage />;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#121212] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 h-16 bg-gray-800 rounded animate-pulse"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* Desktop Warning Overlay - CSS-based backup */}
      <div className="desktop-warning">
        <div>DESKTOP ACCESS DENIED</div>
        <div>This application is mobile-only</div>
      </div>
      
      <TokenAutoLoginWrapper 
        setHasAccess={setHasAccess} 
        setComingFromVerification={setComingFromVerification}
      />
      <Routes>
        {hasAccess ? (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/protected" element={<ProtectedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </>
        ) : (
          <>
            <Route 
              path="*" 
              element={
                <EnterTokenPage 
                  setHasAccess={setHasAccess} 
                  comingFromVerification={comingFromVerification}
                />
              } 
            />
          </>
        )}
      </Routes>
    </Router>
  );
}

function TokenAutoLoginWrapper({ setHasAccess, setComingFromVerification }) {
  useTokenAutoLogin(setHasAccess, setComingFromVerification);
  return null;
}

// Export the obfuscated fetch function for use in other components
export { obfuscatedFetch };
export default App;