# Backend deployment note

GitHub Pages hosts the static website from `docs/`. The browser still needs a live HTTPS API for registration, Supabase writes, session checks, order creation, tracking, and Gmail verification mail. GitHub Actions can build, validate, and deploy the static site, but it cannot be the always-on HTTP backend that receives browser requests.

This repository therefore makes GitHub Actions responsible for backend configuration and deployment validation:

1. Deploy the Express API in `api-server` to any always-on HTTPS Node.js host.
2. Add the API URL as a GitHub repository variable or environment secret named `TESLA_API_BASE`.
3. The value must be an HTTPS URL ending in `/api`, for example `https://your-secure-api.example.com/api`.
4. The GitHub Pages workflow injects that value into `docs/js/config.js` at deploy time.
5. The workflow calls `$TESLA_API_BASE/health` before publishing the site, so a broken or missing backend blocks deployment instead of shipping a broken form.

Required backend environment variables on the API host:

- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_USER`
- `SMTP_PASS`
- `PUBLIC_BASE_URL`

`PUBLIC_BASE_URL` should point at the public API/frontend host that serves `/api/verify` and the dashboard pages used after email verification.
