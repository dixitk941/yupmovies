/**
 * Secure Download Utility
 * Prevents exposing direct download URLs by using a proxy/redirect approach
 */

// Simple base64 encoding for URL obfuscation (not encryption, just basic hiding)
const encodeUrl = (url) => {
  return btoa(encodeURIComponent(url)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// Create a secure download link that doesn't expose the real URL
export const createSecureDownloadLink = (originalUrl, title, quality) => {
  if (!originalUrl) return null;
  
  // Create a data object with download info
  const downloadData = {
    url: originalUrl,
    title: title || 'Download',
    quality: quality || 'Unknown',
    timestamp: Date.now()
  };
  
  // Encode the data
  const encodedData = encodeUrl(JSON.stringify(downloadData));
  
  // Create a local proxy URL that will handle the redirect
  const proxyUrl = `${window.location.origin}/download-proxy?data=${encodedData}`;
  
  return proxyUrl;
};

// Handle secure download - uses hidden iframe to prevent URL exposure and keep app active
export const handleSecureDownload = (originalUrl, title, quality, size) => {
  if (!originalUrl) {
    console.error('No download URL provided');
    return false;
  }
  
  try {
    // Use hidden iframe method to keep the main app tab active
    return handleSecureDownloadIframe(originalUrl, title, quality);
  } catch (error) {
    console.error('Secure download failed:', error);
    return false;
  }
};

// Create a simple redirect page that hides the URL
const createRedirectPage = (url, title, quality) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Downloading ${title || 'File'}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #1a1a1a;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .download-container {
          text-align: center;
          padding: 20px;
        }
        .spinner {
          border: 3px solid #333;
          border-top: 3px solid #fff;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="download-container">
        <h2>Preparing Download...</h2>
        <div class="spinner"></div>
        <p>Starting download: ${title || 'File'}</p>
        ${quality ? `<p>Quality: ${quality}</p>` : ''}
        <p><small>This window will close automatically</small></p>
      </div>
      <script>
        // Redirect after a short delay to prevent URL exposure
        setTimeout(() => {
          window.location.href = '${url}';
          // Close the window after redirect starts
          setTimeout(() => {
            window.close();
          }, 1000);
        }, 1500);
      </script>
    </body>
    </html>
  `;
};

// Alternative approach using iframe (keeps app in focus and hides URL completely)
export const handleSecureDownloadIframe = (originalUrl, title, quality) => {
  if (!originalUrl) {
    console.error('No download URL provided');
    return false;
  }
  
  try {
    // Create a hidden iframe to trigger download without affecting main app
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    
    // Set up iframe with download URL
    iframe.src = originalUrl;
    iframe.name = `download_${Date.now()}`;
    
    // Add iframe to document
    document.body.appendChild(iframe);
    
    // Log the download attempt (without exposing URL)
    console.log(`🔽 Secure download initiated: ${title || 'File'} ${quality ? `(${quality})` : ''}`);
    
    // Remove iframe after download starts (give it time to process)
    setTimeout(() => {
      try {
        if (iframe && iframe.parentNode) {
          document.body.removeChild(iframe);
          console.log('🗑️ Download iframe cleaned up');
        }
      } catch (cleanupError) {
        console.warn('Iframe cleanup warning:', cleanupError);
      }
    }, 8000); // 8 seconds should be enough for download to start
    
    return true;
  } catch (error) {
    console.error('Iframe download failed:', error);
    return false;
  }
};
