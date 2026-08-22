/**
 * Social Project Scraper — Social media project campaign & search query builder
 *
 * Builds search URLs across Facebook, Twitter/X, and social networks
 * for construction project launches, project campaigns, and electrical lead discovery.
 */

/**
 * Build search query keywords for social platforms
 * @param {string} query - User search query
 * @param {string} location - Target location/city
 * @param {string} category - Lead category
 * @returns {string[]} Array of query strings
 */
function buildSocialSearchQueries(query, location = 'Kolkata', category = 'flat-apartment') {
  if (query && query.trim()) {
    const q = query.trim();
    return [
      `${q} ${location}`,
      `new project ${q} ${location}`,
      `booking open ${q} ${location}`,
      `launch ${q} ${location}`
    ];
  }

  const queriesByCategory = {
    'flat-apartment': [
      `new flat project launch ${location}`,
      `under construction apartment booking ${location}`,
      `residential complex possession 2025 2026 ${location}`,
      `luxury flats booking open ${location}`
    ],
    'housing': [
      `villa township project launch ${location}`,
      `gated community plots villas ${location}`,
      `new housing scheme booking ${location}`,
      `independent duplex house project ${location}`
    ],
    'industry': [
      `industrial park setup ${location}`,
      `factory warehouse construction ${location}`,
      `manufacturing plant launch ${location}`,
      `industrial estate expansion ${location}`
    ],
    'office': [
      `commercial office space pre lease ${location}`,
      `new IT park office launch ${location}`,
      `business hub construction ${location}`,
      `commercial tower booking ${location}`
    ],
    'electrician-seeker': [
      `electrical contractor required project ${location}`,
      `need electrician building wiring ${location}`,
      `electrification work tender ${location}`,
      `substation wiring project ${location}`
    ],
    'electrical-company': [
      `electrical panel manufacturer supplier ${location}`,
      `HT LT panel installation ${location}`,
      `switchgear distribution dealer ${location}`,
      `transformer dealer supplier ${location}`
    ]
  };

  return queriesByCategory[category] || [
    `new construction project launch ${location}`,
    `real estate project booking open ${location}`,
    `commercial residential project ${location}`
  ];
}

/**
 * Search Social Media Project Leads
 * Builds targeted URLs for Facebook search and Twitter/X search.
 *
 * @param {string} query - Search query
 * @param {string} location - Target location
 * @param {string} category - Category filter
 * @returns {Promise<{results: Array, total: number, searchUrls: string[]}>}
 */
async function searchSocialProjectLeads(query, location = 'Kolkata', category = 'flat-apartment') {
  try {
    const loc = location || 'Kolkata';
    const cat = category || 'flat-apartment';
    const queries = buildSocialSearchQueries(query, loc, cat);
    const searchUrls = [];

    for (const q of queries) {
      const encoded = encodeURIComponent(q);
      // Facebook Search URLs
      searchUrls.push(`https://www.facebook.com/search/posts/?q=${encoded}`);
      searchUrls.push(`https://www.facebook.com/search/top?q=${encoded}`);

      // Twitter / X Search URLs
      searchUrls.push(`https://x.com/search?q=${encoded}&f=live`);
      searchUrls.push(`https://x.com/search?q=${encoded}`);
    }

    return {
      results: [],
      total: 0,
      searchUrls,
      queries,
      location: loc,
      category: cat,
      message: 'Social campaign search URLs built for Facebook and Twitter/X.'
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
  searchSocialProjectLeads,
  buildSocialSearchQueries
};
