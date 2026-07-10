// Tesla Giveaway — Backend API Configuration
// =============================================
// 
// Configure the backend API URL. Options:
//   1. Local:        http://localhost:10000/api
//   2. Render:       https://YOUR-SERVICE.onrender.com/api
//   3. Custom:       https://your-domain.com/api
//
// To deploy the backend on Render:
//   1. Go to https://dashboard.render.com
//   2. Sign in with GitHub
//   3. Click New > Web Service
//   4. Connect repository: Joshbond123/Tesla
//   5. Set Root Directory: api-server
//   6. Build Command: npm install --legacy-peer-deps && npm run build
//   7. Start Command: npm start
//   8. Add environment variables from api-server/.env.production
//   9. Click Deploy Web Service
//  10. Copy your service URL and put it below.
//  11. ALSO update PUBLIC_BASE_URL in your Render env vars to your Render service URL.

// ═══════════════════════════════════════════════════════════
// CHANGE THIS TO YOUR DEPLOYED API URL:
// ═══════════════════════════════════════════════════════════
window.TESLA_API_BASE = window.TESLA_API_BASE || '';

// You can also set it via URL parameter: ?api_url=https://your-api.onrender.com/api
// Or via localStorage: localStorage.setItem('tesla_api_base', 'https://your-api.onrender.com/api')
