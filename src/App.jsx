import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedPage from "./pages/ProtectedPage";
import NotFoundPage from "./pages/NotFoundPage";
import { addListener, launch } from "devtools-detector";
import { KJUR, b64utoutf8 } from "jsrsasign";

const SECRET = "hiicine_demo_secret_2025";

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

function App() {
  const [block, setBlock] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [comingFromVerification, setComingFromVerification] = useState(false);

  useEffect(() => {
    if (isApiTool()) setBlock(true);
  }, []);

  // DevTools detection (commented out for development)
  /*
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
  */

  useEffect(() => {
    if (sessionStorage.getItem("hiiCineSessionValidated") === "1") {
      setHasAccess(true);
      setComingFromVerification(true); // Assume they came through proper process
    }
    setIsChecking(false);
  }, []);

  if (block || isDevToolsOpen) {
    return <NotFoundPage />;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
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

export default App;
