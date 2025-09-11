// Fast Download Service - Optimized for quick downloads
// Handles direct downloads without loading files into memory

export class DownloadService {
  constructor() {
    this.downloadQueue = new Map();
    this.maxConcurrentDownloads = 3;
    this.timeout = 4000; // 4 seconds timeout
  }

  /**
   * Fast download using direct anchor approach
   * No file loading into memory - instant download start
   */
  async startFastDownload(linkData, movieTitle, onProgress = null) {
    if (!linkData?.url) {
      throw new Error('Invalid download link');
    }

    const downloadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Step 1: Quick URL validation (optional)
      const isValid = await this.validateDownloadUrl(linkData.url);
      if (!isValid) {
        console.warn('URL validation failed, proceeding anyway...');
      }
      
      // Step 2: Generate filename
      const filename = this.generateFilename(movieTitle, linkData.quality, linkData.url);

      // Step 3: Start fast download
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
      
      // Check if it's a network connectivity issue
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('Network connection lost - redirecting to hicine.app');
        setTimeout(() => {
          window.location.href = 'https://hicine.app';
        }, 2000);
        return false;
      }
      
      return true; // Assume valid if validation fails (other issues)
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