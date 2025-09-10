// Backend API endpoint for secure downloads
// This file should be placed in your API routes folder

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, id } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing download token' });
  }

  try {
    // Decode and verify token
    const tokenData = verifyDownloadToken(token);
    
    if (!tokenData.valid) {
      return res.status(401).json({ error: tokenData.error || 'Invalid token' });
    }

    const { url, title, quality, size } = tokenData.data;

    // Log download attempt (optional)
    console.log(`Download initiated: ${title} - ${quality} (${size})`);

    // Set response headers for download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${title}_${quality}.mp4"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Download-ID', id);

    // Fetch the actual file and stream it
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity', // Prevent compression for streaming
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      throw new Error(`Source server error: ${response.status}`);
    }

    // Get file size if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the file directly to client
    const reader = response.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Write chunk to response
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    // End the response
    res.end();

  } catch (error) {
    console.error('Download proxy error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Download failed',
        message: error.message 
      });
    }
  }
}

/**
 * Verify download token
 */
function verifyDownloadToken(token) {
  try {
    // Decode the token
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const tokenData = JSON.parse(decoded);

    // Check expiry
    if (Date.now() > tokenData.expires) {
      return { valid: false, error: 'Token expired' };
    }

    // Additional validation can be added here
    if (!tokenData.url || !tokenData.title) {
      return { valid: false, error: 'Invalid token data' };
    }

    return { valid: true, data: tokenData };

  } catch (error) {
    return { valid: false, error: 'Token decode failed' };
  }
}

// Alternative implementation for Express.js
export const expressHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, id } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing download token' });
  }

  try {
    const tokenData = verifyDownloadToken(token);
    
    if (!tokenData.valid) {
      return res.status(401).json({ error: tokenData.error || 'Invalid token' });
    }

    const { url, title, quality } = tokenData.data;

    // Set download headers
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${title}_${quality}.mp4"`,
      'Cache-Control': 'no-cache',
      'X-Download-ID': id
    });

    // Use axios or fetch to get the file and pipe it
    const axios = require('axios');
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Pipe the stream directly to response
    response.data.pipe(res);

  } catch (error) {
    console.error('Download proxy error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Download failed',
        message: error.message 
      });
    }
  }
};
