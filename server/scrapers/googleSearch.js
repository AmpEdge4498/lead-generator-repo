const fetch = require('node-fetch');

/**
 * Search Google Custom Search API for web results
 * Note: Google Custom Search API is being deprecated for new users.
 * This module uses a fallback approach with web search simulation.
 */

/**
 * Search Google via Custom Search API (if available)
 */
async function searchGoogle(options) {
  const { query, apiKey, cx, location, num = 10 } = options;

  // If API key and CX are configured, use the official API
  if (apiKey && cx) {
    try {
      const searchQuery = location ? `${query} ${location}` : query;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(searchQuery)}&num=${num}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.items) {
        return {
          results: data.items.map(item => parseSearchResult(item)),
          total: data.searchInformation?.totalResults || data.items.length
        };
      }
      return { results: [], total: 0 };
    } catch (error) {
      console.error('Google Custom Search error:', error);
      return { error: error.message, results: [] };
    }
  }

  // Fallback: return empty with instruction
  return {
    results: [],
    total: 0,
    message: 'Google Custom Search API key not configured. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX to .env'
  };
}

/**
 * Parse a Google search result into lead-like structure
 */
function parseSearchResult(item) {
  const lead = {
    name: item.title || '',
    company_name: '',
    address: '',
    phone: '',
    email: '',
    website: item.link || '',
    source: 'google-search',
    source_url: item.link || '',
    raw_data: {
      snippet: item.snippet,
      displayLink: item.displayLink
    }
  };

  // Try to extract phone from snippet
  if (item.snippet) {
    const phoneMatch = item.snippet.match(/(?:\+91[\s-]?)?(?:\d{5}[\s-]?\d{5}|\d{3,4}[\s-]?\d{6,7})/);
    if (phoneMatch) {
      lead.phone = phoneMatch[0].replace(/[\s-]/g, '');
    }

    // Try to extract email from snippet
    const emailMatch = item.snippet.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) {
      lead.email = emailMatch[0];
    }
  }

  // Extract company name from title
  const titleParts = item.title.split(/[-|–—]/);
  if (titleParts.length > 1) {
    lead.company_name = titleParts[0].trim();
  }

  return lead;
}

/**
 * Build search queries for different lead categories
 */
function buildSearchQueries(category, location) {
  const queries = {
    'flat-apartment': [
      `new apartment project ${location}`,
      `under construction flat ${location}`,
      `new residential complex ${location}`,
      `builder new project ${location} 2025 2026`
    ],
    'housing': [
      `new housing project ${location}`,
      `residential township ${location}`,
      `new villa project ${location}`,
      `housing development ${location}`
    ],
    'industry': [
      `new factory ${location}`,
      `new industrial setup ${location}`,
      `manufacturing plant ${location} new`,
      `industrial park ${location} upcoming`
    ],
    'office': [
      `new office space ${location}`,
      `commercial complex ${location} new`,
      `IT park ${location} upcoming`,
      `business center ${location} new`
    ],
    'electrician-seeker': [
      `electrician needed ${location}`,
      `electrical contractor ${location}`,
      `electrical work ${location}`,
      `best electrician ${location}`
    ],
    'electrical-company': [
      `electrical company ${location}`,
      `electrical supplier ${location}`,
      `switchgear dealer ${location}`,
      `electrical contractor ${location}`
    ]
  };

  return queries[category] || [`${category} ${location}`];
}

module.exports = { searchGoogle, buildSearchQueries };
