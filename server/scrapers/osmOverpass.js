const fetch = require('node-fetch');
const { geocodeLocation } = require('./geocoder');

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

/**
 * Determine category and subcategory based on OSM tags and requested category
 * @param {Object} tags - OSM element tags
 * @param {string} requestedCategory - Category requested by user if any
 * @returns {{category: string, subcategory: string, projectStage: string, projectScale: string}}
 */
function classifyOsmElement(tags = {}, requestedCategory) {
  const building = tags.building ? tags.building.toLowerCase() : '';
  const landuse = tags.landuse ? tags.landuse.toLowerCase() : '';
  const shop = tags.shop ? tags.shop.toLowerCase() : '';
  const office = tags.office ? tags.office.toLowerCase() : '';
  const industrial = tags.industrial ? tags.industrial.toLowerCase() : '';

  let category = requestedCategory || 'flat-apartment';
  let subcategory = 'Construction & Real Estate';
  let projectStage = 'Under Construction';
  let projectScale = 'Medium';

  if (building === 'construction' || landuse === 'construction') {
    category = requestedCategory || 'flat-apartment';
    subcategory = 'Active Construction Site';
    projectStage = 'Under Construction / Civil Work';
    projectScale = 'Large Project';
  } else if (building === 'apartments' || building === 'residential' || landuse === 'residential') {
    category = requestedCategory || (building === 'apartments' ? 'flat-apartment' : 'housing');
    subcategory = building === 'apartments' ? 'Apartment Complex / Multistory' : 'Residential Housing Project';
    projectStage = tags['building:status'] === 'completed' ? 'Ready / Finishing' : 'Structural & Electrical Fit-out';
    projectScale = 'Medium-to-Large';
  } else if (building === 'commercial' || office || shop) {
    category = requestedCategory || 'office';
    subcategory = 'Commercial Complex / Business Hub';
    projectStage = 'Fit-out / Interior Wiring';
    projectScale = 'Medium Commercial';
  } else if (landuse === 'industrial' || industrial || building === 'industrial' || building === 'warehouse') {
    category = requestedCategory || 'industry';
    subcategory = 'Industrial Facility / Warehouse';
    projectStage = 'Industrial Construction / Operational';
    projectScale = 'Large Industrial';
  } else {
    subcategory = 'Building & Infrastructure';
    projectStage = 'Active Site';
    projectScale = 'Standard';
  }

  return { category, subcategory, projectStage, projectScale };
}

/**
 * Build human-readable address from OSM addr:* tags
 * @param {Object} tags
 * @param {string} fallbackLocation
 * @returns {string}
 */
