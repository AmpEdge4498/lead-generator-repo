/**
 * Data Enricher — Deduplicates, validates, and enriches lead data
 */

/**
 * Validate and clean phone number (Indian format)
 */
function cleanPhone(phone) {
  if (!phone) return '';

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Handle +91 prefix
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Validate Indian phone number (10 digits starting with 6-9 for mobile)
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return cleaned;
  }

  // Could be a landline (shorter)
  if (cleaned.length >= 7 && cleaned.length <= 11) {
    return cleaned;
  }

  return '';
}

/**
 * Validate email
 */
function cleanEmail(email) {
  if (!email) return '';
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) ? email.toLowerCase() : '';
}

/**
 * Extract city from address string
 */
function extractCity(address) {
  if (!address) return '';

  const knownCities = [
    'Kolkata', 'Howrah', 'Hooghly', 'Howrah', 'Salt Lake', 'New Town',
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
 * Determine lead category from search query or business type
 */
function categorizeFromQuery(query, types = []) {
  const q = query.toLowerCase();
  const t = types.map(s => s.toLowerCase()).join(' ');

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
 * Deduplicate leads by phone number and name similarity
 */
function deduplicateLeads(leads) {
  const seen = new Map();
  const unique = [];

  for (const lead of leads) {
    const phoneKey = lead.phone ? cleanPhone(lead.phone) : '';
    const nameKey = lead.name ? lead.name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    // Check by phone first (most reliable)
    if (phoneKey && seen.has(`phone:${phoneKey}`)) {
      continue;
    }

    // Check by exact name match
    if (nameKey && seen.has(`name:${nameKey}`)) {
      continue;
    }

    if (phoneKey) seen.set(`phone:${phoneKey}`, true);
    if (nameKey) seen.set(`name:${nameKey}`, true);

    unique.push(lead);
  }

  return unique;
}

/**
 * Enrich a lead with cleaned/validated data
 */
function enrichLead(lead, category) {
  return {
    ...lead,
    phone: cleanPhone(lead.phone),
    email: cleanEmail(lead.email),
    city: lead.city || extractCity(lead.address),
    category: category || categorizeFromQuery(lead.name || '', lead.raw_data?.types || []),
    state: lead.state || 'West Bengal'
  };
}

/**
 * Process and enrich an array of leads
 */
function processLeads(leads, category) {
  // Enrich each lead
  const enriched = leads.map(lead => enrichLead(lead, category));

  // Deduplicate
  const unique = deduplicateLeads(enriched);

  return unique;
}

module.exports = {
  cleanPhone,
  cleanEmail,
  extractCity,
  categorizeFromQuery,
  deduplicateLeads,
  enrichLead,
  processLeads
};
