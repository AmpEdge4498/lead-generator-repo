const express = require('express');
const router = express.Router();
const { searchPlaces } = require('../scrapers/googleMaps');
const { searchGoogle, buildSearchQueries } = require('../scrapers/googleSearch');
const { searchBingMaps } = require('../scrapers/bingMaps');
const { processLeads } = require('../scrapers/enricher');
const queries = require('../database/queries');

// POST /api/search/google-maps — Search Google Maps/Places
router.post('/google-maps', async (req, res) => {
  try {
    const { query, lat, lng, radius, category } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Google Maps API key not configured. Add GOOGLE_MAPS_API_KEY to .env file.',
        demo: true
      });
    }

    const defaultLat = lat || parseFloat(process.env.DEFAULT_LAT) || 22.5726;
    const defaultLng = lng || parseFloat(process.env.DEFAULT_LNG) || 88.3639;
    const defaultRadius = radius || parseInt(process.env.DEFAULT_RADIUS) || 50000;

    const result = await searchPlaces({
      query,
      lat: defaultLat,
      lng: defaultLng,
      radius: defaultRadius,
      apiKey
    });

    if (result.error) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Enrich and deduplicate
    const processed = processLeads(result.results, category);

    // Save to database
    if (processed.length > 0) {
      const bulkResult = queries.createLeadsBulk(processed);

      // Log search history
      queries.addSearchHistory({
        query,
        category,
        location: `${defaultLat},${defaultLng}`,
        radius: defaultRadius,
        sources: 'google-maps',
        results_count: bulkResult.inserted
      });

      return res.json({
        success: true,
        data: {
          found: result.results.length,
          saved: bulkResult.inserted,
          duplicates: bulkResult.duplicates,
          source: 'google-maps'
        }
      });
    }

    res.json({ success: true, data: { found: 0, saved: 0, source: 'google-maps' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/search/bing — Search Bing Maps
router.post('/bing', async (req, res) => {
  try {
    const { query, lat, lng, category } = req.body;
    const apiKey = process.env.BING_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Bing Maps API key not configured. Add BING_MAPS_API_KEY to .env file.',
        demo: true
      });
    }

    const defaultLat = lat || parseFloat(process.env.DEFAULT_LAT) || 22.5726;
    const defaultLng = lng || parseFloat(process.env.DEFAULT_LNG) || 88.3639;

    const result = await searchBingMaps({
      query,
      lat: defaultLat,
      lng: defaultLng,
      apiKey
    });

    if (result.error) {
      return res.status(500).json({ success: false, error: result.error });
    }

    const processed = processLeads(result.results, category);

    if (processed.length > 0) {
      const bulkResult = queries.createLeadsBulk(processed);

      queries.addSearchHistory({
        query,
        category,
        location: `${defaultLat},${defaultLng}`,
        sources: 'bing-maps',
        results_count: bulkResult.inserted
      });

      return res.json({
        success: true,
        data: {
          found: result.results.length,
          saved: bulkResult.inserted,
          duplicates: bulkResult.duplicates,
          source: 'bing-maps'
        }
      });
    }

    res.json({ success: true, data: { found: 0, saved: 0, source: 'bing-maps' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/search/all — Search all enabled sources
router.post('/all', async (req, res) => {
  try {
    const { query, lat, lng, radius, category, sources: requestedSources } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const defaultLat = lat || parseFloat(process.env.DEFAULT_LAT) || 22.5726;
    const defaultLng = lng || parseFloat(process.env.DEFAULT_LNG) || 88.3639;
    const defaultRadius = radius || parseInt(process.env.DEFAULT_RADIUS) || 50000;

    const enabledSources = queries.getAllSources().filter(s => s.enabled);
    const sourcesToSearch = requestedSources
      ? enabledSources.filter(s => requestedSources.includes(s.id))
      : enabledSources;

    const results = {
      totalFound: 0,
      totalSaved: 0,
      totalDuplicates: 0,
      sourceResults: []
    };

    // Search each source
    for (const source of sourcesToSearch) {
      let sourceResult = { source: source.id, found: 0, saved: 0, error: null };

      try {
        switch (source.id) {
          case 'google-maps': {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (apiKey) {
              const gmResult = await searchPlaces({
                query, lat: defaultLat, lng: defaultLng, radius: defaultRadius, apiKey
              });
              if (!gmResult.error) {
                const processed = processLeads(gmResult.results, category);
                if (processed.length > 0) {
                  const bulk = queries.createLeadsBulk(processed);
                  sourceResult.found = gmResult.results.length;
                  sourceResult.saved = bulk.inserted;
                }
              } else {
                sourceResult.error = gmResult.error;
              }
            } else {
              sourceResult.error = 'API key not configured';
            }
            break;
          }

          case 'bing-maps': {
            const bingKey = process.env.BING_MAPS_API_KEY;
            if (bingKey) {
              const bingResult = await searchBingMaps({
                query, lat: defaultLat, lng: defaultLng, apiKey: bingKey
              });
              if (!bingResult.error) {
                const processed = processLeads(bingResult.results, category);
                if (processed.length > 0) {
                  const bulk = queries.createLeadsBulk(processed);
                  sourceResult.found = bingResult.results.length;
                  sourceResult.saved = bulk.inserted;
                }
              } else {
                sourceResult.error = bingResult.error;
              }
            } else {
              sourceResult.error = 'API key not configured';
            }
            break;
          }

          default:
            sourceResult.error = 'Source not yet implemented';
        }
      } catch (err) {
        sourceResult.error = err.message;
      }

      results.sourceResults.push(sourceResult);
      results.totalFound += sourceResult.found;
      results.totalSaved += sourceResult.saved;
    }

    // Log search history
    queries.addSearchHistory({
      query,
      category,
      location: `${defaultLat},${defaultLng}`,
      radius: defaultRadius,
      sources: sourcesToSearch.map(s => s.id).join(','),
      results_count: results.totalSaved
    });

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/search/history — Search history
router.get('/history', (req, res) => {
  try {
    const history = queries.getSearchHistory(parseInt(req.query.limit) || 20);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/search/suggestions — Get suggested search queries for a category
router.get('/suggestions', (req, res) => {
  const { category, location } = req.query;
  const loc = location || 'Kolkata';
  const suggestions = buildSearchQueries(category || 'flat-apartment', loc);
  res.json({ success: true, data: suggestions });
});

// POST /api/search/demo — Generate demo data for testing
router.post('/demo', (req, res) => {
  try {
    const demoLeads = generateDemoLeads();
    const result = queries.createLeadsBulk(demoLeads);

    queries.addSearchHistory({
      query: 'Demo data generation',
      category: 'all',
      location: 'Kolkata/Howrah',
      sources: 'demo',
      results_count: result.inserted
    });

    res.json({
      success: true,
      data: {
        inserted: result.inserted,
        duplicates: result.duplicates,
        message: 'Demo data generated successfully!'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate realistic demo leads for testing
 */
function generateDemoLeads() {
  const leads = [
    // Flats / Apartments
    {
      name: 'Greenfield Heights', company_name: 'Greenfield Realty Pvt Ltd',
      phone: '9876543210', email: 'info@greenfieldrealty.in',
      address: '47, Belur Road, Howrah, West Bengal 711202',
      city: 'Howrah', state: 'West Bengal', pincode: '711202',
      lat: 22.6309, lng: 88.3488, category: 'flat-apartment',
      source: 'google-maps', rating: 4.2, website: 'https://greenfieldrealty.in',
      notes: 'New 3BHK apartments, 200+ units under construction'
    },
    {
      name: 'Siddha Eden Lakeville', company_name: 'Siddha Group',
      phone: '9830012345', email: 'sales@siddhagroup.com',
      address: 'Barrackpore, Kolkata, West Bengal 700120',
      city: 'Kolkata', state: 'West Bengal', pincode: '700120',
      lat: 22.7660, lng: 88.3760, category: 'flat-apartment',
      source: 'google-maps', rating: 4.0, website: 'https://siddhagroup.com'
    },
    {
      name: 'PS Srijan Ozone', company_name: 'PS Group & Srijan Realty',
      phone: '9038765432', email: 'contact@psgroup.in',
      address: 'Garia, Kolkata, West Bengal 700084',
      city: 'Kolkata', state: 'West Bengal', pincode: '700084',
      lat: 22.4627, lng: 88.3872, category: 'flat-apartment',
      source: 'google-maps', rating: 4.3
    },
    {
      name: 'Merlin Waterfront', company_name: 'Merlin Group',
      phone: '9007654321', email: 'info@merlingroup.net',
      address: 'Botanical Garden, Howrah, West Bengal 711103',
      city: 'Howrah', state: 'West Bengal', pincode: '711103',
      lat: 22.5540, lng: 88.3100, category: 'flat-apartment',
      source: 'bing-maps', rating: 4.1
    },
    // Housing Projects
    {
      name: 'Rajarhat Greens Township', company_name: 'Bengal Shelter',
      phone: '9831234567', email: 'info@bengalshelter.com',
      address: 'New Town, Rajarhat, Kolkata, West Bengal 700156',
      city: 'Kolkata', state: 'West Bengal', pincode: '700156',
      lat: 22.5958, lng: 88.4840, category: 'housing',
      source: 'google-maps', rating: 3.9
    },
    {
      name: 'Sonar Bangla Green Valley', company_name: 'Sonar Bangla Housing',
      phone: '9748123456', email: 'sales@sonarbangla.in',
      address: 'Dankuni, Hooghly, West Bengal 712311',
      city: 'Hooghly', state: 'West Bengal', pincode: '712311',
      lat: 22.6704, lng: 88.2879, category: 'housing',
      source: 'google-maps', rating: 3.7
    },
    {
      name: 'Uttarpara Villa Township', company_name: 'Bengal NRI Complex',
      phone: '9903456789', email: 'enquiry@bengalnri.com',
      address: 'Uttarpara, Hooghly, West Bengal 712258',
      city: 'Hooghly', state: 'West Bengal', pincode: '712258',
      lat: 22.6596, lng: 88.3454, category: 'housing',
      source: 'bing-maps', rating: 4.0
    },
    // Industries
    {
      name: 'Dankuni Industrial Complex', company_name: 'Dankuni Industries Ltd',
      phone: '9339876543', email: 'admin@dankuniindustries.co.in',
      address: 'GIDC, Dankuni, Hooghly, West Bengal 712310',
      city: 'Hooghly', state: 'West Bengal', pincode: '712310',
      lat: 22.6776, lng: 88.2758, category: 'industry',
      source: 'google-maps', rating: 3.5
    },
    {
      name: 'Uluberia Steel Works', company_name: 'Bengal Steel Corporation',
      phone: '9432567890', email: 'office@bengalsteel.in',
      address: 'Uluberia, Howrah, West Bengal 711316',
      city: 'Howrah', state: 'West Bengal', pincode: '711316',
      lat: 22.4694, lng: 88.1117, category: 'industry',
      source: 'google-maps', rating: 3.8
    },
    {
      name: 'Shibpur Manufacturing Hub', company_name: 'Shibpur Auto Parts',
      phone: '9230987654', email: 'orders@shibpurauto.com',
      address: 'Shibpur, Howrah, West Bengal 711102',
      city: 'Howrah', state: 'West Bengal', pincode: '711102',
      lat: 22.5570, lng: 88.3230, category: 'industry',
      source: 'bing-maps', rating: 4.0
    },
    // Offices
    {
      name: 'TechHub Salt Lake', company_name: 'TechHub Kolkata',
      phone: '9163456789', email: 'info@techhubkolkata.com',
      address: 'Sector V, Salt Lake, Kolkata, West Bengal 700091',
      city: 'Kolkata', state: 'West Bengal', pincode: '700091',
      lat: 22.5726, lng: 88.4348, category: 'office',
      source: 'google-maps', rating: 4.4
    },
    {
      name: 'Bengal Business Center', company_name: 'Bengal Commercial Pvt Ltd',
      phone: '9051234567', email: 'leasing@bengalbusiness.com',
      address: 'Park Street, Kolkata, West Bengal 700016',
      city: 'Kolkata', state: 'West Bengal', pincode: '700016',
      lat: 22.5510, lng: 88.3533, category: 'office',
      source: 'google-maps', rating: 4.2
    },
    {
      name: 'New Town IT Hub', company_name: 'Unitech Group',
      phone: '9874321098', email: 'admin@newtownhub.in',
      address: 'New Town Action Area II, Kolkata, West Bengal 700161',
      city: 'Kolkata', state: 'West Bengal', pincode: '700161',
      lat: 22.5801, lng: 88.4646, category: 'office',
      source: 'bing-maps', rating: 4.0
    },
    // Electrician Seekers
    {
      name: 'Raj Kumar Sharma', company_name: '',
      phone: '9876012345', email: 'rajksharma@gmail.com',
      address: 'B-12, Belur Math Road, Howrah, West Bengal 711202',
      city: 'Howrah', state: 'West Bengal', pincode: '711202',
      lat: 22.6329, lng: 88.3508, category: 'electrician-seeker',
      source: 'google-maps', notes: 'Looking for electrician for new home wiring'
    },
    {
      name: 'Suman Das', company_name: 'Das & Sons Traders',
      phone: '9748567890', email: 'suman.das@outlook.com',
      address: '23/A, GT Road, Bally, Howrah, West Bengal 711201',
      city: 'Howrah', state: 'West Bengal', pincode: '711201',
      lat: 22.6506, lng: 88.3412, category: 'electrician-seeker',
      source: 'justdial', notes: 'Needs commercial electrical work for shop'
    },
    {
      name: 'Arjun Ghosh', company_name: 'Ghosh Enterprises',
      phone: '9007891234', email: '',
      address: '56, JC Bose Road, Kolkata, West Bengal 700014',
      city: 'Kolkata', state: 'West Bengal', pincode: '700014',
      lat: 22.5395, lng: 88.3500, category: 'electrician-seeker',
      source: 'google-maps', notes: 'Factory electrical panel installation'
    },
    // Electrical Companies
    {
      name: 'Kolkata Electricals Pvt Ltd', company_name: 'Kolkata Electricals',
      phone: '9831098765', email: 'info@kolkataelectricals.com',
      address: '78, Burrabazar, Kolkata, West Bengal 700007',
      city: 'Kolkata', state: 'West Bengal', pincode: '700007',
      lat: 22.5785, lng: 88.3644, category: 'electrical-company',
      source: 'google-maps', rating: 4.1, website: 'https://kolkataelectricals.com',
      notes: 'Switchgear and panel manufacturer'
    },
    {
      name: 'Bengal Cable Industries', company_name: 'Bengal Cable Industries Ltd',
      phone: '9433123456', email: 'sales@bengalcable.co.in',
      address: 'Liluah Industrial Area, Howrah, West Bengal 711204',
      city: 'Howrah', state: 'West Bengal', pincode: '711204',
      lat: 22.6246, lng: 88.3373, category: 'electrical-company',
      source: 'indiamart', rating: 3.9, website: 'https://bengalcable.co.in',
      notes: 'Cable manufacturer — potential collaboration partner'
    },
    {
      name: 'Howrah Power Solutions', company_name: 'HPS Electric',
      phone: '9062345678', email: 'howrahpower@gmail.com',
      address: '34, Dobson Road, Howrah, West Bengal 711101',
      city: 'Howrah', state: 'West Bengal', pincode: '711101',
      lat: 22.5872, lng: 88.3301, category: 'electrical-company',
      source: 'google-maps', rating: 4.3,
      notes: 'Electrical contractor — competitors/collaboration'
    },
    {
      name: 'Siemens Dealer - Kolkata Central', company_name: 'Siemens Authorized Distributor',
      phone: '9830567890', email: 'siemens.kolkata@authorizeddealer.in',
      address: 'Esplanade, Kolkata, West Bengal 700069',
      city: 'Kolkata', state: 'West Bengal', pincode: '700069',
      lat: 22.5640, lng: 88.3520, category: 'electrical-company',
      source: 'google-maps', rating: 4.5,
      notes: 'Siemens switchgear dealer — partnership opportunity'
    },
    // More flats
    {
      name: 'Shapoorji Pallonji Joyville', company_name: 'Shapoorji Pallonji Group',
      phone: '1800123456', email: 'joyville.howrah@shapoorji.in',
      address: 'Howrah, West Bengal 711101',
      city: 'Howrah', state: 'West Bengal', pincode: '711101',
      lat: 22.5900, lng: 88.3200, category: 'flat-apartment',
      source: 'wbrera', rating: 4.4
    },
    // More industries
    {
      name: 'Haldia Petrochemicals Extension', company_name: 'HPCL',
      phone: '9339456789', email: 'info@haldiapetro.gov.in',
      address: 'Haldia Industrial Belt, Purba Medinipur, West Bengal',
      city: 'Haldia', state: 'West Bengal', pincode: '721602',
      lat: 22.0667, lng: 88.0698, category: 'industry',
      source: 'google-search', rating: 3.6
    },
  ];

  return leads;
}

module.exports = router;
