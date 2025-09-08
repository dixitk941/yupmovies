// Server-side mobile device verification
// This provides additional server-side protection against desktop access

export default function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const forwarded = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // Mobile detection patterns
  const mobilePatterns = [
    /android/i,
    /webos/i,
    /iphone/i,
    /ipad/i,
    /ipod/i,
    /blackberry/i,
    /iemobile/i,
    /opera mini/i,
    /mobile/i,
    /tablet/i,
    /phone/i
  ];
  
  // Desktop patterns (more likely to be desktop)
  const desktopPatterns = [
    /windows nt/i,
    /macintosh/i,
    /linux x86_64/i,
    /x11/i,
    /chrome\/\d+\.\d+\.\d+\.\d+ safari/i, // Full Chrome (not mobile)
    /firefox\/\d+\.\d+/i, // Full Firefox
    /edge\/\d+\.\d+/i // Full Edge
  ];
  
  const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));
  const isDesktop = desktopPatterns.some(pattern => pattern.test(userAgent));
  
  // Additional checks
  const viewport = req.headers['viewport-width'] || '0';
  const screenWidth = parseInt(viewport);
  const isLargeScreen = screenWidth >= 768;
  
  // Check for common desktop browsers without mobile indicators
  const isLikelyDesktop = (
    !isMobile && 
    (isDesktop || isLargeScreen || userAgent.includes('Electron'))
  );
  
  // Production environment check
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL_ENV === 'production';
  
  const response = {
    allowed: !isProduction || !isLikelyDesktop,
    isMobile,
    isDesktop: isLikelyDesktop,
    isProduction,
    userAgent: userAgent.substring(0, 100), // Truncated for security
    timestamp: new Date().toISOString(),
    ip: forwarded
  };
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('X-Mobile-Check', response.allowed ? 'pass' : 'blocked');
  
  if (!response.allowed) {
    // Log blocked attempt (in production, you might want to use a logging service)
    console.log('🚫 Desktop access blocked:', {
      userAgent,
      ip: forwarded,
      timestamp: response.timestamp
    });
    
    return res.status(403).json({
      error: 'Desktop access denied',
      message: 'This application is mobile-only',
      code: 'DESKTOP_ACCESS_DENIED',
      ...response
    });
  }
  
  return res.status(200).json(response);
}
