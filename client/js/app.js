/**
 * AmpEdge Lead Generator — Main Application Controller
 * Handles all UI interactions, navigation, and data rendering
 */

// ==================== GLOBALS ====================
let currentPage = 'dashboard';
let allLeads = [];
let allSources = [];
let sortField = 'created_at';
let sortDir = 'desc';
let selectedLeads = new Set();

const CATEGORY_META = {
  'flat-apartment': { icon: '🏢', label: 'Under-Construction Flats', color: '#6366f1' },
  'housing': { icon: '🏠', label: 'Housing Townships', color: '#059669' },
  'industry': { icon: '🏭', label: 'Factories & Plants', color: '#d97706' },
  'office': { icon: '🏪', label: 'Commercial / IT Parks', color: '#7c3aed' },
  'developer-builder': { icon: '👷', label: 'Developers & Promoters', color: '#0891b2' },
  'individual-house': { icon: '🏡', label: 'Bungalows & Houses', color: '#dc2626' },
  'general': { icon: '📋', label: 'General', color: '#64748b' }
};

const SOURCE_META = {
  'google-maps': { icon: '🗺️', label: 'Google Maps & OSM' },
  'google-search': { icon: '🔍', label: 'Google Web Crawler' },
  'wbrera': { icon: '🏗️', label: 'WB RERA Registry' },
  'facebook-leads': { icon: '📱', label: 'Facebook & Social' },
  'indiamart': { icon: '🏭', label: 'IndiaMart B2B' },
  '99acres': { icon: '🏠', label: '99acres & MagicBricks' },
  'manual': { icon: '✏️', label: 'Manual / Field Visit' },
  'demo': { icon: '🎯', label: 'Project Database' }
};

const STATUS_META = {
  'new': { icon: '🔵', label: 'New' },
  'contacted': { icon: '🟡', label: 'Contacted' },
  'converted': { icon: '🟢', label: 'Converted' },
  'rejected': { icon: '🔴', label: 'Rejected' }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadDashboard();
  loadSources();

  // Search debounce
  const filterSearch = document.getElementById('filter-search');
  if (filterSearch) {
    let debounceTimer;
    filterSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadLeads, 300);
    });
  }
});

// ==================== NAVIGATION ====================
function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
    });
  });
}

function navigateTo(page) {
  currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update page sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const activeSection = document.getElementById(`page-${page}`);
  if (activeSection) activeSection.classList.add('active');

  // Update title
  const titles = {
    dashboard: 'Dashboard',
    search: 'Search & Generate Leads',
    leads: 'All Leads',
    map: 'Map View',
    sources: 'Data Sources',
    export: 'Export Data'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'leads': loadLeads(); break;
    case 'search': loadSearchSources(); break;
    case 'sources': loadSourcesPage(); break;
    case 'map': loadMapData(); break;
  }

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const response = await api.getLeadStats();
    if (!response.success) return;

    const stats = response.data;

    // Update stat cards
    animateCounter('stat-total', stats.total);
    animateCounter('stat-today', stats.todayCount);
    animateCounter('stat-week', stats.weekCount);

    // Count active sources
    const srcRes = await api.getSources();
    if (srcRes.success) {
      const activeSources = srcRes.data.filter(s => s.enabled).length;
      animateCounter('stat-sources', activeSources);
    }

    // Update badge
    document.getElementById('total-leads-badge').textContent = stats.total;

    // Category distribution
    renderCategoryDistribution(stats.byCategory);

    // Trend chart
    renderTrendChart(stats.dailyTrend);

    // Recent leads
    renderRecentLeads(stats.recentLeads);
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function renderCategoryDistribution(byCategory) {
  const container = document.getElementById('category-distribution');
  if (!container) return;

  if (!byCategory || byCategory.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-desc">No category data available yet.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = byCategory.map(item => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META['general'];
    return `
      <div class="cat-dist-item" onclick="navigateTo('leads'); document.getElementById('filter-category').value='${item.category}'; loadLeads();">
        <div class="cat-dist-icon">${meta.icon}</div>
        <div class="cat-dist-info">
          <div class="cat-dist-name">${meta.label}</div>
          <div class="cat-dist-count" style="color: ${meta.color}">${item.count}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTrendChart(dailyTrend) {
  const container = document.getElementById('trend-chart');
  if (!container) return;

  if (!dailyTrend || dailyTrend.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-desc">No trend data yet. Start generating leads!</div>
      </div>
    `;
    return;
  }

  const maxCount = Math.max(...dailyTrend.map(d => d.count), 1);

  container.innerHTML = dailyTrend.map(item => {
    const height = (item.count / maxCount) * 100;
    const date = new Date(item.date);
    const label = `${date.getDate()}/${date.getMonth() + 1}`;
    return `
      <div class="chart-bar" style="height: ${Math.max(height, 5)}%;" title="${item.date}: ${item.count} leads">
        <div class="chart-bar-value">${item.count}</div>
        <div class="chart-bar-label">${label}</div>
      </div>
    `;
  }).join('');
}

function renderRecentLeads(leads) {
  const container = document.getElementById('recent-leads-list');
  if (!container) return;

  if (!leads || leads.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-desc">No leads yet. Click "Load Demo" or "New Search" to start!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = leads.map(lead => {
    const catMeta = CATEGORY_META[lead.category] || CATEGORY_META['general'];
    const initials = (lead.name || '?').substring(0, 2).toUpperCase();
    const timeAgo = getTimeAgo(lead.created_at);

    return `
      <div class="recent-lead-item">
        <div class="recent-lead-avatar" style="background: ${catMeta.color}22; color: ${catMeta.color};">
          ${initials}
        </div>
        <div class="recent-lead-info">
          <div class="recent-lead-name">${escapeHtml(lead.name || lead.company_name)}</div>
          <div class="recent-lead-meta">${catMeta.icon} ${catMeta.label} · ${lead.city || 'Unknown'} · ${timeAgo}</div>
        </div>
        <span class="badge badge-status" data-status="${lead.status}">${STATUS_META[lead.status]?.icon || '●'} ${lead.status}</span>
      </div>
    `;
  }).join('');
}

