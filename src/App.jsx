import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ProtectedPage from './pages/ProtectedPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

function App() {
  const [isValidReferrer, setIsValidReferrer] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isApiRequest, setIsApiRequest] = useState(false);
  const [maskedDomain, setMaskedDomain] = useState('https://yourcustomdomain.com');

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
    const checkAccess = async () => {
      try {
        // Get the current path
        const currentPath = window.location.pathname;
        
        // Check if we're coming from a valid referrer
        const referrer = document.referrer;
        const validReferrers = [
          'https://hiicine.vercel.app',
          'https://www.hiicine.vercel.app',
          'http://localhost'  // Allow localhost for development
        ];
        
        const isValidReferrer = validReferrers.some(domain => referrer.includes(domain));
        
        // If valid referrer or we're on the initial page load
        if (isValidReferrer || window.location.href.includes('hiicine.vercel.app')) {
          // Mask the domain
          history.pushState({}, '', `${maskedDomain}${currentPath}`);
          setIsValidReferrer(true);
        } else {
          setIsValidReferrer(false);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setIsValidReferrer(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAccess();
    
    // Listen for popstate events to maintain masking
    window.addEventListener('popstate', () => {
      if (isValidReferrer) {
        history.pushState({}, '', `${maskedDomain}${window.location.pathname}`);
      }
    });
    
    return () => {
      window.removeEventListener('popstate', () => {});
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

  // For API requests, show 403 forbidden
  if (isApiRequest) {
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