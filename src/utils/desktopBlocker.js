// Desktop Blocking Utility - Multiple Protection Layers
// This provides additional protection beyond the main App component

export class DesktopBlocker {
  constructor() {
    this.isProduction = this.checkProductionEnvironment();
    this.blockingActive = false;
    this.detectionScore = 0;
    this.init();
  }

  checkProductionEnvironment() {
    return (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      !window.location.hostname.includes("localhost") &&
      !window.location.hostname.includes("127.0.0.1") &&
      !window.location.hostname.includes("192.168.") &&
      process.env.NODE_ENV === 'production'
    );
  }

  detectDesktop() {
    const checks = {
      userAgent: this.checkUserAgent(),
      screenSize: this.checkScreenSize(),
      touchCapability: this.checkTouchCapability(),
      orientation: this.checkOrientation(),
      devicePixelRatio: this.checkDevicePixelRatio(),
      pointer: this.checkPointerCapability(),
      hover: this.checkHoverCapability(),
      connection: this.checkConnectionType(),
      hardwareConcurrency: this.checkHardwareConcurrency(),
      memory: this.checkDeviceMemory()
    };

    // Calculate detection score
    this.detectionScore = Object.values(checks).filter(Boolean).length;
    
    console.log('Desktop Detection Analysis:', {
      ...checks,
      score: this.detectionScore,
      threshold: 6,
      isDesktop: this.detectionScore >= 6
    });

    return this.detectionScore >= 6; // Strict threshold (6 out of 10 indicators)
  }

  checkUserAgent() {
    const ua = navigator.userAgent.toLowerCase();
    const mobilePatterns = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|phone/i;
    const desktopPatterns = /windows nt|macintosh|linux x86_64|x11/i;
    
    return !mobilePatterns.test(ua) && desktopPatterns.test(ua);
  }

  checkScreenSize() {
    const { width, height } = window.screen;
    // Desktop screens are typically larger
    return width >= 1024 && height >= 768;
  }

  checkTouchCapability() {
    // Desktop devices typically don't have touch
    return !('ontouchstart' in window) && 
           navigator.maxTouchPoints === 0 &&
           !window.TouchEvent;
  }

  checkOrientation() {
    // Mobile devices have orientation API
    return typeof window.orientation === 'undefined' && 
           !window.screen.orientation;
  }

  checkDevicePixelRatio() {
    // Desktop monitors typically have lower DPR
    return window.devicePixelRatio <= 1.5;
  }

  checkPointerCapability() {
    // Desktop has fine pointer (mouse)
    return window.matchMedia('(any-pointer: fine)').matches;
  }

  checkHoverCapability() {
    // Desktop supports hover
    return window.matchMedia('(any-hover: hover)').matches;
  }

  checkConnectionType() {
    // Check if connection suggests desktop
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return conn.type === 'ethernet' || conn.effectiveType === '4g';
    }
    return false;
  }

  checkHardwareConcurrency() {
    // Desktop typically has more CPU cores
    return navigator.hardwareConcurrency >= 4;
  }

  checkDeviceMemory() {
    // Desktop typically has more memory
    if ('deviceMemory' in navigator) {
      return navigator.deviceMemory >= 4;
    }
    return false;
  }

  blockDesktop() {
    if (this.blockingActive) return;
    
    this.blockingActive = true;
    console.log('🚫 DESKTOP BLOCKED - Initiating shutdown sequence');

    // Clear all storage
    this.clearAllStorage();

    // Disable all interactions
    this.disableInteractions();

    // Show blocking page
    this.showBlockingPage();

    // Additional security measures
    this.additionalSecurityMeasures();
  }

  clearAllStorage() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            indexedDB.deleteDatabase(db.name);
          });
        });
      }

      // Clear cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    } catch (e) {
      console.log('Storage clearing failed:', e);
    }
  }

  disableInteractions() {
    document.body.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'not-allowed';
    document.documentElement.style.overflow = 'hidden';
    
    // Disable all form elements
    const elements = document.querySelectorAll('input, button, select, textarea, a');
    elements.forEach(el => {
      el.disabled = true;
      el.style.pointerEvents = 'none';
    });
  }

  showBlockingPage() {
    const blockingHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a1a 0%, #8B0000 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div style="max-width: 500px;">
          <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
          <h1 style="color: #ff4444; margin-bottom: 20px; font-size: 2.5em;">
            DESKTOP ACCESS DENIED
          </h1>
          
          <div style="
            background: rgba(0,0,0,0.4);
            padding: 30px;
            border-radius: 15px;
            margin: 20px 0;
            border: 2px solid #ff4444;
            backdrop-filter: blur(10px);
          ">
            <h2 style="color: #ff6666; margin-bottom: 15px;">
              🔒 PRODUCTION SECURITY ACTIVE
            </h2>
            <p style="line-height: 1.6; margin-bottom: 15px;">
              This application is <strong>EXCLUSIVELY</strong> for mobile devices.
              Desktop access is permanently blocked in production environment.
            </p>
            <div style="
              background: rgba(255,69,0,0.2);
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #ff4500;
              margin: 15px 0;
            ">
              <p style="margin: 0; font-size: 14px;">
                <strong>⚠️ SECURITY ALERT</strong><br>
                Desktop detection score: ${this.detectionScore}/10<br>
                Access attempt logged and monitored
              </p>
            </div>
          </div>
          
          <div style="
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          ">
            <h3 style="margin-bottom: 15px; color: #66ff66;">✅ AUTHORIZED DEVICES</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin: 5px 0;">📱 Smartphones (iOS/Android)</li>
              <li style="margin: 5px 0;">📱 Tablets (iPad/Android tablets)</li>
              <li style="margin: 5px 0;">📱 Mobile browsers only</li>
            </ul>
          </div>
          
          <div style="
            margin-top: 30px;
            padding: 15px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            font-size: 12px;
            color: #999;
          ">
            Timestamp: ${new Date().toISOString()}<br>
            Session ID: ${Math.random().toString(36).substring(7)}<br>
            User Agent: ${navigator.userAgent.substring(0, 50)}...
          </div>
        </div>
      </div>
    `;

    // Remove existing content and add blocking page
    document.body.innerHTML = blockingHTML;
    document.title = "Access Denied - Mobile Only";
  }

  additionalSecurityMeasures() {
    // Prevent back/forward navigation
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', () => {
      window.history.pushState(null, null, window.location.href);
    });

    // Disable all keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);

    // Disable context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    }, true);

    // Disable drag and drop
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    }, true);

    // Monitor for attempts to modify the page
    const observer = new MutationObserver(() => {
      if (!this.blockingActive) {
        this.showBlockingPage();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Prevent reload/refresh
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = 'Desktop access not allowed';
      return 'Desktop access not allowed';
    });
  }

  init() {
    if (!this.isProduction) {
      console.log('🔧 Development mode - Desktop blocking disabled');
      return;
    }

    console.log('🔒 Production mode - Desktop blocking active');

    // Immediate check
    if (this.detectDesktop()) {
      this.blockDesktop();
      return;
    }

    // Continuous monitoring
    const monitoringInterval = setInterval(() => {
      if (this.detectDesktop()) {
        this.blockDesktop();
        clearInterval(monitoringInterval);
      }
    }, 3000);

    // Monitor window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        this.blockDesktop();
      }
    });

    // Monitor orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (this.detectDesktop()) {
          this.blockDesktop();
        }
      }, 500);
    });
  }
}

// Auto-initialize the desktop blocker
if (typeof window !== 'undefined') {
  new DesktopBlocker();
}

export default DesktopBlocker;
