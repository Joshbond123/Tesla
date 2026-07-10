# Backend deployment note

GitHub Pages can host this website's static files, and GitHub Actions can build and deploy those files. GitHub Actions cannot be used as a live HTTP backend for browser form submissions because actions only run as jobs after repository events or manual dispatches.

The giveaway features that write to Supabase or send Gmail verification mail require the Express API server in `artifacts/api-server` to be deployed to a real HTTP host.

After deploying the API server, set `window.TESLA_API_BASE` in `docs/js/config.js` to the hosted API URL ending in `/api`, for example:

```js
window.TESLA_API_BASE = 'https://your-api.example.com/api';
```

Required backend environment variables:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ACCESS_TOKEN`
- `SMTP_USER`
- `SMTP_PASS`
- `PUBLIC_BASE_URL`

`PUBLIC_BASE_URL` should point at the public site URL that should receive verification redirects.
