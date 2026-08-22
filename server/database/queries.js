const { getDb, saveDb } = require('./setup');
const { v4: uuidv4 } = require('uuid');

// Helper: convert sql.js result to array of objects
function resultToArray(result) {
  if (!result || result.length === 0) return [];
  const stmt = result[0];
  return stmt.values.map(row => {
    const obj = {};
    stmt.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// Helper: run a SELECT and return array of objects
function queryAll(sql, params = []) {
  const db = getDb();
  try {
    const result = db.exec(sql, params);
    return resultToArray(result);
  } catch (e) {
    return [];
  }
}

// Helper: run a SELECT and return first row
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ==================== LEADS ====================

function getAllLeads(filters = {}) {
  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.source) {
    sql += ' AND source = ?';
    params.push(filters.source);
  }
  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.city) {
    sql += ' AND city LIKE ?';
    params.push(`%${filters.city}%`);
  }
  if (filters.project_stage) {
    sql += ' AND project_stage = ?';
    params.push(filters.project_stage);
  }
  if (filters.search) {
    sql += ' AND (name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ? OR city LIKE ? OR notes LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s, s, s);
  }
  if (filters.dateFrom) {
    sql += ' AND created_at >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    sql += ' AND created_at <= ?';
    params.push(filters.dateTo);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  if (filters.offset) {
    sql += ' OFFSET ?';
    params.push(parseInt(filters.offset));
  }

  return queryAll(sql, params);
}

function getLeadById(id) {
  return queryOne('SELECT * FROM leads WHERE id = ?', [id]);
}

function createLead(data) {
  const db = getDb();
  const id = uuidv4();

  // Check for duplicate by phone
  if (data.phone) {
    const existing = queryOne("SELECT id FROM leads WHERE phone = ? AND phone != ''", [data.phone]);
    if (existing) {
      return { duplicate: true, existingId: existing.id };
    }
  }

  db.run(`
    INSERT INTO leads (id, name, company_name, phone, email, address, city, state, pincode, lat, lng, category, subcategory, project_stage, project_scale, source, source_url, status, rating, website, google_business_url, facebook_url, notes, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.name || '',
    data.company_name || '',
    data.phone || '',
    data.email || '',
    data.address || '',
    data.city || '',
    data.state || 'West Bengal',
    data.pincode || '',
    data.lat || null,
    data.lng || null,
    data.category || 'flat-apartment',
    data.subcategory || '',
    data.project_stage || '',
    data.project_scale || '',
    data.source || 'manual',
    data.source_url || '',
    data.status || 'new',
    data.rating || null,
    data.website || '',
    data.google_business_url || '',
    data.facebook_url || '',
    data.notes || '',
    data.raw_data ? JSON.stringify(data.raw_data) : ''
  ]);

  // Update source lead count
  db.run('UPDATE sources SET total_leads = total_leads + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?', [data.source || 'manual']);

  saveDb();
  return { id, duplicate: false };
}

function createLeadsBulk(leadsArray) {
  const db = getDb();
  const results = { inserted: 0, duplicates: 0, errors: 0 };

  for (const data of leadsArray) {
    try {
      if (data.phone) {
        const existing = queryOne("SELECT id FROM leads WHERE phone = ? AND phone != ''", [data.phone]);
        if (existing) {
          results.duplicates++;
          continue;
        }
      }

      db.run(`
        INSERT INTO leads (id, name, company_name, phone, email, address, city, state, pincode, lat, lng, category, subcategory, project_stage, project_scale, source, source_url, status, rating, website, google_business_url, facebook_url, notes, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        data.name || '',
        data.company_name || '',
        data.phone || '',
        data.email || '',
        data.address || '',
        data.city || '',
        data.state || 'West Bengal',
        data.pincode || '',
        data.lat || null,
        data.lng || null,
        data.category || 'flat-apartment',
        data.subcategory || '',
        data.project_stage || '',
        data.project_scale || '',
        data.source || 'manual',
        data.source_url || '',
        data.status || 'new',
        data.rating || null,
        data.website || '',
        data.google_business_url || '',
        data.facebook_url || '',
        data.notes || '',
        data.raw_data ? JSON.stringify(data.raw_data) : ''
      ]);
      results.inserted++;
    } catch (err) {
      results.errors++;
    }
  }

  // Update source counts
  const sourceCounts = {};
  for (const lead of leadsArray) {
    const src = lead.source || 'manual';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }
  for (const [src, count] of Object.entries(sourceCounts)) {
    db.run('UPDATE sources SET total_leads = total_leads + ?, last_used = CURRENT_TIMESTAMP WHERE id = ?', [count, src]);
  }

  saveDb();
  return results;
}

