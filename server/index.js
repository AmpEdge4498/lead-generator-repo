require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupDatabase } = require('./database/setup');

const leadsRoutes = require('./routes/leads');
const searchRoutes = require('./routes/search');
const sourcesRoutes = require('./routes/sources');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'client')));

// API Routes
app.use('/api/leads', leadsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/sources', sourcesRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Lead Generator API',
    version: '1.0.0',
    company: 'AmpEdge — Electrical Services & Products',
    endpoints: {
      leads: '/api/leads',
      search: '/api/search',
      sources: '/api/sources'
    },
    config: {
      googleMapsConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
      bingMapsConfigured: !!process.env.BING_MAPS_API_KEY,
      defaultLocation: {
        lat: process.env.DEFAULT_LAT,
        lng: process.env.DEFAULT_LNG,
        radius: process.env.DEFAULT_RADIUS
      }
    }
  });
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Initialize database and start server
(async () => {
  try {
    await setupDatabase();
    app.listen(PORT, () => {
      console.log('');
      console.log('  ⚡ ========================================== ⚡');
      console.log('  ⚡  AmpEdge Lead Generator System             ⚡');
      console.log('  ⚡ ========================================== ⚡');
      console.log('');
      console.log(`  🌐 Server running at: http://localhost:${PORT}`);
      console.log(`  📡 API endpoint:      http://localhost:${PORT}/api`);
      console.log('');
      console.log('  📋 API Routes:');
      console.log(`     GET  /api/leads          — List all leads`);
      console.log(`     POST /api/leads          — Add manual lead`);
      console.log(`     GET  /api/leads/stats    — Dashboard stats`);
      console.log(`     GET  /api/leads/export   — Export CSV`);
      console.log(`     POST /api/search/all     — Search all sources`);
      console.log(`     POST /api/search/demo    — Generate demo data`);
      console.log(`     GET  /api/sources        — List data sources`);
      console.log('');
      console.log('  🔑 API Keys:');
      console.log(`     Google Maps: ${process.env.GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Not set (add to .env)'}`);
      console.log(`     Bing Maps:   ${process.env.BING_MAPS_API_KEY ? '✅ Configured' : '❌ Not set (add to .env)'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
