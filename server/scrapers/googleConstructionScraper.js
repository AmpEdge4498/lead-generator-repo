/**
 * Google Construction Scraper — Web search query generator & result parser for construction projects
 *
 * Real lead data is primarily harvested via constructionHarvester & osmOverpass.
 * This module builds targeted Google search URLs for discovery and reference.
 */

/**
 * Build targeted Google search queries for construction projects
 * @param {string} query - User search query
 * @param {string} location - Target location/city
 * @param {string} category - Lead category
 * @returns {string[]} Array of search queries
 */
function buildConstructionSearchQueries(query, location = 'Kolkata', category = 'flat-apartment') {
  if (query && query.trim()) {
    const q = query.trim();
    return [
      `${q} ${location}`,
      `new construction ${q} ${location}`,
      `under construction ${q} ${location}`,
      `upcoming project ${q} ${location}`
    ];
  }

  const queriesByCategory = {
    'flat-apartment': [
      `new construction apartment ${location}`,
      `upcoming residential project ${location}`,
      `under construction flats ${location} 2025 2026`,
      `new residential complex builder ${location}`
    ],
    'housing': [
      `new housing project ${location}`,
      `residential township development ${location}`,
      `new villa project ${location}`,
      `gated community construction ${location}`
    ],
    'industry': [
      `new industrial project ${location}`,
      `factory under construction ${location}`,
      `new manufacturing plant ${location}`,
      `industrial park development ${location}`
    ],
    'office': [
      `commercial building construction ${location}`,
      `new IT park project ${location}`,
      `upcoming office complex ${location}`,
      `business center under construction ${location}`
    ],
    'electrician-seeker': [
      `electrical contractor needed construction ${location}`,
      `building electrification work ${location}`,
      `electrical installation project ${location}`
    ],
    'electrical-company': [
      `electrical construction company ${location}`,
      `switchgear supplier project ${location}`,
      `substation contractor ${location}`
    ]
  };

  return queriesByCategory[category] || [
    `new construction project ${location}`,
    `under construction commercial residential ${location}`,
    `upcoming infrastructure project ${location}`
  ];
}

/**
 * Search Google Construction Projects
 * Generates search URLs for logging and manual/automated discovery.
 * Returns empty results array since actual data comes from constructionHarvester and osmOverpass.
 *
 * @param {string} query - Search query
 * @param {string} location - Target location
 * @param {string} category - Category filter
 * @returns {Promise<{results: Array, total: number, searchUrls: string[]}>}
 */
async function searchGoogleConstructionProjects(query, location = 'Kolkata', category = 'flat-apartment') {
  try {
    const loc = location || 'Kolkata';
    const cat = category || 'flat-apartment';
    const queries = buildConstructionSearchQueries(query, loc, cat);
    const searchUrls = queries.map(q => `https://www.google.com/search?q=${encodeURIComponent(q)}`);

    return {
      results: [],
      total: 0,
      searchUrls,
      queries,
      location: loc,
      category: cat,
      message: 'Google construction search URLs built. Harvest data via constructionHarvester & osmOverpass.'
    };
  } catch (error) {
    return {
      results: [],
      total: 0,
      searchUrls: [],
      error: error.message
    };
  }
}

module.exports = {
  searchGoogleConstructionProjects,
  buildConstructionSearchQueries
};