function updateLead(id, data) {
  const db = getDb();
  const fields = [];
  const params = [];

  const allowedFields = ['name', 'company_name', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'lat', 'lng', 'category', 'subcategory', 'project_stage', 'project_scale', 'status', 'rating', 'website', 'google_business_url', 'facebook_url', 'notes'];

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (fields.length === 0) {
    return false;
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.run(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return true;
}

function deleteLead(id) {
  const db = getDb();
  const before = queryOne('SELECT COUNT(*) as count FROM leads WHERE id = ?', [id]);
  db.run('DELETE FROM leads WHERE id = ?', [id]);
  const after = queryOne('SELECT COUNT(*) as count FROM leads WHERE id = ?', [id]);
  saveDb();
  return before && before.count > 0 && (!after || after.count === 0);
}

function deleteLeadsBulk(ids) {
  const db = getDb();
  const beforeCount = queryOne('SELECT COUNT(*) as count FROM leads')?.count || 0;
  for (const id of ids) {
    db.run('DELETE FROM leads WHERE id = ?', [id]);
  }
  const afterCount = queryOne('SELECT COUNT(*) as count FROM leads')?.count || 0;
  saveDb();
  return beforeCount - afterCount;
}

// ==================== STATISTICS ====================

function getLeadStats() {
  const total = queryOne('SELECT COUNT(*) as count FROM leads')?.count || 0;
  const byCategory = queryAll('SELECT category, COUNT(*) as count FROM leads GROUP BY category');
  const bySource = queryAll('SELECT source, COUNT(*) as count FROM leads GROUP BY source');
  const byStatus = queryAll('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
  const byCity = queryAll("SELECT city, COUNT(*) as count FROM leads WHERE city != '' GROUP BY city ORDER BY count DESC LIMIT 10");
  const byStage = queryAll("SELECT project_stage, COUNT(*) as count FROM leads WHERE project_stage != '' GROUP BY project_stage");
  const recentLeads = queryAll('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');
  const todayCount = queryOne("SELECT COUNT(*) as count FROM leads WHERE date(created_at) = date('now')")?.count || 0;
  const weekCount = queryOne("SELECT COUNT(*) as count FROM leads WHERE created_at >= datetime('now', '-7 days')")?.count || 0;

  // Daily trend (last 30 days)
  const dailyTrend = queryAll(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM leads
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `);

  return {
    total,
    todayCount,
    weekCount,
    byCategory,
    bySource,
    byStatus,
    byCity,
    byStage,
    recentLeads,
    dailyTrend
  };
}

// ==================== SOURCES ====================

function getAllSources() {
  return queryAll('SELECT * FROM sources ORDER BY name');
}

function toggleSource(id, enabled) {
  const db = getDb();
  db.run('UPDATE sources SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  saveDb();
}

// ==================== CATEGORIES ====================

function getAllCategories() {
  return queryAll('SELECT * FROM categories');
}

// ==================== SEARCH HISTORY ====================

function addSearchHistory(data) {
  const db = getDb();
  db.run(`
    INSERT INTO search_history (query, category, location, radius, sources, results_count, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    data.query,
    data.category || '',
    data.location || '',
    data.radius || 50000,
    data.sources || '',
    data.results_count || 0,
    data.status || 'completed'
  ]);
  saveDb();
}

function getSearchHistory(limit = 20) {
  return queryAll('SELECT * FROM search_history ORDER BY created_at DESC LIMIT ?', [limit]);
}

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  createLeadsBulk,
  updateLead,
  deleteLead,
  deleteLeadsBulk,
  getLeadStats,
  getAllSources,
  toggleSource,
  getAllCategories,
  addSearchHistory,
  getSearchHistory
};
