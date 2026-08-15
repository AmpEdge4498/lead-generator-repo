const fetch = require('node-fetch');

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Search Google Maps / Places API for businesses
 * @param {Object} options
 * @param {string} options.query - Search query text
 * @param {number} options.lat - Latitude
 * @param {number} options.lng - Longitude
 * @param {number} options.radius - Search radius in meters
 * @param {string} options.type - Place type filter
 * @param {string} options.apiKey - Google API key
 */
async function searchPlaces(options) {
  const { query, lat, lng, radius = 50000, type, apiKey } = options;

  if (!apiKey) {
    return { error: 'Google Maps API key not configured', results: [] };
  }

  const results = [];
  let nextPageToken = null;
  let page = 0;
  const maxPages = 3; // Google allows max 3 pages (60 results)

  try {
    do {
      let url = `${GOOGLE_PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

      if (lat && lng) {
        url += `&location=${lat},${lng}&radius=${radius}`;
      }
      if (type) {
        url += `&type=${type}`;
      }
      if (nextPageToken) {
        url = `${GOOGLE_PLACES_BASE}/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results) {
        for (const place of data.results) {
          const lead = {
            name: place.name || '',
            company_name: place.name || '',
            address: place.formatted_address || '',
            lat: place.geometry?.location?.lat || null,
            lng: place.geometry?.location?.lng || null,
            rating: place.rating || null,
            source: 'google-maps',
            source_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            raw_data: {
              place_id: place.place_id,
              types: place.types,
              business_status: place.business_status,
              user_ratings_total: place.user_ratings_total
            }
          };

          // Extract city from address
          if (lead.address) {
            const addressParts = lead.address.split(',').map(p => p.trim());
            if (addressParts.length >= 3) {
              lead.city = addressParts[addressParts.length - 3] || '';
              lead.state = addressParts[addressParts.length - 2]?.replace(/\d/g, '').trim() || 'West Bengal';
            }
            // Extract pincode
            const pincodeMatch = lead.address.match(/\b\d{6}\b/);
            if (pincodeMatch) {
              lead.pincode = pincodeMatch[0];
            }
          }

          results.push(lead);
        }

        nextPageToken = data.next_page_token || null;
        page++;

        // Google requires a delay before using next_page_token
        if (nextPageToken && page < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        if (data.status === 'ZERO_RESULTS') {
          break;
        }
        console.error(`Google Places API error: ${data.status}`, data.error_message);
        break;
      }
    } while (nextPageToken && page < maxPages);

    // Get detailed info (phone, website) for each result
    const detailedResults = [];
    for (const lead of results) {
      try {
        const details = await getPlaceDetails(lead.raw_data.place_id, apiKey);
        if (details) {
          lead.phone = details.phone || '';
          lead.website = details.website || '';
          lead.email = ''; // Google doesn't provide email directly
        }
        detailedResults.push(lead);

        // Rate limit: small delay between detail requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        detailedResults.push(lead);
      }
    }

    return { results: detailedResults, total: detailedResults.length };
  } catch (error) {
    console.error('Google Places search error:', error);
    return { error: error.message, results: [] };
  }
}

/**
 * Get detailed place information (phone, website, hours)
 */
async function getPlaceDetails(placeId, apiKey) {
  try {
    const url = `${GOOGLE_PLACES_BASE}/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,website,url,opening_hours&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return {
        phone: data.result.formatted_phone_number || data.result.international_phone_number || '',
        website: data.result.website || '',
        url: data.result.url || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Place details error:', error);
    return null;
  }
}

/**
 * Search for nearby places by type
 */
async function nearbySearch(options) {
  const { lat, lng, radius = 10000, type, keyword, apiKey } = options;

  if (!apiKey) {
    return { error: 'Google Maps API key not configured', results: [] };
  }

  try {
    let url = `${GOOGLE_PLACES_BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${apiKey}`;

    if (type) url += `&type=${type}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return {
        results: data.results.map(place => ({
          name: place.name,
          address: place.vicinity || place.formatted_address || '',
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng,
          rating: place.rating,
          source: 'google-maps',
          raw_data: { place_id: place.place_id, types: place.types }
        })),
        total: data.results.length
      };
    }

    return { results: [], total: 0 };
  } catch (error) {
    return { error: error.message, results: [] };
  }
}

module.exports = { searchPlaces, nearbySearch, getPlaceDetails };
