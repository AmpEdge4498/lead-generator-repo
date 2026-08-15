const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'leads.db');

let _db = null;
let _SQL = null;

async function initSQL() {
  if (!_SQL) {
    _SQL = await initSqlJs();
  }
  return _SQL;
}

function getDb() {
  if (_db) return _db;

  const SQL = _SQL;
  if (!SQL) {
    throw new Error('SQL.js not initialized. Call setupDatabase() first.');
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      _db = new SQL.Database(buffer);
    } else {
      _db = new SQL.Database();
    }
  } catch (e) {
    _db = new SQL.Database();
  }

  return _db;
}

function saveDb() {
  if (_db) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function setupDatabase() {
  await initSQL();
  const db = getDb();

  // Create leads table
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT DEFAULT 'West Bengal',
      pincode TEXT,
      lat REAL,
      lng REAL,
      category TEXT NOT NULL,
      subcategory TEXT,
      source TEXT NOT NULL,
      source_url TEXT,
      status TEXT DEFAULT 'new',
      rating REAL,
      website TEXT,
      notes TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create sources table
  db.run(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      enabled INTEGER DEFAULT 1,
      api_key_required INTEGER DEFAULT 0,
      api_key_configured INTEGER DEFAULT 0,
      description TEXT,
      last_used DATETIME,
      total_leads INTEGER DEFAULT 0
    );
  `);

  // Create search_history table
  db.run(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      category TEXT,
      location TEXT,
      radius INTEGER,
      sources TEXT,
      results_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      keywords TEXT,
      description TEXT,
      color TEXT
    );
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);`);

  // Insert default sources
  const defaultSources = [
    ['google-maps', 'Google Maps / Places', 'api', '🗺️', 1, 1, 'Search nearby businesses, construction sites, and services via Google Places API'],
    ['google-search', 'Google Web Search', 'api', '🔍', 1, 1, 'Search the web for new projects, companies, and contacts'],
    ['bing-maps', 'Bing Maps', 'api', '🌐', 1, 1, 'Microsoft Bing local search for businesses and services'],
    ['justdial', 'JustDial', 'scraper', '📞', 1, 0, 'India\'s largest local search engine for businesses'],
    ['indiamart', 'IndiaMart', 'scraper', '🏭', 1, 0, 'India\'s largest B2B marketplace for industrial products'],
    ['wbrera', 'WBRERA Portal', 'scraper', '🏗️', 1, 0, 'West Bengal Real Estate Regulatory Authority — registered projects'],
    ['99acres', '99acres', 'scraper', '🏠', 1, 0, 'Real estate portal for new projects and properties'],
    ['manual', 'Manual Entry', 'manual', '✏️', 1, 0, 'Manually added leads']
  ];

  for (const source of defaultSources) {
    db.run(
      `INSERT OR IGNORE INTO sources (id, name, type, icon, enabled, api_key_required, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      source
    );
  }

  // Insert default categories
  const defaultCategories = [
    ['flat-apartment', 'New Flats / Apartments', '🏢', 'new apartment,flat,residential complex,housing society,builder flat,new construction flat', 'New residential flat and apartment projects', '#4F46E5'],
    ['housing', 'Housing Projects', '🏠', 'housing project,residential project,township,villa,independent house,row house', 'New housing and township projects', '#059669'],
    ['industry', 'New Industries', '🏭', 'factory,manufacturing,industrial,warehouse,godown,plant,workshop', 'New industrial setups and factories', '#D97706'],
    ['office', 'New Offices', '🏪', 'office space,commercial,IT park,business center,co-working,corporate office', 'New office and commercial spaces', '#7C3AED'],
    ['electrician-seeker', 'Electrician Seekers', '🔌', 'electrician,electrical work,wiring,electrical repair,electrical installation', 'People or businesses looking for electrician services', '#DC2626'],
    ['electrical-company', 'Electrical Companies', '🤝', 'electrical company,electrical contractor,electrical supplier,switchgear,cable,transformer', 'Electrical companies for collaboration/partnership', '#0891B2']
  ];

  for (const cat of defaultCategories) {
    db.run(
      `INSERT OR IGNORE INTO categories (id, name, icon, keywords, description, color) VALUES (?, ?, ?, ?, ?, ?)`,
      cat
    );
  }

  saveDb();

  console.log('✅ Database setup completed successfully!');
  console.log(`📁 Database location: ${DB_PATH}`);
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { getDb, setupDatabase, saveDb, DB_PATH };
