// Utility to test download link parsing
export const testLinkParsing = (linksString) => {
  if (!linksString || typeof linksString !== 'string') return [];
  
  console.log('🔍 Testing link parsing for:', linksString.substring(0, 200) + '...');
  
  try {
    const links = [];
    
    // Your format: "url,title,sizeurl,title,size..." (concatenated without separators)
    // Use regex to find all patterns: https://...?download,title,size
    const linkPattern = /(https:\/\/[^,]+\?download),([^,]+),(\d+(?:\.\d+)?(?:MB|GB|TB))/gi;
    
    let match;
    while ((match = linkPattern.exec(linksString)) !== null) {
      const [, url, title, size] = match;
      
      console.log('🎬 Found match:', { 
        url: url.substring(0, 50) + '...', 
        title: title.substring(0, 50) + '...', 
        size 
      });
      
      // Extract quality from title
      let quality = 'HD';
      const qualityMatch = title.match(/(480p|720p|1080p|4K|2160p)/i);
      if (qualityMatch) {
        quality = qualityMatch[1].toUpperCase();
        if (quality === '2160P') quality = '4K';
      }
      
      links.push({
        url: url.trim(),
        quality: quality,
        size: size.trim(),
        description: title.trim(),
        rawDatabaseDetails: title.trim()
      });
    }
    
    console.log('🎯 Final parsed links:', links);
    return links;
    
  } catch (error) {
    console.error('❌ Error parsing download links:', error);
    return [];
  }
};

// Test with your sample data
export const runTest = () => {
  const sampleData = "https://pixeldrain.dev/api/file/bkDDeRAM?download,What A Girl Wants (2003) {Hindi-English} 480p WEB-DL [350MB],350MBhttps://pixeldrain.dev/api/file/NL5VGst8?download,What A Girl Wants (2003) {Hindi-English} 720p WEB-DL x264 [1GB],1GBhttps://pixeldrain.dev/api/file/eCzi9wwU?download,What A Girl Wants (2003) {Hindi-English} 1080p WEB-DL x264 [2.2GB],2.2GB";
  
  console.log('🧪 Running test with sample data...');
  return testLinkParsing(sampleData);
};
