import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedPage from "./pages/ProtectedPage";
import NotFoundPage from "./pages/NotFoundPage";
import { addListener, launch } from "devtools-detector";
import { KJUR, b64utoutf8 } from "jsrsasign";

const SECRET = "hiicine_demo_secret_2025";
const BYPASS_SECRET = "hiicine_debug_2025"; // Secret key for temporary bypass

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

// Check if DevTools protection should be bypassed
function shouldBypassProtection() {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const bypassKey = urlParams.get('debug');
  
  // Check sessionStorage for persistent bypass
  const sessionBypass = sessionStorage.getItem('devtools_bypass');
  
  // Check time-based bypass
  const bypassData = localStorage.getItem('devtools_bypass_until');
  let timeBypass = false;
  if (bypassData) {
    const bypassUntil = parseInt(bypassData);
    timeBypass = Date.now() < bypassUntil;
    if (!timeBypass) {
      localStorage.removeItem('devtools_bypass_until');
    }
  }
  
  return bypassKey === BYPASS_SECRET || sessionBypass === 'true' || timeBypass;
}

// Enhanced DevTools Detection and Network Protection
function useDevToolsProtection() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname === '0.0.0.0';
    
    // Check if protection should be bypassed
    const bypassProtection = shouldBypassProtection();
    
    if (isDevelopment || isLocalhost || bypassProtection) {
      // Development environment or bypass active - allow DevTools
      console.log('%cDEVTOOLS ALLOWED', 'color: green; font-size: 16px; font-weight: bold;');
      console.log('DevTools protection disabled for development environment.');
      
      // Add helpful debug functions to window
      window.__enableDevtools__ = () => {
        sessionStorage.setItem('devtools_bypass', 'true');
        console.log('DevTools bypass enabled for this session');
        window.location.reload();
      };
      
      window.__enableDevtoolsFor__ = (minutes = 60) => {
        const bypassUntil = Date.now() + (minutes * 60 * 1000);
        localStorage.setItem('devtools_bypass_until', bypassUntil.toString());
        console.log(`DevTools enabled for ${minutes} minutes`);
        window.location.reload();
      };
      
      window.__disableDevtoolsBypass__ = () => {
        sessionStorage.removeItem('devtools_bypass');
        localStorage.removeItem('devtools_bypass_until');
        console.log('DevTools bypass disabled');
        window.location.reload();
      };
      
      return () => {
        // Minimal cleanup for development
      };
    }

    // Production environment - enable protection
    console.log('%cPRODUCTION MODE', 'color: red; font-size: 16px; font-weight: bold;');
    console.warn('Developer tools are disabled in production for security.');
    
    let devToolsOpen = false;
    let lastTime = performance.now();
    let checks = 0;
    
    // Multiple detection methods for production
    const detection = {
      // Method 1: Console detection
      consoleCheck() {
        const start = performance.now();
        console.log('%c', 'font-size: 1px;');
        console.clear();
        const end = performance.now();
        return (end - start) > 100;
      },
      
      // Method 2: Debugger detection
      debuggerCheck() {
        const start = Date.now();
        debugger;
        const end = Date.now();
        return (end - start) > 100;
      },
      
      // Method 3: Window size detection
      sizeCheck() {
        const threshold = 160;
        return window.outerHeight - window.innerHeight > threshold || 
               window.outerWidth - window.innerWidth > threshold;
      },
      
      // Method 4: Performance timing
      timingCheck() {
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;
        return delta > 100;
      }
    };
    
    // Combined detection function
    const checkDevTools = () => {
      checks++;
      let detected = false;
      
      try {
        // Run multiple checks
        if (detection.consoleCheck() || 
            detection.sizeCheck() || 
            (checks > 10 && detection.timingCheck())) {
          detected = true;
        }
        
        // Periodic debugger check (less frequent to avoid performance issues)
        if (checks % 50 === 0) {
          detected = detected || detection.debuggerCheck();
        }
        
        if (detected && !devToolsOpen) {
          devToolsOpen = true;
          setIsBlocked(true);
        }
      } catch (e) {
        // If any detection method fails, assume DevTools are open
        if (!devToolsOpen) {
          devToolsOpen = true;
          setIsBlocked(true);
        }
      }
    };
    
    // Set up detection intervals
    const rapidInterval = setInterval(checkDevTools, 500);
    const slowInterval = setInterval(checkDevTools, 2000);
    
    // Use devtools-detector library for additional detection
    let detectorStarted = false;
    try {
      addListener(detected => {
        if (detected && !devToolsOpen) {
          devToolsOpen = true;
          setIsBlocked(true);
        }
      });
      
      launch();
      detectorStarted = true;
    } catch (e) {
      console.warn('DevTools detector library failed to initialize');
    }
    
    // Disable right-click context menu in production
    const disableRightClick = (e) => {
      if (e.button === 2) {
        e.preventDefault();
        return false;
      }
    };
    
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    const disableKeyShortcuts = (e) => {
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) // Ctrl+U
      ) {
        e.preventDefault();
        return false;
      }
    };
    
    // Add event listeners for production
    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableKeyShortcuts);
    
    // Hide DevTools-related functions in production
    delete window.__enableDevtools__;
    delete window.__enableDevtoolsFor__;
    delete window.__disableDevtoolsBypass__;
    
    // Cleanup function
    return () => {
      clearInterval(rapidInterval);
      clearInterval(slowInterval);
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableKeyShortcuts);
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
  
  // Environment detection
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname === '0.0.0.0';
  
  // Check if protection should be bypassed
  const bypassActive = shouldBypassProtection() || isDevelopment || isLocalhost;
  
  // Handle URL-based bypass
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bypassKey = urlParams.get('debug');
    
    if (bypassKey === BYPASS_SECRET) {
      sessionStorage.setItem('devtools_bypass', 'true');
      // Clean URL to remove debug parameter
      const cleanUrl = window.location.protocol + '//' + 
                      window.location.host + 
                      window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);
  
  // Use enhanced DevTools protection
  const isProtectionBlocked = useDevToolsProtection();

  // API tool blocking (only in production without bypass)
  useEffect(() => {
    if (isProduction && !bypassActive && isApiTool()) {
      setBlock(true);
    }
  }, [bypassActive, isProduction]);

  // Enhanced DevTools detection for production
  useEffect(() => {
    if (isProduction && !bypassActive) {
      let devToolsInterval;
      
      const checkDevToolsAdvanced = () => {
        const start = performance.now();
        
        // Create a test object that will trigger toString if DevTools inspect it
        const testObj = {};
        testObj.toString = () => {
          setIsDevToolsOpen(true);
          return '';
        };
        
        // Log the object (triggers toString if DevTools are open)
        console.log('%c%s', 'color: transparent', testObj);
        
        const end = performance.now();
        
        // Check timing-based detection
        if (end - start > 100) {
          setIsDevToolsOpen(true);
        }
      };
      
      devToolsInterval = setInterval(checkDevToolsAdvanced, 1000);
      
      return () => {
        if (devToolsInterval) clearInterval(devToolsInterval);
      };
    }
  }, [bypassActive, isProduction]);

  useEffect(() => {
    if (sessionStorage.getItem("hiiCineSessionValidated") === "1") {
      setHasAccess(true);
      setComingFromVerification(true);
    }
    setIsChecking(false);
  }, []);

  // Block access if protection is triggered (only in production)
  if (isProduction && !bypassActive && (block || isDevToolsOpen || isProtectionBlocked)) {
    return <NotFoundPage />;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        {(isDevelopment || isLocalhost || bypassActive) && (
          <div className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded text-sm">
            🛠️ DevTools Enabled (Development)
          </div>
        )}
        {isProduction && !bypassActive && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded text-sm">
            🔒 Production Mode - DevTools Protected
          </div>
        )}
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
      {/* Environment indicator */}
      {(isDevelopment || isLocalhost || bypassActive) ? (
        <div className="fixed top-0 left-0 right-0 bg-green-600 text-white text-center py-2 text-sm z-50">
          🛠️ Development Mode - DevTools Enabled
        </div>
      ) : isProduction ? (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm z-50">
          🔒 Production Mode - Secure Access
        </div>
      ) : null}
      
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
