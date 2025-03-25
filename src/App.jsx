import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VerifyDownload from './pages/VerifyDownload';
import DownloadPage from './pages/Download';
import { addListener, launch } from 'devtools-detector';

function App() {
  useEffect(() => {
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
      addListener(handleDevToolsStatus);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/secure-download" element={<VerifyDownload />} />
        <Route path="/download/:token" element={<DownloadPage />} />
      </Routes>
    </Router>
  );
}

export default App;