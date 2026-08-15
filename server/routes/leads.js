const express = require('express');
const router = express.Router();
const queries = require('../database/queries');

// GET /api/leads — List leads with filters
router.get('/', (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      source: req.query.source,
      status: req.query.status,
      city: req.query.city,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: req.query.limit || 100,
      offset: req.query.offset || 0
    };

    const leads = queries.getAllLeads(filters);
    res.json({ success: true, data: leads, total: leads.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/stats — Dashboard statistics
router.get('/stats', (req, res) => {
  try {
    const stats = queries.getLeadStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/export — Export leads as CSV
router.get('/export', (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      source: req.query.source,
      status: req.query.status,
      city: req.query.city,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const leads = queries.getAllLeads(filters);

    // Build CSV
    const headers = ['Name', 'Company', 'Phone', 'Email', 'Address', 'City', 'State', 'Pincode', 'Category', 'Source', 'Status', 'Rating', 'Website', 'Date'];
    const rows = leads.map(lead => [
      escapeCsv(lead.name),
      escapeCsv(lead.company_name),
      escapeCsv(lead.phone),
      escapeCsv(lead.email),
      escapeCsv(lead.address),
      escapeCsv(lead.city),
      escapeCsv(lead.state),
      escapeCsv(lead.pincode),
      escapeCsv(lead.category),
      escapeCsv(lead.source),
      escapeCsv(lead.status),
      lead.rating || '',
      escapeCsv(lead.website),
      lead.created_at || ''
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/:id — Get single lead
router.get('/:id', (req, res) => {
  try {
    const lead = queries.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads — Add new lead manually
router.post('/', (req, res) => {
  try {
    const { name, company_name, phone, email, address, city, state, pincode, category, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result = queries.createLead({
      name,
      company_name: company_name || name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      category: category || 'general',
      source: 'manual',
      notes
    });

    if (result.duplicate) {
      return res.status(409).json({ success: false, error: 'Duplicate lead (same phone number)', existingId: result.existingId });
    }

    res.status(201).json({ success: true, data: { id: result.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/leads/:id — Update lead
router.put('/:id', (req, res) => {
  try {
    const updated = queries.updateLead(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead not found or no changes' });
    }
    res.json({ success: true, message: 'Lead updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/leads/:id — Delete lead
router.delete('/:id', (req, res) => {
  try {
    const deleted = queries.deleteLead(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/bulk-delete — Delete multiple leads
router.post('/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'ids array required' });
    }
    const count = queries.deleteLeadsBulk(ids);
    res.json({ success: true, message: `${count} leads deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function escapeCsv(str) {
  if (!str) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = router;
