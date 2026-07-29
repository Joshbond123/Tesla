# Backend deployment

GitHub Pages hosts the static website from `docs/`. Browser API calls must target a live HTTPS backend whose base URL ends in `/api`.

## Required configuration

Set one of the following in the GitHub repository or `github-pages` environment:

- `TESLA_API_BASE` — full API base URL ending in `/api`.
- Or `SUPABASE_PROJECT_REF` plus optional `SUPABASE_FUNCTION_NAME` — the Pages workflow derives `https://<project-ref>.supabase.co/functions/v1/<function-name>/api` automatically.

The Pages workflow injects the resolved URL into `docs/js/config.js`, verifies the injected file, then smoke-tests `$TESLA_API_BASE/health` before publishing. If the backend is missing or unhealthy, deployment fails instead of publishing a broken form.

## Supabase Edge Function convention

The expected production Edge Function name is `tesla-api`, so the API base is:

```text
https://<project-ref>.supabase.co/functions/v1/tesla-api/api
```

Deploy it with the Supabase CLI after setting the project secrets used by the backend (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, SMTP settings, and `PUBLIC_BASE_URL`).
