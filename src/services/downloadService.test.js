// Test file to verify optimized download functionality for Series and Anime
// This file can be used to test the download service integration

import { downloadService } from '../services/downloadService';

// Test data for series download
const testSeriesEpisode = {
  id: 'ep1',
  episodeNumber: 1,
  downloadLinks: [
    {
      url: 'https://example.com/series-episode-1-480p.mp4',
      quality: '480p',
      size: '350MB'
    },
    {
      url: 'https://example.com/series-episode-1-720p.mp4',
      quality: '720p',
      size: '900MB'
    },
    {
      url: 'https://example.com/series-episode-1-1080p.mp4',
      quality: '1080p',
      size: '1.8GB'
    }
  ]
};

// Test data for anime download
const testAnimeEpisode = {
  id: 'anime-ep1',
  episodeNumber: 1,
  downloadLinks: [
    {
      url: 'https://example.com/anime-episode-1-480p.mp4',
      quality: '480p',
      size: '280MB'
    },
    {
      url: 'https://example.com/anime-episode-1-720p.mp4',
      quality: '720p',
      size: '650MB'
    },
    {
      url: 'https://example.com/anime-episode-1-1080p.mp4',
      quality: '1080p',
      size: '1.2GB'
    }
  ]
};

// Test data for season package download
const testSeasonPackage = {
  seasonNumber: 1,
  url: 'https://example.com/season-1-complete.zip',
  quality: '1080p Complete',
  size: '15GB',
  name: 'Season 1 Complete Pack'
};

// Test functions
export const testSeriesDownload = async () => {
  try {
    console.log('🧪 Testing Series Episode Download...');
    
    const linkData = {
      url: testSeriesEpisode.downloadLinks[1].url, // 720p
      quality: testSeriesEpisode.downloadLinks[1].quality,
      size: testSeriesEpisode.downloadLinks[1].size
    };
    
    const title = `Test Series - Episode ${testSeriesEpisode.episodeNumber}`;
    
    const result = await downloadService.startFastDownload(linkData, title);
    
    console.log('✅ Series download test successful:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Series download test failed:', error);
    throw error;
  }
};

export const testAnimeDownload = async () => {
  try {
    console.log('🧪 Testing Anime Episode Download...');
    
    const linkData = {
      url: testAnimeEpisode.downloadLinks[2].url, // 1080p
      quality: testAnimeEpisode.downloadLinks[2].quality,
      size: testAnimeEpisode.downloadLinks[2].size
    };
    
    const title = `Test Anime - Episode ${testAnimeEpisode.episodeNumber}`;
    
    const result = await downloadService.startFastDownload(linkData, title);
    
    console.log('✅ Anime download test successful:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Anime download test failed:', error);
    throw error;
  }
};

export const testPackageDownload = async () => {
  try {
    console.log('🧪 Testing Season Package Download...');
    
    const linkData = {
      url: testSeasonPackage.url,
      quality: testSeasonPackage.quality,
      size: testSeasonPackage.size
    };
    
    const title = testSeasonPackage.name;
    
    const result = await downloadService.startFastDownload(linkData, title);
    
    console.log('✅ Package download test successful:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Package download test failed:', error);
    throw error;
  }
};

// Run all tests
export const runAllDownloadTests = async () => {
  console.log('🚀 Starting Download Service Tests...');
  
  const results = {
    series: null,
    anime: null,
    package: null,
    summary: {
      passed: 0,
      failed: 0,
      total: 3
    }
  };
  
  // Test series download
  try {
    results.series = await testSeriesDownload();
    results.summary.passed++;
  } catch (error) {
    results.series = { error: error.message };
    results.summary.failed++;
  }
  
  // Test anime download
  try {
    results.anime = await testAnimeDownload();
    results.summary.passed++;
  } catch (error) {
    results.anime = { error: error.message };
    results.summary.failed++;
  }
  
  // Test package download
  try {
    results.package = await testPackageDownload();
    results.summary.passed++;
  } catch (error) {
    results.package = { error: error.message };
    results.summary.failed++;
  }
  
  console.log('📊 Download Test Results:', results);
  
  if (results.summary.passed === results.summary.total) {
    console.log('🎉 All download tests passed!');
  } else {
    console.log(`⚠️ ${results.summary.failed}/${results.summary.total} tests failed`);
  }
  
  return results;
};

// Export test data for manual testing
export const testData = {
  seriesEpisode: testSeriesEpisode,
  animeEpisode: testAnimeEpisode,
  seasonPackage: testSeasonPackage
};
