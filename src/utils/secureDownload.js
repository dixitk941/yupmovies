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

// Handle secure download - opens a new tab with proxy URL that immediately redirects
export const handleSecureDownload = (originalUrl, title, quality, size) => {
  if (!originalUrl) {
    console.error('No download URL provided');
    return false;
  }
  
  try {
    // For now, use a simple approach with a temporary redirect page
    // This creates a minimal delay before redirecting to hide the actual URL
    const redirectPage = createRedirectPage(originalUrl, title, quality);
    
    // Open the redirect page in a new tab
    const newWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.document.write(redirectPage);
      newWindow.document.close();
    } else {
      // Fallback if popup is blocked
      console.warn('Popup blocked, using direct download');
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
    
    return true;
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

// Alternative approach using iframe (even more hidden)
export const handleSecureDownloadIframe = (originalUrl, title, quality) => {
  if (!originalUrl) {
    console.error('No download URL provided');
    return false;
  }
  
  try {
    // Create a hidden iframe to trigger download
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = originalUrl;
    
    document.body.appendChild(iframe);
    
    // Remove iframe after download starts
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('Iframe download failed:', error);
    return false;
  }
};
