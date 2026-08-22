/**
 * Data Enricher — Deduplicates, validates, and enriches lead data
 *
 * Provides Indian phone number validation, junk keyword filtering,
 * category enrichment, and deduplication.
 */

// Junk keywords to filter out non-construction / irrelevant retail & repair shops
const JUNK_KEYWORDS = [
  'electrician',
  'repair',
  'service center',
  'mobile shop',
  'general store',
  'kirana',
  'hardware store'
];

/**
 * Validate and clean Indian phone numbers:
 * - Must be 10 digits starting with 6-9, or starts with +91/91 followed by 10 digits
 * - Strips non-digits and leading +91 / 91 / 0
 * - Rejects if result is not 10 digits starting with 6-9
 *
 * @param {string|number} phone - Raw phone number string/number
 * @returns {string} Cleaned 10-digit Indian phone number or empty string if invalid
 */
function cleanPhone(phone) {
  if (!phone) return '';

  // Strip all non-digit characters
  let digits = String(phone).replace(/\D/g, '');

  // Strip leading +91 / 91 if 12 digits total
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    // Strip leading trunk zero if 11 digits
    digits = digits.substring(1);
  }

  // Validate Indian mobile phone: exactly 10 digits starting with 6, 7, 8, or 9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return digits;
  }

  // Reject invalid phone numbers
  return '';
}

/**
 * Check if a lead matches junk keywords (case insensitive)
 * @param {Object} lead - Lead object
 * @returns {boolean} True if lead is considered junk
 */
function isJunkLead(lead) {
  if (!lead) return true;
  const name = String(lead.name || '').toLowerCase();
  const company = String(lead.company_name || '').toLowerCase();

  return JUNK_KEYWORDS.some(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return name.includes(lowerKeyword) || company.includes(lowerKeyword);
  });
}

/**
 * Validate email format
 * @param {string} email
 * @returns {string} Lowercase valid email or empty string
 */
function cleanEmail(email) {
  if (!email) return '';
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(email).trim()) ? String(email).trim().toLowerCase() : '';
}

/**
 * Extract city from address string
 * @param {string} address
 * @returns {string} Extracted city or empty string
 */
function extractCity(address) {
  if (!address) return '';

  const knownCities = [
    'Kolkata', 'Howrah', 'Hooghly', 'Salt Lake', 'New Town',
    'Dum Dum', 'Barrackpore', 'Serampore', 'Rishra', 'Uttarpara',
    'Bally', 'Liluah', 'Belur', 'Shibpur', 'Uluberia', 'Dankuni',
    'Chinsurah', 'Bandel', 'Kalyani', 'Barasat', 'Baruipur',
    'Rajarhat', 'Behala', 'Tollygunge', 'Ballygunge', 'Park Street',
    'Jadavpur', 'Garia', 'Sonarpur', 'Madhyamgram', 'Khardah',
    'Naihati', 'Titagarh', 'Panihati', 'Kamarhati', 'Belghoria',
    'Agarpara', 'Sodepur', 'Chandannagar', 'Burdwan', 'Asansol',
    'Durgapur', 'Siliguri', 'Haldia', 'Kharagpur'
  ];

  const lowerAddress = address.toLowerCase();
  for (const city of knownCities) {
    if (lowerAddress.includes(city.toLowerCase())) {
      return city;
    }
  }

  // Try to extract from comma-separated address
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    return parts[parts.length - 3];
  }

  return '';
}

/**
 * Determine lead category from search query or business types
 * @param {string} query
 * @param {string[]} types
 * @returns {string} Lead category
 */
function categorizeFromQuery(query, types = []) {
  const q = (query || '').toLowerCase();
  const t = (Array.isArray(types) ? types : []).map(s => String(s).toLowerCase()).join(' ');

  if (/flat|apartment|residential\s*complex|housing\s*society/.test(q) || /apartment|residential/.test(t)) {
    return 'flat-apartment';
  }
  if (/housing|villa|township|independent\s*house|row\s*house/.test(q)) {
    return 'housing';
  }
  if (/factory|industrial|manufactur|warehouse|godown|plant|workshop/.test(q) || /factory|industrial/.test(t)) {
    return 'industry';
  }
  if (/office|commercial|it\s*park|business\s*center|co.?working/.test(q) || /office/.test(t)) {
    return 'office';
  }
  if (/electrician|electrical\s*work|wiring|electrical\s*repair/.test(q) || /electrician/.test(t)) {
    return 'electrician-seeker';
  }
  if (/electrical\s*company|electrical\s*contractor|switchgear|cable|transformer/.test(q) || /electrical.*store|electrical.*supply/.test(t)) {
    return 'electrical-company';
  }

  return 'general';
}

/**
 * Deduplicate leads by phone number within the batch (and by normalized name for leads without phone)
 * @param {Array} leads
 * @returns {Array} Deduplicated leads
 */
function deduplicateLeads(leads) {
  if (!Array.isArray(leads)) return [];

  const seenPhones = new Set();
  const seenNames = new Set();
  const unique = [];

  for (const lead of leads) {
    const phoneKey = lead.phone ? lead.phone.trim() : '';
    const nameKey = lead.name ? lead.name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    if (phoneKey) {
      if (seenPhones.has(phoneKey)) {
        continue;
      }
      seenPhones.add(phoneKey);
    } else if (nameKey) {
      if (seenNames.has(nameKey)) {
        continue;
      }
      seenNames.add(nameKey);
    } else {
      continue;
    }

    unique.push(lead);
  }

  return unique;
}

/**
 * Enrich a single lead with cleaned/validated data
 * @param {Object} lead
 * @param {string} [category]
 * @returns {Object} Enriched lead object
 */
function enrichLead(lead, category) {
  const cleanedPhone = cleanPhone(lead.phone || lead.mobile || lead.contact);
  const cleanedEmail = cleanEmail(lead.email);
  const city = lead.city || extractCity(lead.address) || 'Kolkata';

  let assignedCategory = lead.category;
  if (category && typeof category === 'string' && category.trim()) {
    assignedCategory = category.trim();
  } else if (!assignedCategory) {
    assignedCategory = categorizeFromQuery(lead.name || '', lead.raw_data?.types || []);
  }

  return {
    ...lead,
    phone: cleanedPhone,
    email: cleanedEmail,
    city,
    category: assignedCategory || 'general',
    source: lead.source || 'manual',
    state: lead.state || 'West Bengal'
  };
}

/**
 * Process and enrich an array of leads:
 * - Filters out junk retail / repair names
 * - Validates Indian phone numbers
 * - Applies category, default source ('manual'), default state ('West Bengal')
 * - Deduplicates by phone number within the batch
 *
 * @param {Array} rawLeads - Raw scraped lead objects
 * @param {string} [category] - Optional category override
 * @returns {Array} Cleaned, enriched, and deduplicated lead objects
 */
function processLeads(rawLeads, category) {
  if (!Array.isArray(rawLeads)) return [];

  // 1. Filter out junk entries
  const filtered = rawLeads.filter(lead => !isJunkLead(lead));

  // 2. Enrich each lead with cleaned data, default source, state, category
  const enriched = filtered.map(lead => enrichLead(lead, category));

  // 3. Deduplicate by phone number within the batch
  const unique = deduplicateLeads(enriched);

  return unique;
}

module.exports = {
  cleanPhone,
  cleanEmail,
  extractCity,
  categorizeFromQuery,
  isJunkLead,
  deduplicateLeads,
  enrichLead,
  processLeads
};
