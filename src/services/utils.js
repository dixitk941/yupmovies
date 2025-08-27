// Helper function to extract and normalize categories
export const parseCategories = (categoriesString) => {
  if (!categoriesString) return [];
  return categoriesString
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
};

// Helper function to parse size to MB for comparison
export const parseSizeToMB = (sizeString) => {
  if (!sizeString) return 0;
  
  const size = parseFloat(sizeString);
  if (sizeString.toLowerCase().includes('gb')) {
    return size * 1024; // Convert GB to MB
  } else if (sizeString.toLowerCase().includes('mb')) {
    return size;
  } else if (sizeString.toLowerCase().includes('kb')) {
    return size / 1024; // Convert KB to MB
  }
  return 0;
};

// Helper function to extract language from name
export const extractLanguageFromName = (name) => {
  const languagePatterns = [
    'English with Subtitles',
    'Hindi Dubbed',
    'Tamil',
    'Telugu',
    'Malayalam',
    'Punjabi',
    'English',
    'Hindi'
  ];
  
  for (let pattern of languagePatterns) {
    if (name.includes(pattern)) {
      return pattern;
    }
  }
  return 'Unknown';
};

// Cache duration constant
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Technical categories for genre filtering
export const TECHNICAL_CATEGORIES = [
  '480p', '720p', '1080p', '4K', 'HD', 'Full HD',
  'Hindi Dubbed Movies', 'Telugu', 'Tamil', 'Malayalam',
  'English Movies', 'Bollywood', 'Hollywood',
  'WEB-DL', 'BluRay', 'DVDRip', 'CAMRip'
];

// Extract genres from categories
export const extractGenres = (categories) => {
  return categories.filter(cat => 
    !TECHNICAL_CATEGORIES.some(tech => cat.includes(tech)) &&
    !cat.match(/^\d{4}$/) // Exclude years
  );
};

// Extract release year from categories
export const extractReleaseYear = (categories) => {
  const years = categories.filter(cat => cat.match(/^\d{4}$/));
  return years.length > 0 ? parseInt(years[0]) : null;
};

// Extract languages from categories
export const extractLanguages = (categories) => {
  return categories.filter(cat => 
    ['Hindi', 'Telugu', 'Tamil', 'Malayalam', 'English', 'Punjabi', 'Gujarati'].some(lang =>
      cat.includes(lang)
    )
  );
};

// Extract qualities from categories
export const extractQualities = (categories) => {
  return categories.filter(cat => 
    ['480p', '720p', '1080p', '4K', 'HD', 'Full HD'].some(quality => 
      cat.includes(quality)
    )
  );
};

// Parse content metadata
export const parseContentMetadata = (content) => {
  if (!content) return {};
  
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return {
        description: parsed[0],
        duration: parsed[1],
        rating: parsed[2]
      };
    }
  } catch (error) {
    return { description: content };
  }
  
  return { description: content };
};
