const fetch = require('node-fetch');

/**
 * West Bengal Micro-Locality Coordinate Database
 * Comprehensive mapping of 60+ micro-localities, industrial zones, suburbs, and towns.
 */
const LOCALITY_COORDINATES = {
  // HOWRAH DISTRICT
  'sankrail': { lat: 22.5694, lng: 88.2435, name: 'Sankrail', type: 'industrial_town' },
  'andul': { lat: 22.5850, lng: 88.2390, name: 'Andul', type: 'town' },
  'mourigram': { lat: 22.5930, lng: 88.2580, name: 'Mourigram', type: 'industrial_suburb' },
  'domjur': { lat: 22.6410, lng: 88.2200, name: 'Domjur', type: 'town' },
  'santragachi': { lat: 22.5830, lng: 88.2830, name: 'Santragachi', type: 'suburb' },
  'salap': { lat: 22.6150, lng: 88.2750, name: 'Salap', type: 'village_town' },
  'jagacha': { lat: 22.5890, lng: 88.2980, name: 'Jagacha', type: 'suburb' },
  'shibpur': { lat: 22.5650, lng: 88.3200, name: 'Shibpur', type: 'city_urban' },
  'liluah': { lat: 22.6250, lng: 88.3370, name: 'Liluah', type: 'industrial_town' },
  'belur': { lat: 22.6320, lng: 88.3490, name: 'Belur', type: 'town' },
  'bally': { lat: 22.6500, lng: 88.3450, name: 'Bally', type: 'city' },
  'uluberia': { lat: 22.4700, lng: 88.1150, name: 'Uluberia', type: 'sub-district_town' },
  'panchla': { lat: 22.5400, lng: 88.1500, name: 'Panchla', type: 'town' },
  'bagnan': { lat: 22.4680, lng: 87.9700, name: 'Bagnan', type: 'town' },
  'amta': { lat: 22.5800, lng: 88.0100, name: 'Amta', type: 'town' },
  'howrah': { lat: 22.5850, lng: 88.2600, name: 'Howrah Central', type: 'city' },
  'dasnagar': { lat: 22.5970, lng: 88.3040, name: 'Dasnagar', type: 'industrial_suburb' },
  'kadamtala': { lat: 22.5810, lng: 88.3180, name: 'Kadamtala', type: 'suburb' },
  'ramrajatala': { lat: 22.5820, lng: 88.2990, name: 'Ramrajatala', type: 'suburb' },
  'botanical garden': { lat: 22.5560, lng: 88.3240, name: 'Botanical Garden', type: 'urban' },
  'botanicalgarden': { lat: 22.5560, lng: 88.3240, name: 'Botanical Garden', type: 'urban' },
  'salkia': { lat: 22.6040, lng: 88.3490, name: 'Salkia', type: 'suburb' },
  'ghusuri': { lat: 22.6160, lng: 88.3510, name: 'Ghusuri', type: 'suburb' },
  'dhulaghar': { lat: 22.5550, lng: 88.1920, name: 'Dhulaghar', type: 'industrial_hub' },
  'dhulagarh': { lat: 22.5550, lng: 88.1920, name: 'Dhulagarh', type: 'industrial_hub' },
  'alampur': { lat: 22.5530, lng: 88.2140, name: 'Alampur', type: 'industrial_area' },
  'nibra': { lat: 22.6130, lng: 88.2660, name: 'Nibra', type: 'town' },
  'chamrail': { lat: 22.6370, lng: 88.2970, name: 'Chamrail', type: 'village' },
  'bauria': { lat: 22.4930, lng: 88.1970, name: 'Bauria', type: 'industrial_town' },

  // HOOGHLY DISTRICT
  'dankuni': { lat: 22.6776, lng: 88.2758, name: 'Dankuni', type: 'industrial_town' },
  'uttarpara': { lat: 22.6610, lng: 88.3440, name: 'Uttarpara', type: 'town' },
  'rishra': { lat: 22.7090, lng: 88.3380, name: 'Rishra', type: 'industrial_town' },
  'serampore': { lat: 22.7520, lng: 88.3420, name: 'Serampore', type: 'city' },
  'chandannagar': { lat: 22.8670, lng: 88.3630, name: 'Chandannagar', type: 'city' },
  'chinsurah': { lat: 22.9000, lng: 88.3900, name: 'Chinsurah', type: 'city' },
  'chinsura': { lat: 22.9000, lng: 88.3900, name: 'Chinsurah', type: 'city' },
  'singur': { lat: 22.8100, lng: 88.2300, name: 'Singur', type: 'town' },
  'konnagar': { lat: 22.6980, lng: 88.3510, name: 'Konnagar', type: 'town' },
  'baidyabati': { lat: 22.7930, lng: 88.3220, name: 'Baidyabati', type: 'town' },
  'bhadreswar': { lat: 22.8250, lng: 88.3510, name: 'Bhadreswar', type: 'town' },
  'bandel': { lat: 22.9200, lng: 88.3750, name: 'Bandel', type: 'town' },
  'tarakeswar': { lat: 22.8900, lng: 88.0200, name: 'Tarakeswar', type: 'town' },
  'arambagh': { lat: 22.8800, lng: 87.7800, name: 'Arambagh', type: 'sub-district_town' },
  'hooghly': { lat: 22.9000, lng: 88.3900, name: 'Hooghly', type: 'district_center' },

  // KOLKATA & SUBURBS
  'newtown': { lat: 22.5850, lng: 88.4600, name: 'New Town', type: 'planned_city' },
  'new town': { lat: 22.5850, lng: 88.4600, name: 'New Town', type: 'planned_city' },
  'rajarhat': { lat: 22.6180, lng: 88.4480, name: 'Rajarhat', type: 'suburb' },
  'saltlake': { lat: 22.5800, lng: 88.4200, name: 'Salt Lake', type: 'city_urban' },
  'salt lake': { lat: 22.5800, lng: 88.4200, name: 'Salt Lake', type: 'city_urban' },
  'joka': { lat: 22.4550, lng: 88.3050, name: 'Joka', type: 'suburb' },
  'behala': { lat: 22.4980, lng: 88.3180, name: 'Behala', type: 'suburb' },
  'garia': { lat: 22.4640, lng: 88.3870, name: 'Garia', type: 'suburb' },
  'sonarpur': { lat: 22.4400, lng: 88.4200, name: 'Sonarpur', type: 'town' },
  'barasat': { lat: 22.7200, lng: 88.4800, name: 'Barasat', type: 'city' },
  'madhyamgram': { lat: 22.7000, lng: 88.4500, name: 'Madhyamgram', type: 'town' },
  'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata', type: 'metro_city' },
  'dumdum': { lat: 22.6420, lng: 88.4280, name: 'Dum Dum', type: 'suburb' },
  'dum dum': { lat: 22.6420, lng: 88.4280, name: 'Dum Dum', type: 'suburb' },
  'barrackpore': { lat: 22.7660, lng: 88.3760, name: 'Barrackpore', type: 'city' },
  'tollygunge': { lat: 22.4970, lng: 88.3470, name: 'Tollygunge', type: 'suburb' },
  'alipore': { lat: 22.5310, lng: 88.3280, name: 'Alipore', type: 'urban' },
  'ballygunge': { lat: 22.5280, lng: 88.3650, name: 'Ballygunge', type: 'urban' },
  'kasba': { lat: 22.5180, lng: 88.3900, name: 'Kasba', type: 'suburb' },
  'jadavpur': { lat: 22.4990, lng: 88.3710, name: 'Jadavpur', type: 'suburb' },
  'park street': { lat: 22.5510, lng: 88.3533, name: 'Park Street', type: 'commercial_center' },

  // INDUSTRIAL & REGIONAL WEST BENGAL
  'durgapur': { lat: 23.5204, lng: 87.3119, name: 'Durgapur', type: 'industrial_hub' },
  'asansol': { lat: 23.6889, lng: 86.9661, name: 'Asansol', type: 'industrial_city' },
  'haldia': { lat: 22.0667, lng: 88.0698, name: 'Haldia', type: 'port_industrial' },
  'kharagpur': { lat: 22.3400, lng: 87.3200, name: 'Kharagpur', type: 'industrial_hub' },
  'siliguri': { lat: 26.7271, lng: 88.3953, name: 'Siliguri', type: 'city' },
  'bardhaman': { lat: 23.2324, lng: 87.8615, name: 'Bardhaman', type: 'city' },
  'burdwan': { lat: 23.2324, lng: 87.8615, name: 'Bardhaman', type: 'city' },
  'raniganj': { lat: 23.6200, lng: 87.1300, name: 'Raniganj', type: 'industrial_town' },
  'kalyani': { lat: 22.9750, lng: 88.4340, name: 'Kalyani', type: 'industrial_town' },
  'medinipur': { lat: 22.4250, lng: 87.3200, name: 'Medinipur', type: 'city' },
  'midnapore': { lat: 22.4250, lng: 87.3200, name: 'Medinipur', type: 'city' },
  'berhampore': { lat: 24.1000, lng: 88.2500, name: 'Berhampore', type: 'city' },
  'malda': { lat: 25.0000, lng: 88.1400, name: 'Malda', type: 'city' },
  'jalpaiguri': { lat: 26.5400, lng: 88.7200, name: 'Jalpaiguri', type: 'city' },
  'coochbehar': { lat: 26.3200, lng: 89.4500, name: 'Cooch Behar', type: 'city' },
  'cooch behar': { lat: 26.3200, lng: 89.4500, name: 'Cooch Behar', type: 'city' },
  'bolpur': { lat: 23.6700, lng: 87.7200, name: 'Bolpur', type: 'town' },
  'santiniketan': { lat: 23.6800, lng: 87.6900, name: 'Santiniketan', type: 'town' }
};