// ==================== LEADS TABLE ====================
async function loadLeads() {
  const filters = {
    search: document.getElementById('filter-search')?.value || '',
    category: document.getElementById('filter-category')?.value || '',
    source: document.getElementById('filter-source')?.value || '',
    status: document.getElementById('filter-status')?.value || '',
    limit: 200
  };

  try {
    const response = await api.getLeads(filters);
    if (!response.success) return;

    allLeads = response.data;
    renderLeadsTable(allLeads);
  } catch (error) {
    console.error('Load leads error:', error);
    showToast('Failed to load leads', 'error');
  }
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;

  if (!leads || leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">No leads found</div>
            <div class="empty-state-desc">Try adjusting your filters or load demo data.</div>
            <button class="btn btn-primary" onclick="loadDemoData()">🎯 Load Demo Data</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const catMeta = CATEGORY_META[lead.category] || CATEGORY_META['general'];
    const srcMeta = SOURCE_META[lead.source] || { icon: '📋', label: lead.source };
    const statusMeta = STATUS_META[lead.status] || { icon: '●', label: lead.status };

    return `
      <tr data-id="${lead.id}">
        <td>
          <input type="checkbox" class="lead-checkbox" value="${lead.id}" onchange="toggleLeadSelection('${lead.id}')">
        </td>
        <td title="${escapeHtml(lead.name)}">
          <strong>${escapeHtml(lead.name || lead.company_name || 'N/A')}</strong>
          ${lead.company_name && lead.company_name !== lead.name ? `<br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHtml(lead.company_name)}</span>` : ''}
        </td>
        <td>
          ${lead.phone ? `<a href="tel:${lead.phone}" style="color: var(--accent-green);">${escapeHtml(lead.phone)}</a>` : '<span style="color:var(--text-muted)">—</span>'}
        </td>
        <td>
          ${lead.email ? `<a href="mailto:${lead.email}">${escapeHtml(lead.email)}</a>` : '<span style="color:var(--text-muted)">—</span>'}
        </td>
        <td title="${escapeHtml(lead.address)}">${escapeHtml(lead.address || '—')}</td>
        <td>${escapeHtml(lead.city || '—')}</td>
        <td>
          <span class="badge badge-category" data-cat="${lead.category}">${catMeta.icon} ${catMeta.label}</span>
        </td>
        <td>
          <span class="badge badge-source">${srcMeta.icon} ${srcMeta.label}</span>
        </td>
        <td>
          <select class="form-select" style="width:auto;padding:4px 28px 4px 8px;font-size:0.75rem;min-width:100px;" onchange="updateLeadStatus('${lead.id}', this.value)">
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>🔵 New</option>
            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>🟡 Contacted</option>
            <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>🟢 Converted</option>
            <option value="rejected" ${lead.status === 'rejected' ? 'selected' : ''}>🔴 Rejected</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-sm btn-icon" title="Edit" onclick="editLead('${lead.id}')">✏️</button>
            <button class="btn btn-sm btn-icon btn-danger" title="Delete" onclick="confirmDeleteLead('${lead.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function sortLeads(field) {
  if (sortField === field) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDir = 'asc';
  }

  allLeads.sort((a, b) => {
    const valA = (a[field] || '').toString().toLowerCase();
    const valB = (b[field] || '').toString().toLowerCase();
    const cmp = valA.localeCompare(valB);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  renderLeadsTable(allLeads);
}

function toggleSelectAll() {
  const checked = document.getElementById('select-all-leads').checked;
  document.querySelectorAll('.lead-checkbox').forEach(cb => {
    cb.checked = checked;
    if (checked) selectedLeads.add(cb.value);
    else selectedLeads.delete(cb.value);
  });
}

function toggleLeadSelection(id) {
  if (selectedLeads.has(id)) selectedLeads.delete(id);
  else selectedLeads.add(id);
}

async function updateLeadStatus(id, status) {
  try {
    const result = await api.updateLead(id, { status });
    if (result.success) {
      showToast(`Status updated to ${status}`, 'success');
    }
  } catch (error) {
    showToast('Failed to update status', 'error');
  }
}

async function confirmDeleteLead(id) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  try {
    const result = await api.deleteLead(id);
    if (result.success) {
      showToast('Lead deleted', 'success');
      loadLeads();
      loadDashboard();
    }
  } catch (error) {
    showToast('Failed to delete lead', 'error');
  }
}

function editLead(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  const container = document.getElementById('edit-lead-form-container');
  container.innerHTML = `
    <form onsubmit="submitEditLead(event, '${id}')">
      <div class="search-config-grid">
        <div class="form-group">
          <label class="form-label">Name *</label>
          <input type="text" class="form-input" id="edit-name" value="${escapeHtml(lead.name)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Company</label>
          <input type="text" class="form-input" id="edit-company" value="${escapeHtml(lead.company_name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="tel" class="form-input" id="edit-phone" value="${escapeHtml(lead.phone || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="edit-email" value="${escapeHtml(lead.email || '')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input type="text" class="form-input" id="edit-address" value="${escapeHtml(lead.address || '')}">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md);">
        <div class="form-group">
          <label class="form-label">City</label>
          <input type="text" class="form-input" id="edit-city" value="${escapeHtml(lead.city || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="edit-status">
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
            <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted</option>
            <option value="rejected" ${lead.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="edit-category">
            ${Object.entries(CATEGORY_META).filter(([k]) => k !== 'general').map(([k, v]) => 
              `<option value="${k}" ${lead.category === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="edit-notes">${escapeHtml(lead.notes || '')}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" onclick="closeModal('edit-lead-modal')">Cancel</button>
        <button type="submit" class="btn btn-primary">💾 Save Changes</button>
      </div>
    </form>
  `;

  openModal('edit-lead-modal');
}

async function submitEditLead(event, id) {
  event.preventDefault();
  const data = {
    name: document.getElementById('edit-name').value,
    company_name: document.getElementById('edit-company').value,
    phone: document.getElementById('edit-phone').value,
    email: document.getElementById('edit-email').value,
    address: document.getElementById('edit-address').value,
    city: document.getElementById('edit-city').value,
    status: document.getElementById('edit-status').value,
    category: document.getElementById('edit-category').value,
    notes: document.getElementById('edit-notes').value
  };

  try {
    const result = await api.updateLead(id, data);
    if (result.success) {
      showToast('Lead updated successfully!', 'success');
      closeModal('edit-lead-modal');
      loadLeads();
      loadDashboard();
    }
  } catch (error) {
    showToast('Failed to update lead', 'error');
  }
}

// ==================== SEARCH ====================
async function loadSearchSources() {
  try {
    const result = await api.getSources();
    if (!result.success) return;

    allSources = result.data;
    const grid = document.getElementById('search-sources-grid');
    if (!grid) return;

    grid.innerHTML = allSources.map(source => `
      <div class="source-toggle ${source.enabled ? 'active' : ''}" id="source-toggle-${source.id}" onclick="toggleSearchSource('${source.id}')">
        <div class="source-toggle-icon">${source.icon || '📋'}</div>
        <div class="source-toggle-info">
          <div class="source-toggle-name">${escapeHtml(source.name)}</div>
          <div class="source-toggle-desc">
            ${source.api_key_required && !source.api_key_configured ? '🔑 API key needed' : (source.total_leads ? `${source.total_leads} leads found` : 'Ready')}
          </div>
        </div>
        <div class="source-toggle-switch"></div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load search sources error:', error);
  }
}

function toggleSearchSource(id) {
  const el = document.getElementById(`source-toggle-${id}`);
  if (el) {
    el.classList.toggle('active');
    const source = allSources.find(s => s.id === id);
    if (source) source.enabled = el.classList.contains('active');
  }
}

async function startSearch() {
  const query = document.getElementById('search-query').value.trim();
  const category = document.getElementById('search-category').value;
  const location = document.getElementById('search-location').value.trim();
  const radius = parseInt(document.getElementById('search-radius').value);

  if (!query && !category) {
    showToast('Please enter a search keyword or select a category', 'warning');
    document.getElementById('search-query').focus();
    return;
  }

  // Get enabled sources
  const enabledSources = allSources.filter(s => {
    const el = document.getElementById(`source-toggle-${s.id}`);
    return el && el.classList.contains('active');
  }).map(s => s.id);

  // Show progress
  const progressEl = document.getElementById('search-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const progressPercent = document.getElementById('progress-percent');
  const searchBtn = document.getElementById('start-search-btn');

  progressEl.classList.add('active');
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<span class="loading-spinner"></span> Scanning Construction Sites...';

  // Animate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 18, 88);
    progressFill.style.width = `${progress}%`;
    progressPercent.textContent = `${Math.round(progress)}%`;
    progressLabel.textContent = `Scanning ${location || 'Howrah'} for construction projects...`;
  }, 400);

  try {
    const result = await api.searchAll(query, category, null, null, radius, enabledSources, location);

    clearInterval(progressInterval);
    progressFill.style.width = '100%';
    progressPercent.textContent = '100%';
    progressLabel.textContent = 'Extraction complete!';

    if (result.success) {
      const data = result.data;
      showSearchResults(data);
      showToast(`Discovered ${data.totalFound} sites (${data.totalSaved} new saved)!`, 'success');
      loadDashboard();
    } else {
      showToast(result.error || 'Search failed', 'error');
    }
  } catch (error) {
    clearInterval(progressInterval);
    showToast('Search failed: ' + error.message, 'error');
  }

  searchBtn.disabled = false;
  searchBtn.innerHTML = '⚡ Start Live Lead Extraction';

  setTimeout(() => {
    progressEl.classList.remove('active');
  }, 3500);
}

function showSearchResults(data) {
  const resultsEl = document.getElementById('search-results');
  const resultsBody = document.getElementById('search-results-body');

  resultsEl.classList.add('active');

  if (data.center) {
    window._activeSearchCenter = data.center;
  }

  const centerName = data.center?.name || document.getElementById('search-location')?.value || 'Howrah Area';
  const radiusKm = ((data.center?.radius || 5000) / 1000).toFixed(0);

  let html = `
    <div style="background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-lg); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <div style="font-size: 0.8rem; color: var(--accent-blue); font-weight: 700; text-transform: uppercase;">
          📍 Micro-Locality Radar Target
        </div>
        <div style="font-weight: 700; color: #fff; font-size: 1.05rem; margin-top: 2px;">
          ${escapeHtml(centerName)}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
          Radius: <strong>${radiusKm} km</strong> ${data.center ? `| GPS: ${data.center.lat.toFixed(4)}, ${data.center.lng.toFixed(4)}` : ''}
        </div>
      </div>
      <button class="btn btn-sm" style="background: var(--accent-blue); color: #000; font-weight: 700;" onclick="viewRadarMap()">
        🗺️ View Live Radar Map ➔
      </button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); margin-bottom: var(--space-lg);">
      <div class="stat-card" style="--card-accent: var(--accent-blue);">
        <div class="stat-value" style="font-size: 1.5rem;">${data.totalFound}</div>
        <div class="stat-label">Sites Discovered</div>
      </div>
      <div class="stat-card" style="--card-accent: var(--accent-green);">
        <div class="stat-value" style="font-size: 1.5rem; color: var(--accent-green);">${data.totalSaved}</div>
        <div class="stat-label">New Projects Saved</div>
      </div>
      <div class="stat-card" style="--card-accent: var(--accent-orange);">
        <div class="stat-value" style="font-size: 1.5rem; color: var(--accent-orange);">${data.totalDuplicates || 0}</div>
        <div class="stat-label">Duplicates Filtered</div>
      </div>
    </div>

    <div style="display: flex; gap: var(--space-md); justify-content: center; margin: var(--space-md) 0 var(--space-lg); flex-wrap: wrap;">
      <button class="btn btn-primary btn-lg" onclick="navigateTo('leads')">
        📋 View All Projects in CRM Table ➔
      </button>
      <button class="btn btn-lg" style="background: rgba(0, 212, 255, 0.1); border: 1px solid var(--accent-blue); color: var(--accent-blue);" onclick="viewRadarMap()">
        🗺️ Zoom Into Interactive Map
      </button>
    </div>

    <h4 style="margin-bottom: var(--space-md); color: var(--text-secondary);">Harvest Breakdown by Engine</h4>
  `;

  if (data.sourceResults) {
    html += data.sourceResults.map(sr => {
      const srcMeta = SOURCE_META[sr.source] || { icon: '📋', label: sr.source };
      const hasError = sr.error;
      return `
        <div class="results-source-item">
          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <span style="font-size: 1.2rem;">${srcMeta.icon}</span>
            <div>
              <div style="font-weight: 600;">${srcMeta.label}</div>
              ${hasError ? `<div style="font-size: 0.7rem; color: var(--accent-orange);">${sr.error}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: ${hasError ? 'var(--text-muted)' : 'var(--accent-green)'};">
              ${hasError ? '—' : `${sr.found} found / ${sr.saved} saved`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  resultsBody.innerHTML = html;
}

function viewRadarMap() {
  navigateTo('map');
  if (window._activeSearchCenter && window._leafletMap) {
    setTimeout(() => {
      focusMapOnLocality(window._activeSearchCenter.lat, window._activeSearchCenter.lng, window._activeSearchCenter.radius || 5000, window._activeSearchCenter.name);
    }, 500);
  }
}

function selectDistrict(district) {
  document.getElementById('search-location').value = district + ', West Bengal';
}

function quickSearch(query) {
  document.getElementById('search-query').value = query;
  document.getElementById('search-query').focus();

  const q = query.toLowerCase();
  let cat = '';
  if (/apartment|flat/.test(q)) cat = 'flat-apartment';
  else if (/housing|villa|township/.test(q)) cat = 'housing';
  else if (/factory|industrial|manufacturing/.test(q)) cat = 'industry';
  else if (/office|commercial/.test(q)) cat = 'office';
  else if (/bungalow|private house/.test(q)) cat = 'individual-house';
  else if (/developer|builder|promoter/.test(q)) cat = 'developer-builder';

  if (cat) document.getElementById('search-category').value = cat;
}

// ==================== GPS LIVE LOCATOR ====================
function useCurrentGpsLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'warning');
    return;
  }
  showToast('Detecting your live GPS coordinates...', 'info');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      document.getElementById('search-location').value = `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      window._activeSearchCenter = { lat, lng, name: `Your Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, radius: 5000 };
      showToast(`GPS Position Acquired: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
      if (window._leafletMap) {
        focusMapOnLocality(lat, lng, 5000, 'Your GPS Position');
      }
    },
    () => {
      showToast('Could not access GPS. Enter village/town name manually.', 'warning');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function focusMapOnLocality(lat, lng, radius, label) {
  if (!window._leafletMap) return;
  window._leafletMap.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });

  if (window._searchRadarCircle) {
    window._leafletMap.removeLayer(window._searchRadarCircle);
  }

  window._searchRadarCircle = L.circle([lat, lng], {
    radius: radius || 5000,
    color: '#00D4FF',
    fillColor: '#00D4FF',
    fillOpacity: 0.12,
    weight: 2,
    dashArray: '6, 6'
  }).addTo(window._leafletMap);

  window._searchRadarCircle.bindPopup(`<b>📍 Search Radar:</b><br>${escapeHtml(label || 'Target Area')}<br>Radius: ${(radius/1000).toFixed(1)} km`);
}

function openLiveGoogleMapsSearch() {
  const query = document.getElementById('search-query')?.value.trim() || 'under construction apartment';
  const location = document.getElementById('search-location')?.value.trim() || 'Sankrail, Howrah';
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query + ' in ' + location)}`;
  window.open(url, '_blank');
  showToast('Opened Google Maps Live Search', 'info');
}

// ==================== MAP (LEAFLET) ====================
let leafletMarkersLayer = null;

async function loadMapData() {
  // Initialize Leaflet map if not yet done
  if (!window._leafletMap) {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    // Load Leaflet CSS/JS dynamically
    if (!window.L) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);

      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    mapEl.innerHTML = '';
    window._leafletMap = L.map(mapEl).setView([22.5694, 88.2435], 12);

    // Street map layer
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    });

    // Satellite layer
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 18
    });

    streetLayer.addTo(window._leafletMap);
    L.control.layers({ '🗺️ Street Map': streetLayer, '🛰️ Satellite View': satelliteLayer }).addTo(window._leafletMap);

    leafletMarkersLayer = L.layerGroup().addTo(window._leafletMap);
  }

  // Render lead markers
  await renderMapWithLeads();
}

async function renderMapWithLeads() {
  if (!window._leafletMap || !leafletMarkersLayer) return;

  leafletMarkersLayer.clearLayers();
  const catFilter = document.getElementById('map-filter-category')?.value || '';

  try {
    const res = await api.getLeads({ limit: 500, category: catFilter });
    if (!res.success) return;

    const leadsWithCoords = res.data.filter(l => l.lat && l.lng);
    const countEl = document.getElementById('map-lead-count');
    if (countEl) countEl.textContent = leadsWithCoords.length;

    const bounds = [];

    leadsWithCoords.forEach(lead => {
      const lat = parseFloat(lead.lat);
      const lng = parseFloat(lead.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const catMeta = CATEGORY_META[lead.category] || CATEGORY_META['general'];

      const customIcon = L.divIcon({
        className: 'custom-map-div-icon',
        html: `<div style="background:${catMeta.color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid #fff;">${catMeta.icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16]
      });

      const popupContent = `
        <div style="min-width:200px;font-family:system-ui;">
          <div style="font-size:0.7rem;color:${catMeta.color};font-weight:700;text-transform:uppercase;">${catMeta.icon} ${catMeta.label}</div>
          <strong style="font-size:0.9rem;display:block;margin:4px 0;">${escapeHtml(lead.name)}</strong>
          ${lead.company_name && lead.company_name !== lead.name ? `<div style="font-size:0.75rem;color:#666;">${escapeHtml(lead.company_name)}</div>` : ''}
          <div style="font-size:0.75rem;color:#888;margin:4px 0;">📍 ${escapeHtml(lead.address || lead.city || 'West Bengal')}</div>
          ${lead.project_stage ? `<div style="font-size:0.7rem;margin:2px 0;"><span style="background:#4F46E5;color:#fff;padding:1px 6px;border-radius:4px;">${escapeHtml(lead.project_stage)}</span></div>` : ''}
          <div style="display:flex;gap:4px;margin-top:6px;">
            ${lead.phone ? `<a href="tel:${lead.phone}" style="background:#059669;color:#fff;padding:2px 8px;border-radius:4px;text-decoration:none;font-size:0.7rem;">📞 ${lead.phone}</a>` : ''}
            ${lead.phone ? `<a href="https://wa.me/91${lead.phone}?text=${encodeURIComponent('Hello, I am from AmpEdge Electrical Solutions.')}" target="_blank" style="background:#25D366;color:#fff;padding:2px 8px;border-radius:4px;text-decoration:none;font-size:0.7rem;">💬 WhatsApp</a>` : ''}
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupContent);
      leafletMarkersLayer.addLayer(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      window._leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  } catch (err) {
    console.error('Render map error:', err);
  }
}

function updateMapMarkers() {
  renderMapWithLeads();
}

// ==================== EXPORT ====================
function exportLeads() {
  const filters = {
    category: document.getElementById('export-category')?.value || document.getElementById('filter-category')?.value || '',
    source: document.getElementById('export-source')?.value || document.getElementById('filter-source')?.value || '',
    status: document.getElementById('export-status')?.value || document.getElementById('filter-status')?.value || '',
    search: document.getElementById('export-search')?.value || ''
  };

  const url = api.getExportUrl(filters);
  window.open(url, '_blank');
  showToast('Export started! CSV file will download shortly.', 'success');
}

// ==================== MODALS ====================
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// ==================== TOASTS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span style="font-size: 1.1rem;">${icons[type] || 'ℹ️'}</span>
    <span style="flex: 1;">${message}</span>
    <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// ==================== UTILITY ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}
