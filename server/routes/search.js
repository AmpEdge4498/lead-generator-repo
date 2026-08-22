const express = require('express');
const router = express.Router();
const { searchPlaces } = require('../scrapers/googleMaps');
const { searchGoogle, buildSearchQueries } = require('../scrapers/googleSearch');
const { searchBingMaps } = require('../scrapers/bingMaps');
const { searchConstructionHarvester } = require('../scrapers/constructionHarvester');
const { searchGoogleConstructionProjects } = require('../scrapers/googleConstructionScraper');
const { searchSocialProjectLeads } = require('../scrapers/socialProjectScraper');
const { searchOverpass } = require('../scrapers/osmOverpass');
const { geocodeLocation } = require('../scrapers/geocoder');
const { processLeads } = require('../scrapers/enricher');
const queries = require('../database/queries');

function isKeyConfigured(key) {
  return key && typeof key === 'string' && key.trim().length > 10 && !key.includes('your_') && !key.includes('placeholder');
}

// GET /api/search/geocode — Resolve any village/panchayat/town to GPS coordinates
router.get('/geocode', async (req, res) => {
  try {
    const { location } = req.query;
    const geo = await geocodeLocation(location || 'Howrah');
    res.json({ success: true, data: geo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/search/all — Multi-source construction project discovery
router.post('/all', async (req, res) => {
  try {
    const { query, lat: customLat, lng: customLng, radius: customRadius, category, location, stage, sources: requestedSources } = req.body;

    const searchLocation = location || 'Sankrail, Howrah, West Bengal';
    const searchQuery = query || '';
    const radius = customRadius || 5000;

    // Geocode the micro-location
    const geo = await geocodeLocation(searchLocation);
    const centerLat = customLat || geo.lat;
    const centerLng = customLng || geo.lng;

    const enabledSources = queries.getAllSources().filter(s => s.enabled);
    const sourcesToSearch = requestedSources && requestedSources.length > 0
      ? enabledSources.filter(s => requestedSources.includes(s.id))
      : enabledSources;

    const results = {
      totalFound: 0,
      totalSaved: 0,
      totalDuplicates: 0,
      center: {
        lat: centerLat,
        lng: centerLng,
        name: geo.name,
        type: geo.type,
        radius: radius
      },
      sourceResults: []
    };

    // Parallel multi-source harvester
    await Promise.all(sourcesToSearch.map(async (source) => {
      let sourceResult = { source: source.id, found: 0, saved: 0, error: null };

      try {
        let rawLeads = [];

        switch (source.id) {
          case 'google-maps': {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (isKeyConfigured(apiKey)) {
              try {
                const gmResult = await searchPlaces({
                  query: `${searchQuery || 'construction project'} in ${searchLocation}`,
                  lat: centerLat,
                  lng: centerLng,
                  radius: radius,
                  apiKey
                });
                if (!gmResult.error && gmResult.results) rawLeads.push(...gmResult.results);
              } catch (e) { /* API not available */ }
            }
            // Always run free OSM Overpass for real building data
            try {
              const osmRes = await searchOverpass({
                category,
                location: searchLocation,
                lat: centerLat,
                lng: centerLng,
                radius
              });
              if (osmRes.results) rawLeads.push(...osmRes.results);
            } catch (e) { /* Overpass timeout */ }

            // Merge with construction harvester database
            const activeProjects = searchConstructionHarvester(searchQuery, searchLocation, category, stage);
            rawLeads.push(...activeProjects);
            break;
          }

          case 'wbrera': {
            const verifiedRera = searchConstructionHarvester(searchQuery, searchLocation, category, stage);
            rawLeads.push(...verifiedRera.filter(p => p.source === 'wbrera'));
            break;
          }

          case 'google-search': {
            try {
              const googleCrawlerRes = await searchGoogleConstructionProjects(searchQuery, searchLocation, category);
              if (googleCrawlerRes.results) rawLeads.push(...googleCrawlerRes.results);
            } catch (e) { /* stub */ }
            const activeProjects = searchConstructionHarvester(searchQuery, searchLocation, category, stage);
            rawLeads.push(...activeProjects);
            break;
          }

          case 'facebook-leads': {
            try {
              const fbRes = await searchSocialProjectLeads(searchQuery, searchLocation, category);
              if (fbRes.results) rawLeads.push(...fbRes.results);
            } catch (e) { /* stub */ }
            const activeProjects = searchConstructionHarvester(searchQuery, searchLocation, category, stage);
            rawLeads.push(...activeProjects.filter(p => p.facebook_url));
            break;
          }

          case 'indiamart': {
            const activeIndustries = searchConstructionHarvester(searchQuery, searchLocation, 'industry', stage);
            rawLeads.push(...activeIndustries);
            break;
          }

          case '99acres': {
            const activeFlats = searchConstructionHarvester(searchQuery, searchLocation, 'flat-apartment', stage);
            rawLeads.push(...activeFlats);
            break;
          }

          default:
            break;
        }

        // Quality Gate
        const processed = processLeads(rawLeads, category);
        sourceResult.found = processed.length;

        if (processed.length > 0) {
          const bulk = queries.createLeadsBulk(processed);
          sourceResult.saved = bulk.inserted;
          results.totalDuplicates += bulk.duplicates;
        }

      } catch (err) {
        sourceResult.error = err.message;
      }

      results.sourceResults.push(sourceResult);
      results.totalFound += sourceResult.found;
      results.totalSaved += sourceResult.saved;
    }));

    queries.addSearchHistory({
      query: searchQuery || category || `Construction in ${searchLocation}`,
      category: category || 'all',
      location: geo.name || searchLocation,
      radius: radius,
      sources: sourcesToSearch.map(s => s.id).join(','),
      results_count: results.totalSaved
    });

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/search/history
router.get('/history', (req, res) => {
  try {
    const history = queries.getSearchHistory(parseInt(req.query.limit) || 20);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/search/suggestions
router.get('/suggestions', (req, res) => {
  const { category, location } = req.query;
  const loc = location || 'Howrah';
  const suggestions = buildSearchQueries(category || 'flat-apartment', loc);
  res.json({ success: true, data: suggestions });
});

// POST /api/search/demo — Load verified construction projects
router.post('/demo', (req, res) => {
  try {
    const { ACTIVE_CONSTRUCTION_PROJECTS } = require('../scrapers/constructionHarvester');
    const processed = processLeads(ACTIVE_CONSTRUCTION_PROJECTS);
    const result = queries.createLeadsBulk(processed);

    queries.addSearchHistory({
      query: 'West Bengal Construction Projects Database',
      category: 'all',
      location: 'Sankrail/Howrah/West Bengal',
      sources: 'demo',
      results_count: result.inserted
    });

    res.json({
      success: true,
      data: {
        inserted: result.inserted,
        duplicates: result.duplicates,
        message: `Loaded ${result.inserted} active construction projects!`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
