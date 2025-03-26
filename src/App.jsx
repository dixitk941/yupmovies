import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ProtectedPage from './pages/ProtectedPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { addListener, launch } from 'devtools-detector';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoR3A3ksIlmIzsW9s8LE02ExMT2Q4DQJg",
  authDomain: "goforcab-941.firebaseapp.com",
  projectId: "goforcab-941",
  storageBucket: "goforcab-941.firebasestorage.app",
  messagingSenderId: "418891489602",
  appId: "1:418891489602:web:155a8d181d90d72a8528db",
  measurementId: "G-4KCFN23SGG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Set up a global variable to track DevTools state
window.__devtoolsDetected = false;

function App() {
  const [isValidReferrer, setIsValidReferrer] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isApiRequest, setIsApiRequest] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const refreshIntervalRef = React.useRef(null);
  const devtoolsCheckIntervalRef = React.useRef(null);
  const multipleCheckIntervalRef = React.useRef(null);

  // More aggressive DevTools detection and page refresh
  useEffect(() => {
    const forceReload = () => {
      if (window.__devtoolsDetected) {
        // Use a more aggressive approach to refresh
        window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'cacheBust=' + Date.now();
      }
    };

    const handleDevToolsOpen = () => {
      console.clear(); // Clear console
      window.__devtoolsDetected = true;
      setIsDevToolsOpen(true);
      
      // Clear any existing intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Set multiple refresh strategies with different timings
      refreshIntervalRef.current = setInterval(forceReload, 500); // More frequent refresh
      
      // Also force an immediate reload
      forceReload();
      
      // Set a cookie to remember DevTools were opened (persists across refreshes)
      document.cookie = "devtools_detected=true; path=/;";
    };

    const handleDevToolsClose = () => {
      window.__devtoolsDetected = false;
      setIsDevToolsOpen(false);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      // Clear the cookie
      document.cookie = "devtools_detected=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    };

    // Add listeners from devtools-detector library
    const unsubscribe = addListener({
      onOpen: handleDevToolsOpen,
      onClose: handleDevToolsClose
    });

    // Launch initial check
    if (launch()) {
      handleDevToolsOpen();
    }

    // Check if the devtools cookie exists from previous detection
    if (document.cookie.includes("devtools_detected=true")) {
      handleDevToolsOpen();
    }

    // Additional detection methods
    const detectDevTools = () => {
      // Method 1: Check window dimensions
      const widthThreshold = 160;
      const heightThreshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      // Method 2: Debugger detection
      const devtoolsPresent = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && 
                            window.console && 
                            (window.console.firebug || 
                             (window.console.clear && window.console.profile));
      
      // Method 3: Check for Firefox dev tools
      const isFirefox = typeof InstallTrigger !== 'undefined';
      const firefoxDevtools = isFirefox && window.console && window.console.profileEnd;

      if ((widthDiff > widthThreshold || heightDiff > heightThreshold) || 
          devtoolsPresent || firefoxDevtools) {
        handleDevToolsOpen();
        return true;
      }
      
      return false;
    };

    // Check for DevTools periodically with multiple methods
    devtoolsCheckIntervalRef.current = setInterval(() => {
      const detected = detectDevTools();
      if (!detected && window.__devtoolsDetected) {
        // Only close if we previously detected and now it's closed
        handleDevToolsClose();
      }
    }, 1000);

    // Additional check for console.log overrides
    const originalLog = console.log;
    const originalClear = console.clear;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;
    
    console.log = function() {
      detectDevTools();
      return originalLog.apply(console, arguments);
    };
    
    console.clear = function() {
      detectDevTools();
      return originalClear.apply(console, arguments);
    };
    
    console.warn = function() {
      detectDevTools();
      return originalWarn.apply(console, arguments);
    };
    
    console.error = function() {
      detectDevTools();
      return originalError.apply(console, arguments);
    };
    
    console.debug = function() {
      detectDevTools();
      return originalDebug.apply(console, arguments);
    };

    // Clean up function
    return () => {
      unsubscribe();
      console.log = originalLog;
      console.clear = originalClear;
      console.warn = originalWarn;
      console.error = originalError;
      console.debug = originalDebug;
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (devtoolsCheckIntervalRef.current) {
        clearInterval(devtoolsCheckIntervalRef.current);
      }
      if (multipleCheckIntervalRef.current) {
        clearInterval(multipleCheckIntervalRef.current);
      }
    };
  }, []);

  // Rest of your existing code stays the same
  // Security layer: API tool detection and referrer validation
  useEffect(() => {
    const detectApiTools = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      const apiTools = ['postman', 'insomnia', 'curl', 'wget', 'python-requests', 'axios', 'hoppscotch'];
      const isApiTool = apiTools.some(tool => userAgent.includes(tool));
      
      const hasWindow = typeof window !== 'undefined';
      const hasDocument = typeof document !== 'undefined';
      const hasNavigator = typeof navigator !== 'undefined';
      const hasHistory = typeof history !== 'undefined';
      const hasLocation = typeof location !== 'undefined';
      const canHandleEvents = typeof addEventListener !== 'undefined';
      
      const isStandardBrowser = hasWindow && hasDocument && hasNavigator && 
                               hasHistory && hasLocation && canHandleEvents;
      
      return isApiTool || !isStandardBrowser;
    };

    if (detectApiTools()) {
      setIsApiRequest(true);
      setIsValidReferrer(false);
      setIsChecking(false);
      return;
    }

    const checkAccess = () => {
      const referrer = document.referrer;
      const validReferrers = [
        'hiicine.vercel.app',
        'www.hiicine.vercel.app',
        'localhost'
      ];

      const isValid = validReferrers.some(domain => 
        referrer.includes(domain)
      );

      setIsValidReferrer(isValid);
      setIsChecking(false);
    };

    setTimeout(checkAccess, 200);
  }, []);

  // Render logic
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isApiRequest || isDevToolsOpen) {
    return <ForbiddenPage />;
  }

  return (
    <Router>
      {isValidReferrer ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/protected" element={<ProtectedPage />} />
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