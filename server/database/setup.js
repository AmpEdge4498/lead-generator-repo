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

  // Create leads table with construction project fields
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
      project_stage TEXT DEFAULT '',
      project_scale TEXT DEFAULT '',
      source TEXT NOT NULL,
      source_url TEXT,
      status TEXT DEFAULT 'new',
      rating REAL,
      website TEXT,
      google_business_url TEXT DEFAULT '',
      facebook_url TEXT DEFAULT '',
      notes TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing tables — add new columns if missing
  const migrationCols = [
    { name: 'project_stage', sql: "ALTER TABLE leads ADD COLUMN project_stage TEXT DEFAULT ''" },
    { name: 'project_scale', sql: "ALTER TABLE leads ADD COLUMN project_scale TEXT DEFAULT ''" },
    { name: 'google_business_url', sql: "ALTER TABLE leads ADD COLUMN google_business_url TEXT DEFAULT ''" },
    { name: 'facebook_url', sql: "ALTER TABLE leads ADD COLUMN facebook_url TEXT DEFAULT ''" }
  ];

  for (const col of migrationCols) {
    try {
      db.run(col.sql);
    } catch (e) {
      // Column already exists
    }
  }

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
  db.run(`CREATE INDEX IF NOT EXISTS idx_leads_project_stage ON leads(project_stage);`);

  // Insert default sources — construction focused
  const defaultSources = [
    ['google-maps', 'Google Maps & OSM Overpass', 'api', '🗺️', 1, 0, 'Live OpenStreetMap building scanner + Google Maps Places for construction sites'],
    ['google-search', 'Google Web Search & Crawler', 'api', '🔍', 1, 0, 'Web search for new construction projects, builders, and promoters'],
    ['wbrera', 'WB RERA & Construction Registry', 'scraper', '🏗️', 1, 0, 'West Bengal Real Estate Regulatory Authority — registered construction projects'],
    ['facebook-leads', 'Facebook & Social Media', 'scraper', '📱', 1, 0, 'Facebook/social media project launch and builder announcements'],
    ['indiamart', 'IndiaMart Industrial B2B', 'scraper', '🏭', 1, 0, 'Industrial project listings, factory construction, and equipment suppliers'],
    ['99acres', '99acres & MagicBricks', 'scraper', '🏠', 1, 0, 'Real estate portals for under-construction flats and housing projects'],
    ['manual', 'Manual Entry & Field Visit', 'manual', '✏️', 1, 0, 'Manually added leads from field visits and personal contacts']
  ];

  for (const source of defaultSources) {
    db.run(
      `INSERT OR REPLACE INTO sources (id, name, type, icon, enabled, api_key_required, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      source
    );
  }

  // Insert construction-focused categories (NO electricians/retail)
  const defaultCategories = [
    ['flat-apartment', 'Under-Construction Flats & High-Rises', '🏢', 'new apartment,flat,residential complex,housing society,builder flat,new construction flat,high-rise,tower', 'New residential flat and apartment construction projects', '#4F46E5'],
    ['housing', 'Housing Townships & Gated Communities', '🏠', 'housing project,residential project,township,villa,duplex,gated community,row house,independent house', 'New housing township and gated community projects', '#059669'],
    ['industry', 'New Factories & Industrial Plants', '🏭', 'factory,manufacturing,industrial,warehouse,godown,plant,workshop,steel,chemical,logistics,shed', 'New industrial setups, factories, and logistics parks', '#D97706'],
    ['office', 'Commercial Buildings & IT Parks', '🏪', 'office space,commercial,IT park,business center,co-working,corporate office,mall,shopping,SEZ', 'New office buildings, IT parks, and commercial complexes', '#7C3AED'],
    ['developer-builder', 'Real Estate Developers & Promoters', '👷', 'developer,builder,promoter,real estate,construction company,contractor', 'Real estate developers, builders, and promoters for collaboration', '#0891B2'],
    ['individual-house', 'Bungalows & Private Houses', '🏡', 'bungalow,private house,individual house,mansion,luxury home,farmhouse', 'Individual house, bungalow, and luxury home construction', '#DC2626']
  ];

  for (const cat of defaultCategories) {
    db.run(
      `INSERT OR REPLACE INTO categories (id, name, icon, keywords, description, color) VALUES (?, ?, ?, ?, ?, ?)`,
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
