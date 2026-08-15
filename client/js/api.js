/**
 * API Client — Handles all backend communication
 */

const API_BASE = window.location.origin + '/api';

const api = {
  // ==================== LEADS ====================
  async getLeads(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val) params.append(key, val);
    }
    const res = await fetch(`${API_BASE}/leads?${params}`);
    return res.json();
  },

  async getLeadStats() {
    const res = await fetch(`${API_BASE}/leads/stats`);
    return res.json();
  },

  async createLead(data) {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateLead(id, data) {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteLead(id) {
    const res = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async bulkDeleteLeads(ids) {
    const res = await fetch(`${API_BASE}/leads/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    return res.json();
  },

  getExportUrl(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val) params.append(key, val);
    }
    return `${API_BASE}/leads/export?${params}`;
  },

  // ==================== SEARCH ====================
  async searchGoogleMaps(query, category, lat, lng, radius) {
    const res = await fetch(`${API_BASE}/search/google-maps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, category, lat, lng, radius })
    });
    return res.json();
  },

  async searchBing(query, category, lat, lng) {
    const res = await fetch(`${API_BASE}/search/bing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, category, lat, lng })
    });
    return res.json();
  },

  async searchAll(query, category, lat, lng, radius, sources) {
    const res = await fetch(`${API_BASE}/search/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, category, lat, lng, radius, sources })
    });
    return res.json();
  },

  async loadDemo() {
    const res = await fetch(`${API_BASE}/search/demo`, { method: 'POST' });
    return res.json();
  },

  async getSearchHistory(limit = 20) {
    const res = await fetch(`${API_BASE}/search/history?limit=${limit}`);
    return res.json();
  },

  async getSearchSuggestions(category, location) {
    const res = await fetch(`${API_BASE}/search/suggestions?category=${category || ''}&location=${location || ''}`);
    return res.json();
  },

  // ==================== SOURCES ====================
  async getSources() {
    const res = await fetch(`${API_BASE}/sources`);
    return res.json();
  },

  async toggleSource(id, enabled) {
    const res = await fetch(`${API_BASE}/sources/${id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    return res.json();
  },

  async getCategories() {
    const res = await fetch(`${API_BASE}/sources/categories`);
    return res.json();
  }
};
