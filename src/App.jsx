import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";

// Import your pages
import Home from "./pages/Home";
import ProtectedPage from "./pages/ProtectedPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import NotFoundPage from "./pages/NotFoundPage";
import { addListener, launch } from "devtools-detector";

// Import jsrsasign for JWT
import { KJUR, b64utoutf8 } from "jsrsasign";

const SECRET = "hiicine_demo_secret_2025"; // Must match your token GENERATOR

// Utility: detect API/bot tools
function isApiTool() {
  try {
    const userAgent = navigator.userAgent.toLowerCase();
    const apiTools = [
      "postman", "insomnia", "curl", "wget", "python-requests", "axios",
      "hoppscotch", "httpclient", "powershell", "httpie"
    ];
    const weirdProps = [
      "callPhantom","_phantom","phantom","__nightmare","selenium","webdriver",
      "__selenium_unwrapped","__webdriver_evaluate"
    ];
    for (const tool of apiTools) { if (userAgent.includes(tool)) return true; }
    for (const p of weirdProps) { if (window[p]) return true; }
    if (navigator.webdriver) return true;
    if (/headlesschrome/.test(userAgent)) return true;
    return false;
  } catch {
    return true;
  }
}

// Utility: detect localhost for DevTools exception
function isLocalhost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

// Token gating page
function EnterTokenPage({ setHasAccess }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        setError("Invalid token signature. This is not a HiiCine token.");
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
      // Valid!
      setHasAccess(true);
      sessionStorage.setItem("hiiCineSessionValidated", "1");
      navigate("/");
    } catch (err) {
      setError("Token format is invalid or corrupted.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212]">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded shadow-md w-full max-w-md"
      >
        <h1 className="text-3xl mb-4 text-center font-bold text-red-500">
          Enter Access Token
        </h1>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your access token here"
          className="w-full px-3 py-2 rounded bg-gray-900 text-white mb-3"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-4 py-2 rounded w-full font-bold hover:opacity-90"
        >
          {loading ? "Verifying..." : "Submit"}
        </button>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </form>
    </div>
  );
}

function App() {
  const [block, setBlock] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  // Block tools/bots immediately
  useEffect(() => {
    if (isApiTool()) setBlock(true);
  }, []);

  // Detect and block DevTools in production ONLY
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

  // Session access check
  useEffect(() => {
    if (sessionStorage.getItem("hiiCineSessionValidated") === "1") {
      setHasAccess(true);
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
    <Router>
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
              element={<EnterTokenPage setHasAccess={setHasAccess} />}
            />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
