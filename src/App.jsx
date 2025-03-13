import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import VerifyDownload from './pages/VerifyDownload';
import DownloadPage from './pages/Download';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/verify/:id/:quality" element={<VerifyDownload />} />
        <Route path="/download/:id/:quality" element={<DownloadPage />} />
      </Routes>
    </Router>
  );
}

export default App;