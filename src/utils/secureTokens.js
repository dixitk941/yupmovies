import CryptoJS from 'crypto-js';

// Strong security key - in production, store this in environment variables
const SECURITY_KEY = "k8HJp2sD7F1qZx3W5vT9yN6bR4mE0cA"; // 32-character strong key

export const generateSecureToken = (id, quality) => {
  const timestamp = Date.now();
  
  // Create a more sophisticated hash using HMAC
  const hash = CryptoJS.HmacSHA256(
    id + quality + timestamp.toString(),
    SECURITY_KEY
  ).toString(CryptoJS.enc.Hex).substring(0, 16);
  
  const tokenData = {
    id,      // Resource ID
    q: quality,  // Quality level, shortened
    t: timestamp, // Timestamp to prevent reuse
    hash     // Security verification hash
  };
  
  // Convert to JSON and Base64 encode
  return btoa(JSON.stringify(tokenData));
};

// Function to verify a token (useful for debugging or server-side validation)
export const verifySecureToken = (token) => {
  try {
    // Decode the token
    const decoded = JSON.parse(atob(token));
    
    // Check if required fields exist
    if (!decoded.id || !decoded.q || !decoded.t || !decoded.hash) {
      return { valid: false, reason: "Invalid token format" };
    }
    
    // Check if token has expired (30 minute validity)
    const currentTime = Date.now();
    if (currentTime - decoded.t > 1800000) { // 30 minutes in milliseconds
      return { valid: false, reason: "Token expired" };
    }
    
    // Verify hash
    const expectedHash = CryptoJS.HmacSHA256(
      decoded.id + decoded.q + decoded.t.toString(),
      SECURITY_KEY
    ).toString(CryptoJS.enc.Hex).substring(0, 16);
    
    if (decoded.hash !== expectedHash) {
      return { valid: false, reason: "Invalid token signature" };
    }
    
    // Token is valid
    return { 
      valid: true, 
      data: {
        id: decoded.id,
        quality: decoded.q,
        timestamp: new Date(decoded.t)
      }
    };
  } catch (error) {
    return { valid: false, reason: "Token parsing error", error };
  }
};