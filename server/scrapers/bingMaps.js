const fetch = require('node-fetch');

/**
 * Search Bing Maps Local Search API
 * @param {Object} options
 * @param {string} options.query - Search query
 * @param {number} options.lat - Latitude
 * @param {number} options.lng - Longitude
 * @param {number} options.maxResults - Max results (1-25)
 * @param {string} options.apiKey - Bing Maps API key
 */
async function searchBingMaps(options) {
  const { query, lat, lng, maxResults = 25, apiKey } = options;

  if (!apiKey) {
    return { error: 'Bing Maps API key not configured', results: [] };
  }

  try {
    // Bing Local Search API
    const url = `https://dev.virtualearth.net/REST/v1/LocalSearch/?query=${encodeURIComponent(query)}&userLocation=${lat},${lng}&maxResults=${maxResults}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.statusCode === 200 && data.resourceSets?.[0]?.resources) {
      const results = data.resourceSets[0].resources.map(place => ({
        name: place.name || '',
        company_name: place.name || '',
        phone: place.PhoneNumber || '',
        address: place.Address?.formattedAddress || '',
        city: place.Address?.locality || '',
        state: place.Address?.adminDistrict || 'West Bengal',
        pincode: place.Address?.postalCode || '',
        lat: place.point?.coordinates?.[0] || null,
        lng: place.point?.coordinates?.[1] || null,
        website: place.Website || '',
        source: 'bing-maps',
        source_url: place.Website || '',
        raw_data: {
          entityType: place.entityType,
          categories: place.Categories || []
        }
      }));

      return { results, total: results.length };
    }

    return { results: [], total: 0 };
  } catch (error) {
    console.error('Bing Maps search error:', error);
    return { error: error.message, results: [] };
  }
}

/**
 * Geocode an address using Bing Maps
 */
async function geocodeAddress(address, apiKey) {
  if (!apiKey) return null;

  try {
    const url = `http://dev.virtualearth.net/REST/v1/Locations?q=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.statusCode === 200 && data.resourceSets?.[0]?.resources?.[0]) {
      const loc = data.resourceSets[0].resources[0];
      return {
        lat: loc.point.coordinates[0],
        lng: loc.point.coordinates[1],
        address: loc.address?.formattedAddress || address
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

module.exports = { searchBingMaps, geocodeAddress };
