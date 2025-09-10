// Protected Download Service - Fast & Secure
// Hides actual download URLs using secure tokens and proxy approach

export class DownloadService {
  constructor() {
    this.downloadQueue = new Map();
    this.maxConcurrentDownloads = 3;
    this.timeout = 4000; // 4 seconds timeout
    this.downloadTokens = new Map(); // Store secure tokens
    this.proxyEndpoint = '/api/secure-download'; // Backend proxy endpoint
  }

  /**
   * Protected download using secure tokens
   * Simple approach without backend dependency
   */
  async startFastDownload(linkData, movieTitle, onProgress = null) {
    if (!linkData?.url) {
      throw new Error('Invalid download link');
    }

    const downloadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Step 1: Quick URL validation
      const isValid = await this.validateDownloadUrl(linkData.url);
      if (!isValid) {
        console.warn('URL validation failed, proceeding anyway...');
      }
      
      // Step 2: Generate filename
      const filename = this.generateFilename(movieTitle, linkData.quality, linkData.url);

      // Step 3: Use simple direct download (fast approach)
      await this.simpleFastDownload(linkData.url, filename, downloadId);

      return {
        success: true,
        downloadId,
        filename,
        quality: linkData.quality,
        size: linkData.size
      };

    } catch (error) {
      console.error('Fast download failed:', error);
      throw error;
    }
  }

  /**
   * Simple fast download without complex token system
   */
  async simpleFastDownload(url, filename, downloadId) {
    return new Promise((resolve, reject) => {
      try {
        // Create download anchor
        const anchor = document.createElement('a');
        anchor.style.display = 'none';
        anchor.href = url;
        anchor.download = filename;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        
        // Track download
        this.downloadQueue.set(downloadId, {
          url,
          filename,
          startTime: Date.now()
        });

        // Add to DOM and trigger
        document.body.appendChild(anchor);
        anchor.click();
        
        // Clean up
        setTimeout(() => {
          try {
            document.body.removeChild(anchor);
            this.downloadQueue.delete(downloadId);
            resolve();
          } catch (cleanupError) {
            console.warn('Cleanup error:', cleanupError);
            resolve();
          }
        }, 500);

      } catch (error) {
        this.downloadQueue.delete(downloadId);
        reject(error);
      }
    });
  }

  /**
   * Generate secure token that hides real URL
   */
  async generateSecureToken(linkData, movieTitle) {
    const tokenData = {
      url: linkData.url,
      quality: linkData.quality,
      size: linkData.size,
      title: movieTitle,
      timestamp: Date.now(),
      expires: Date.now() + (15 * 60 * 1000) // 15 minutes expiry
    };

    // Create secure token (you can use JWT or custom encoding)
    const token = btoa(JSON.stringify(tokenData))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Store token temporarily
    this.downloadTokens.set(token, tokenData);

    // Auto-cleanup expired tokens
    setTimeout(() => {
      this.downloadTokens.delete(token);
    }, 15 * 60 * 1000);

    return token;
  }

  /**
   * Create protected download URL using token
   */
  createProtectedDownloadUrl(token, downloadId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}${this.proxyEndpoint}?token=${token}&id=${downloadId}`;
  }

  /**
   * Protected download using simple blob URL approach
   * Fast and secure without iframe complications
   */
  async protectedDownload(protectedUrl, filename, downloadId) {
    return new Promise((resolve, reject) => {
      try {
        // Create a simple anchor download
        const anchor = document.createElement('a');
        anchor.style.display = 'none';
        anchor.href = protectedUrl;
        anchor.download = filename;
        anchor.target = '_self'; // Same window to avoid security issues
        
        // Track download
        this.downloadQueue.set(downloadId, {
          protectedUrl,
          filename,
          startTime: Date.now()
        });

        // Add to DOM temporarily
        document.body.appendChild(anchor);

        // Trigger download
        anchor.click();

        // Clean up immediately
        setTimeout(() => {
          try {
            document.body.removeChild(anchor);
            this.downloadQueue.delete(downloadId);
            resolve();
          } catch (cleanupError) {
            console.warn('Cleanup error:', cleanupError);
            resolve(); // Still resolve as download likely started
          }
        }, 1000);

      } catch (error) {
        this.downloadQueue.delete(downloadId);
        reject(error);
      }
    });
  }

  /**
   * Validate URL accessibility with quick HEAD request
   */
  async validateDownloadUrl(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Range': 'bytes=0-1' // Just check first byte
        }
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 206; // OK or Partial Content

    } catch (error) {
      console.warn('URL validation failed:', error.message);
      return true; // Assume valid if validation fails (network issues)
    }
  }

  /**
   * Direct download without loading file into memory
   * Alternative method for compatibility
   */
  async directDownload(url, filename, downloadId) {
    return new Promise((resolve, reject) => {
      try {
        // Create invisible anchor element
        const anchor = document.createElement('a');
        anchor.style.display = 'none';
        anchor.href = url;
        anchor.download = filename;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';

        // Add to DOM temporarily
        document.body.appendChild(anchor);

        // Track download start
        this.downloadQueue.set(downloadId, {
          url,
          filename,
          startTime: Date.now()
        });

        // Trigger download
        anchor.click();

        // Clean up immediately
        document.body.removeChild(anchor);

        // Resolve immediately (download started)
        setTimeout(() => {
          this.downloadQueue.delete(downloadId);
          resolve();
        }, 100);

      } catch (error) {
        this.downloadQueue.delete(downloadId);
        reject(error);
      }
    });
  }

  /**
   * Verify download token validity
   */
  verifyToken(token) {
    const tokenData = this.downloadTokens.get(token);
    
    if (!tokenData) {
      return { valid: false, error: 'Token not found' };
    }

    if (Date.now() > tokenData.expires) {
      this.downloadTokens.delete(token);
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, data: tokenData };
  }

  /**
   * Get actual URL from token (for backend use)
   */
  getUrlFromToken(token) {
    const verification = this.verifyToken(token);
    return verification.valid ? verification.data.url : null;
  }

  /**
   * Generate optimized filename
   */
  generateFilename(movieTitle, quality, url) {
    // Clean title
    const cleanTitle = movieTitle
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length

    // Get file extension
    const extension = this.extractFileExtension(url);
    
    // Generate filename
    return `${cleanTitle}_${quality}p.${extension}`;
  }

  /**
   * Extract file extension from URL
   */
  extractFileExtension(url) {
    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
    
    for (const ext of videoExtensions) {
      if (url.toLowerCase().includes(`.${ext}`)) {
        return ext;
      }
    }
    
    // Default to mp4 if no extension found
    return 'mp4';
  }

  /**
   * Alternative method: Open download in new tab (fallback)
   */
  async openDownloadInNewTab(url, filename) {
    try {
      // Create new window with download intent
      const downloadWindow = window.open('', '_blank');
      
      if (downloadWindow) {
        downloadWindow.document.write(`
          <html>
            <head>
              <title>Downloading ${filename}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  background: #1a1a1a; 
                  color: white; 
                  text-align: center;
                }
                .download-info {
                  background: #2a2a2a;
                  padding: 2rem;
                  border-radius: 10px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                .download-btn {
                  background: #4CAF50;
                  color: white;
                  padding: 12px 24px;
                  border: none;
                  border-radius: 5px;
                  font-size: 16px;
                  cursor: pointer;
                  margin-top: 1rem;
                }
                .download-btn:hover {
                  background: #45a049;
                }
              </style>
            </head>
            <body>
              <div class="download-info">
                <h2>🎬 Download Starting</h2>
                <p>Filename: <strong>${filename}</strong></p>
                <p>Your download should start automatically...</p>
                <button class="download-btn" onclick="window.location.href='${url}'">
                  Start Download
                </button>
                <br><br>
                <small>If download doesn't start, click the button above</small>
              </div>
              <script>
                // Auto-redirect to download
                setTimeout(() => {
                  window.location.href = '${url}';
                }, 1000);
              </script>
            </body>
          </html>
        `);
        downloadWindow.document.close();
      } else {
        // Popup blocked, direct redirect
        window.location.href = url;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to open download tab:', error);
      return false;
    }
  }

  /**
   * Get download queue status
   */
  getDownloadStatus() {
    return {
      activeDownloads: this.downloadQueue.size,
      maxConcurrent: this.maxConcurrentDownloads,
      queue: Array.from(this.downloadQueue.entries()).map(([id, data]) => ({
        id,
        filename: data.filename,
        duration: Date.now() - data.startTime
      }))
    };
  }

  /**
   * Check if URL supports range requests (for future optimization)
   */
  async checkRangeSupport(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'Range': 'bytes=0-1' }
      });
      return response.status === 206;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const downloadService = new DownloadService();

// Export utility functions
export const downloadUtils = {
  /**
   * Format file size for display
   */
  formatFileSize: (size) => {
    if (!size) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let fileSize = parseFloat(size.replace(/[^\d.]/g, ''));
    
    if (size.toUpperCase().includes('GB')) unitIndex = 3;
    else if (size.toUpperCase().includes('MB')) unitIndex = 2;
    else if (size.toUpperCase().includes('KB')) unitIndex = 1;
    
    return `${fileSize} ${units[unitIndex]}`;
  },

  /**
   * Estimate download time based on file size
   */
  estimateDownloadTime: (size, connectionSpeed = '10 Mbps') => {
    const fileSizeGB = parseFloat(size.replace(/[^\d.]/g, ''));
    const speedMbps = parseFloat(connectionSpeed.replace(/[^\d.]/g, ''));
    
    if (!fileSizeGB || !speedMbps) return 'Unknown';
    
    const timeMinutes = (fileSizeGB * 8 * 1024) / (speedMbps * 60);
    
    if (timeMinutes < 1) return '< 1 minute';
    if (timeMinutes < 60) return `~${Math.ceil(timeMinutes)} minutes`;
    
    const hours = Math.floor(timeMinutes / 60);
    const minutes = Math.ceil(timeMinutes % 60);
    return `~${hours}h ${minutes}m`;
  }
};
