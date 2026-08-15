const express = require('express');
const router = express.Router();
const queries = require('../database/queries');

// GET /api/sources — List all data sources
router.get('/', (req, res) => {
  try {
    const sources = queries.getAllSources();

    // Check API key status
    const enrichedSources = sources.map(source => {
      const enriched = { ...source };
      if (source.id === 'google-maps' || source.id === 'google-search') {
        enriched.api_key_configured = !!process.env.GOOGLE_MAPS_API_KEY ? 1 : 0;
      }
      if (source.id === 'bing-maps') {
        enriched.api_key_configured = !!process.env.BING_MAPS_API_KEY ? 1 : 0;
      }
      return enriched;
    });

    res.json({ success: true, data: enrichedSources });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sources/:id/toggle — Enable/disable a source
router.put('/:id/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    queries.toggleSource(req.params.id, enabled);
    res.json({ success: true, message: `Source ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/categories — List all lead categories
router.get('/categories', (req, res) => {
  try {
    const categories = queries.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
