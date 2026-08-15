# ⚡ AmpEdge Lead Generator

> Intelligent lead generation system for electrical services & products company. Automatically discovers potential leads from multiple online sources across Kolkata, Howrah, Hooghly, and West Bengal.

![Lead Generator](https://img.shields.io/badge/AmpEdge-Lead_Generator-00d4ff?style=for-the-badge&logo=lightning&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)

## 🎯 Features

### Lead Categories
- 🏢 **New Flats / Apartments** — Under construction and newly launched residential projects
- 🏠 **Housing Projects** — Townships, villas, and residential developments
- 🏭 **New Industries** — Factories, manufacturing plants, and industrial setups
- 🏪 **New Offices** — Commercial spaces, IT parks, and business centers
- 🔌 **Electrician Seekers** — People and businesses searching for electrical services
- 🤝 **Electrical Companies** — Potential collaboration and partnership opportunities

### Data Sources
- 🗺️ **Google Maps / Places API** — Primary source for business and location data
- 🔍 **Google Web Search** — Find new projects and contacts across the web
- 🌐 **Bing Maps** — Additional local business search
- 📞 **JustDial** — India's largest local search engine
- 🏭 **IndiaMart** — B2B marketplace for industrial products
- 🏗️ **WBRERA Portal** — West Bengal Real Estate Regulatory Authority

### Dashboard & Analytics
- 📊 Real-time statistics and trend charts
- 📋 Interactive lead table with sorting, filtering, and inline editing
- 🗺️ Map view with lead markers
- ⬇️ CSV export with custom filters
- ✏️ Manual lead entry
- 🔄 Duplicate detection and data enrichment

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/AmpEdge4498/lead-generator-repo.git
cd lead-generator-repo

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Setup database
npm run db:setup

# Start the server
npm run dev
```

### Configuration

Edit the `.env` file with your API keys:

```env
PORT=3000
GOOGLE_MAPS_API_KEY=your_key_here
BING_MAPS_API_KEY=your_key_here
DEFAULT_LAT=22.5726
DEFAULT_LNG=88.3639
DEFAULT_RADIUS=50000
```

### Getting API Keys

1. **Google Maps API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable: Maps JavaScript API, Places API, Geocoding API
   - Create credentials → API Key
   - Google provides **$200/month free credit**

2. **Bing Maps API Key** (optional):
   - Go to [Bing Maps Portal](https://www.bingmapsportal.com)
   - Create an account and get a key

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List leads with filters |
| POST | `/api/leads` | Add manual lead |
| GET | `/api/leads/stats` | Dashboard statistics |
| GET | `/api/leads/export` | Export CSV |
| PUT | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| POST | `/api/search/all` | Search all sources |
| POST | `/api/search/google-maps` | Search Google Maps |
| POST | `/api/search/bing` | Search Bing Maps |
| POST | `/api/search/demo` | Load demo data |
| GET | `/api/sources` | List data sources |
| PUT | `/api/sources/:id/toggle` | Enable/disable source |

## 🏗️ Project Structure

```
lead-generator/
├── client/                  # Frontend
│   ├── index.html           # Main HTML
│   ├── styles/
│   │   └── main.css         # Design system
│   └── js/
│       ├── api.js           # API client
│       └── app.js           # Main application
├── server/                  # Backend
│   ├── index.js             # Express server
│   ├── database/
│   │   ├── setup.js         # SQLite setup
│   │   └── queries.js       # CRUD operations
│   ├── routes/
│   │   ├── leads.js         # Lead endpoints
│   │   ├── search.js        # Search endpoints
│   │   └── sources.js       # Source endpoints
│   └── scrapers/
│       ├── googleMaps.js    # Google Places API
│       ├── googleSearch.js  # Google Web Search
│       ├── bingMaps.js      # Bing Maps API
│       ├── webScraper.js    # Generic scraper
│       └── enricher.js      # Data enrichment
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 📍 Target Area

Primary focus on **West Bengal**, specifically:
- **Howrah** — Industrial and residential areas
- **Kolkata** — Metro area, Salt Lake, New Town
- **Hooghly** — Chinsurah, Uttarpara, Serampore, Dankuni
- Industrial corridors and emerging development zones

## 🛡️ Legal Note

This system primarily uses **official APIs** (Google Maps, Bing Maps) for data collection. Web scraping features are designed for publicly available data only. Always ensure compliance with local data protection laws and platform Terms of Service.

## 📄 License

MIT License — AmpEdge © 2026

---

**Built with ⚡ by AmpEdge — Electrical Services & Products**
