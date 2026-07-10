// GitHub Pages runtime API configuration.
// GitHub Actions deploys this static file, but Actions cannot act as a live HTTP backend.
// After deploying the Express API server, set this value to that backend's /api URL.
// Example: window.TESLA_API_BASE = 'https://your-api.example.com/api';
window.TESLA_API_BASE = window.TESLA_API_BASE || '';
