// Tesla Giveaway — Backend API Configuration
// =============================================
//
// Configure the backend API URL. Options:
//   1. Local API server:  http://localhost:10000/api
//   2. Production API:   https://your-secure-api.example.com/api
//
// GitHub Pages deployments should not hardcode a host here. Instead, the
// .github/workflows/pages.yml workflow injects TESLA_API_BASE from a GitHub
// repository variable or environment secret and smoke-tests /health before
// publishing the static site.
//
// For local testing, use either:
//   ?api_url=http://localhost:10000/api
//   localStorage.setItem('tesla_api_base', 'http://localhost:10000/api')

// ═══════════════════════════════════════════════════════════
// GITHUB ACTIONS REPLACES THIS DURING PAGES DEPLOYMENT:
// ═══════════════════════════════════════════════════════════
window.TESLA_API_BASE = window.TESLA_API_BASE || '';

// You can also set it via URL parameter or localStorage for local debugging.
