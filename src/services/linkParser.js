import { parseDownloadLinks } from './directMovieService';

/**
 * This module provides a way to test the download link parsing functionality
 */

// Testing function for download link parsing
export const testParseDownloadLinks = (linksString) => {
  try {
    console.log('🧪 Testing link parsing with string:', linksString.substring(0, 100) + '...');
    const links = parseDownloadLinks(linksString);
    console.log('✅ Parsed links:', links);
    return {
      success: true,
      links,
      count: links.length
    };
  } catch (error) {
    console.error('❌ Error parsing links:', error);
    return {
      success: false,
      error: error.message,
      links: [],
      count: 0
    };
  }
};

// Example function to generate a sample download links string for testing
export const generateSampleLinks = () => {
  return `https://pixeldrain.dev/api/file/bkDDeRAM?download,What A Girl Wants (2003) {Hindi-English} 480p WEB-DL [350MB],350MBhttps://pixeldrain.dev/api/file/NL5VGst8?download,What A Girl Wants (2003) {Hindi-English} 720p WEB-DL [900MB],900MBhttps://pixeldrain.dev/api/file/bkDDdfgh?download,What A Girl Wants (2003) {Hindi-English} 1080p WEB-DL [1.8GB],1.8GB`;
};

// Parse links from real-world example
export const parseRealWorldExample = () => {
  const example = generateSampleLinks();
  return testParseDownloadLinks(example);
};