function buildAddress(tags = {}, fallbackLocation = '') {
  if (tags['addr:full']) return tags['addr:full'];

  const parts = [];
  if (tags['addr:housenumber'] || tags['addr:housename']) {
    parts.push(tags['addr:housename'] || tags['addr:housenumber']);
  }
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter']) {
    parts.push(tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter']);
  }
  if (tags['addr:village'] || tags['addr:town'] || tags['addr:city']) {
    parts.push(tags['addr:village'] || tags['addr:town'] || tags['addr:city']);
  }
  if (tags['addr:district']) parts.push(tags['addr:district']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return fallbackLocation ? `${fallbackLocation}, West Bengal` : 'West Bengal, India';
}

/**
 * Generate sensible fallback name for unnamed OSM construction/building nodes
 * @param {Object} tags
 * @param {string} locationName
 * @returns {string}
 */
function generateFallbackName(tags = {}, locationName = 'Site') {
  const loc = locationName || 'Local';
  if (tags.building === 'construction' || tags.landuse === 'construction') {
    return `Active Construction Site (${loc})`;
  }
  if (tags.building === 'apartments') {
    return `Apartment Complex (${loc})`;
  }
  if (tags.building === 'residential' || tags.landuse === 'residential') {
    return `Residential Housing Project (${loc})`;
  }
  if (tags.building === 'commercial' || tags.office) {
    return `Commercial Building (${loc})`;
  }
  if (tags.landuse === 'industrial' || tags.building === 'industrial' || tags.building === 'warehouse') {
    return `Industrial Facility (${loc})`;
  }
  return `Construction & Development Project (${loc})`;
}

/**
 * Query OpenStreetMap Overpass API for construction, residential, commercial, and industrial sites
 * 
 * @param {Object} options
 * @param {string} [options.category] - Target lead category filter
 * @param {string} [options.location] - Location query string (e.g. "Sankrail", "Dankuni")
 * @param {number} [options.lat] - Latitude
 * @param {number} [options.lng] - Longitude
 * @param {number} [options.radius=5000] - Search radius in meters
 * @returns {Promise<{results: Array<Object>, total: number, center: {lat: number, lng: number, name: string}}>}
 */
async function searchOverpass(options = {}) {
  const {
    category,
    location,
    radius = 5000
  } = options;

  let searchLat = options.lat !== undefined && options.lat !== null ? parseFloat(options.lat) : null;
  let searchLng = options.lng !== undefined && options.lng !== null ? parseFloat(options.lng) : null;
  let locationName = location || '';

  // Geocode location if coordinates are not supplied
  if (searchLat === null || searchLng === null || isNaN(searchLat) || isNaN(searchLng)) {
    const geo = await geocodeLocation(location || 'Howrah');
    searchLat = geo.lat;
    searchLng = geo.lng;
    if (!locationName) locationName = geo.name;
  }

  // Build Overpass QL Query
  const overpassQuery = `
[out:json][timeout:6];
(
  nwr["building"="construction"](around:${radius},${searchLat},${searchLng});
  nwr["building"="apartments"](around:${radius},${searchLat},${searchLng});
  nwr["building"="residential"](around:${radius},${searchLat},${searchLng});
  nwr["building"="commercial"](around:${radius},${searchLat},${searchLng});
  nwr["landuse"="construction"](around:${radius},${searchLat},${searchLng});
  nwr["landuse"="residential"](around:${radius},${searchLat},${searchLng});
  nwr["landuse"="industrial"](around:${radius},${searchLat},${searchLng});
);
out center 30;
`.trim();

  let data = null;
  let lastError = null;

  // Try each Overpass endpoint with 6s timeout
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'AmpEdge-Lead-Generator/1.0 (contact@ampedge.in)'
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        timeout: 6000,
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (response.ok) {
        data = await response.json();
        if (data && Array.isArray(data.elements)) {
          break; // Success, stop trying further endpoints
        }
      } else {
        lastError = new Error(`Overpass API endpoint ${endpoint} returned status ${response.status}`);
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Overpass] Failed on endpoint ${endpoint}:`, err.message);
    }
  }

  if (!data || !Array.isArray(data.elements)) {
    console.error('[Overpass] All endpoints failed or returned invalid data:', lastError?.message);
    return {
      results: [],
      total: 0,
      center: { lat: searchLat, lng: searchLng, name: locationName }
    };
  }

  const leads = [];
  const seenIds = new Set();

  for (const element of data.elements) {
    if (!element || seenIds.has(element.id)) continue;
    seenIds.add(element.id);

    const tags = element.tags || {};

    // Extract coordinate (lat, lon from node, or center from way/relation)
    let itemLat = null;
    let itemLng = null;

    if (element.lat !== undefined && element.lon !== undefined) {
      itemLat = parseFloat(element.lat);
      itemLng = parseFloat(element.lon);
    } else if (element.center && element.center.lat !== undefined && element.center.lon !== undefined) {
      itemLat = parseFloat(element.center.lat);
      itemLng = parseFloat(element.center.lon);
    } else {
      itemLat = searchLat;
      itemLng = searchLng;
    }

    // Extract Name
    const rawName = tags.name || tags['name:en'] || tags.operator || tags.brand || tags.description || '';
    const leadName = rawName || generateFallbackName(tags, locationName);

    // Extract Company / Operator
    const companyName = tags.operator || tags['operator:en'] || tags.brand || tags.developer || tags.builder || tags.contractor || (rawName ? rawName : '');

    // Contact info
    const phone = tags.phone || tags['contact:phone'] || tags['phone:mobile'] || tags['contact:mobile'] || '';
    const email = tags.email || tags['contact:email'] || '';

    // Address & City
    const address = buildAddress(tags, locationName);
    const city = tags['addr:city'] || tags['addr:district'] || tags['addr:suburb'] || tags['addr:village'] || locationName || 'Howrah';
    const state = tags['addr:state'] || 'West Bengal';

    // Pincode
    let pincode = tags['addr:postcode'] || '';
    if (!pincode && address) {
      const pinMatch = address.match(/\b\d{6}\b/);
      if (pinMatch) pincode = pinMatch[0];
    }

    // Classification
    const { category: resolvedCat, subcategory, projectStage, projectScale } = classifyOsmElement(tags, category);

    // Source links
    const osmType = element.type || 'node';
    const sourceUrl = `https://www.openstreetmap.org/${osmType}/${element.id}`;
    const googleBusinessUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${leadName} ${city} West Bengal`)}`;

    // Rating
    const rating = tags.stars ? parseFloat(tags.stars) : (tags.rating ? parseFloat(tags.rating) : null);

    // Notes
    const tagList = Object.keys(tags).slice(0, 6).map(k => `${k}=${tags[k]}`).join(', ');
    const notes = `OSM ${osmType.toUpperCase()} #${element.id} | ${projectStage} | ${projectScale}${tagList ? ` | Tags: [${tagList}]` : ''}`;

    const lead = {
      name: leadName,
      company_name: companyName,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      lat: itemLat,
      lng: itemLng,
      category: resolvedCat,
      subcategory,
      project_stage: projectStage,
      project_scale: projectScale,
      source: 'google-maps',
      source_url: sourceUrl,
      google_business_url: googleBusinessUrl,
      rating,
      notes
    };

    leads.push(lead);
  }

  return {
    results: leads,
    total: leads.length,
    center: {
      lat: searchLat,
      lng: searchLng,
      name: locationName
    }
  };
}

module.exports = {
  OVERPASS_ENDPOINTS,
  searchOverpass
};
