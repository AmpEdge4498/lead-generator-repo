const fetch = require('node-fetch');

/**
 * Generic web scraper for extracting contact information
 * Uses server-side fetch for basic page scraping (no Puppeteer dependency)
 */

/**
 * Extract contact information from a webpage
 * @param {string} url - URL to scrape
 */
async function scrapeContactInfo(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const html = await response.text();
    return extractFromHtml(html, url);
  } catch (error) {
    console.error(`Scrape error for ${url}:`, error.message);
    return null;
  }
}

/**
 * Extract phones, emails, and business info from HTML content
 */
function extractFromHtml(html, sourceUrl) {
  const result = {
    phones: [],
    emails: [],
    addresses: [],
    companyName: '',
    website: sourceUrl
  };

  // Extract phone numbers (Indian format)
  const phonePatterns = [
    /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g,        // Mobile: +91 98765 43210
    /(?:\+91[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{6,8}/g,    // Landline: (033) 22345678
    /(?:Tel|Phone|Mobile|Call|Contact)[\s:]*([+\d\s()-]+)/gi
  ];

  for (const pattern of phonePatterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.replace(/[^\d+]/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 13) {
          result.phones.push(cleaned);
        }
      }
    }
  }

  // Extract emails
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = html.match(emailPattern);
  if (emailMatches) {
    result.emails = [...new Set(emailMatches)]
      .filter(email => !email.includes('example.com') && !email.includes('sentry.io'));
  }

  // Extract title/company name
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    result.companyName = titleMatch[1].replace(/\s*[-|–—].*$/, '').trim();
  }

  // Deduplicate
  result.phones = [...new Set(result.phones)];

  return result;
}

/**
 * Simulate searching JustDial-like directories
 * Returns structured data for demonstration
 */
async function searchDirectory(query, location) {
  // This is a placeholder for directory scraping
  // In production, you would use Puppeteer or a paid API
  return {
    results: [],
    total: 0,
    message: 'Directory scraping requires Puppeteer setup. Use Google Maps API for reliable results.'
  };
}

/**
 * Search WBRERA portal for registered real estate projects
 * Note: This is a simulation - actual WBRERA scraping would need Puppeteer
 */
async function searchWBRERA(location) {
  return {
    results: [],
    total: 0,
    message: 'WBRERA portal scraping requires Puppeteer. Visit https://rera.wb.gov.in for manual lookup.',
    portal_url: 'https://rera.wb.gov.in'
  };
}

module.exports = { scrapeContactInfo, extractFromHtml, searchDirectory, searchWBRERA };
