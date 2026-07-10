// Tesla Giveaway — Backend API Configuration
// =============================================
// 
// For the full experience (email verification, database, etc.),
// deploy the Express API server (in /api-server/) to Render:
//
//   1. Go to https://dashboard.render.com
//   2. Sign in with GitHub
//   3. Click New > Web Service
//   4. Connect repository: Joshbond123/Tesla
//   5. Set Root Directory: api-server
//   6. Build Command: npm install --legacy-peer-deps && npm run build
//   7. Start Command: npm start
//   8. Add environment variables from api-server/.env.production
//   9. Click Deploy Web Service
//  10. Copy your service URL (e.g., https://tesla-giveaway-api.onrender.com)
//  11. Uncomment and update the line below:
//
// window.TESLA_API_BASE = 'https://YOUR-SERVICE.onrender.com/api';

window.TESLA_API_BASE = window.TESLA_API_BASE || '';