const HOWRAH_CENTER = {
  lat: 22.5850,
  lng: 88.2600,
  name: 'Howrah Central',
  type: 'district_center',
  confidence: 'regional_fallback'
};

/**
 * Clean and normalize a location query string for matching
 * @param {string} str
 * @returns {string}
 */
function normalizeQuery(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[,\-_.\/\\|()]/g, ' ')
    .replace(/\b(west\s+bengal|wb|india|district|dist|ps|block|city|town|village|area|zone)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Geocode a location string into coordinates (lat, lng)
 * Matches local database first, then Nominatim live API, then regional fallback.
 * 
 * @param {string} locationString - Village name, town, panchayat, or city name
 * @returns {Promise<{lat: number, lng: number, name: string, type: string, confidence: string}>}
 */
async function geocodeLocation(locationString) {
  if (!locationString || typeof locationString !== 'string' || !locationString.trim()) {
    return { ...HOWRAH_CENTER };
  }

  const raw = locationString.trim();
  const normalized = normalizeQuery(raw);
  const rawLower = raw.toLowerCase().trim();

  // 1. Check exact key match
  if (LOCALITY_COORDINATES[rawLower]) {
    const loc = LOCALITY_COORDINATES[rawLower];
    return {
      lat: loc.lat,
      lng: loc.lng,
      name: loc.name,
      type: loc.type,
      confidence: 'exact_local_match'
    };
  }

  if (normalized && LOCALITY_COORDINATES[normalized]) {
    const loc = LOCALITY_COORDINATES[normalized];
    return {
      lat: loc.lat,
      lng: loc.lng,
      name: loc.name,
      type: loc.type,
      confidence: 'exact_local_match'
    };
  }

  // 2. Check partial / token match in LOCALITY_COORDINATES
  // First check if any known locality key is contained within the query string or vice-versa
  const keys = Object.keys(LOCALITY_COORDINATES).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    // Word boundary or token check
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(rawLower) || regex.test(normalized)) {
      const loc = LOCALITY_COORDINATES[key];
      return {
        lat: loc.lat,
        lng: loc.lng,
        name: loc.name,
        type: loc.type,
        confidence: 'exact_local_match'
      };
    }
  }

  // 3. Nominatim OpenStreetMap Search with 4s timeout
  try {
    const searchQuery = encodeURIComponent(normalized || raw);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${searchQuery},+West+Bengal,+India&format=json&limit=1`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'AmpEdge-Lead-Generator/1.0 (contact@ampedge.in)'
      },
      timeout: 4000,
      signal: controller ? controller.signal : undefined
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const place = data[0];
        const displayName = place.display_name ? place.display_name.split(',')[0].trim() : raw;
        return {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
          name: displayName || raw,
          type: place.type || place.class || 'locality',
          confidence: 'nominatim_live'
        };
      }
    }
  } catch (err) {
    console.warn(`[Geocoder] Nominatim lookup failed for "${locationString}":`, err.message);
  }

  // 4. Fallback to Howrah center
  return {
    ...HOWRAH_CENTER,
    name: raw || HOWRAH_CENTER.name
  };
}

module.exports = {
  LOCALITY_COORDINATES,
  geocodeLocation,
  HOWRAH_CENTER
};
