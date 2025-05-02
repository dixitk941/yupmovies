import React, { useEffect, useState, useRef } from 'react';
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
  const adContainerRef = useRef(null);

  // Adsterra ads initialization
  useEffect(() => {
    // Create first script element for Adsterra
    const adsterraScript1 = document.createElement('script');
    adsterraScript1.src = `//pl20750537.highcpmrevenuegate.com/6f/db/61/6fdb61a80f1f832b67418a9ec7bce67b.js`;
    adsterraScript1.async = true;
    document.head.appendChild(adsterraScript1);

    // Create second Adsterra script - Ad options
    const adsterraScript2Options = document.createElement('script');
    adsterraScript2Options.type = 'text/javascript';
    adsterraScript2Options.text = `
      atOptions = {
        'key' : 'd665a7c9bd7740081f1fcdf13ce183b9',
        'format' : 'iframe',
        'height' : 60,
        'width' : 468,
        'params' : {}
      };
    `;
    document.head.appendChild(adsterraScript2Options);

    // Create second Adsterra script - Ad invoke
    const adsterraScript2Invoke = document.createElement('script');
    adsterraScript2Invoke.type = 'text/javascript';
    adsterraScript2Invoke.src = '//www.highperformanceformat.com/d665a7c9bd7740081f1fcdf13ce183b9/invoke.js';
    adsterraScript2Invoke.async = true;
    document.head.appendChild(adsterraScript2Invoke);

    // Cleanup function
    return () => {
      if (document.head.contains(adsterraScript1)) {
        document.head.removeChild(adsterraScript1);
      }
      if (document.head.contains(adsterraScript2Options)) {
        document.head.removeChild(adsterraScript2Options);
      }
      if (document.head.contains(adsterraScript2Invoke)) {
        document.head.removeChild(adsterraScript2Invoke);
      }
    };
  }, []);

  // DevTools detection and app reload using the simpler approach
  useEffect(() => {
    const handleDevToolsStatus = (isOpen) => {
      if (isOpen) {
        // Force reload when DevTools is opened
        window.location.reload();
        
        // Update state
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Add the listener for DevTools status changes
    addListener(handleDevToolsStatus);
    
    // Start the detection
    launch();

    // Cleanup the listener when component unmounts
    return () => {
      addListener(handleDevToolsStatus);
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
    };

    setTimeout(checkAccess, 200);
  }, []);

  // Component to display the second Adsterra ad (iframe)
  const AdsterraAd = () => {
    useEffect(() => {
      if (!adContainerRef.current) return;

      // Clear any existing content
      while (adContainerRef.current.firstChild) {
        adContainerRef.current.removeChild(adContainerRef.current.firstChild);
      }

      // Create a script that will render the Adsterra ad
      const script = document.createElement('script');
      script.src = '//www.highperformanceformat.com/d665a7c9bd7740081f1fcdf13ce183b9/invoke.js';
      script.async = true;
      
      adContainerRef.current.appendChild(script);
      
      return () => {
        if (adContainerRef.current) {
          while (adContainerRef.current.firstChild) {
            adContainerRef.current.removeChild(adContainerRef.current.firstChild);
          }
        }
      };
    }, []);

    return <div ref={adContainerRef} className="adsterra-container" style={{ width: '468px', height: '60px', margin: '0 auto' }}></div>;
  };

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
      {/* Show ad at the top of the application */}
      <div className="w-full flex justify-center my-2">
        <AdsterraAd />
      </div>
      
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