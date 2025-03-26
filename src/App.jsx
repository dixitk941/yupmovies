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

function App() {
  const [isValidReferrer, setIsValidReferrer] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isApiRequest, setIsApiRequest] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  let refreshInterval;

  // Devtools detection setup
  useEffect(() => {
    const handleDevToolsOpen = () => {
      setIsDevToolsOpen(true);
      // Continuously refresh while devtools are open
      refreshInterval = setInterval(() => {
        window.location.reload();
      }, 1000);
    };

    const handleDevToolsClose = () => {
      setIsDevToolsOpen(false);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };

    // Add listeners for devtools events
    const unsubscribe = addListener({
      onOpen: handleDevToolsOpen,
      onClose: handleDevToolsClose
    });

    // Check if devtools are already open
    if (launch()) {
      handleDevToolsOpen();
    }

    // Cleanup
    return () => {
      unsubscribe();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

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

      if (isValid) {
        try {
          window.history.pushState({}, '', '/');
          window.history.replaceState({}, '', '<url id="cvhvomcjc3ffrsqhccbg" type="url" status="failed" title="" wc="0">https://aajnhibataunga.com</url> ' + window.location.pathname);
        } catch (error) {
          console.error('Failed to update URL:', error);
        }
      }
    };

    setTimeout(checkAccess, 200);
  }, []);

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