import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rawApiBase = process.env.TESLA_API_BASE?.trim();
const configPath = resolve('docs/js/config.js');
const config = readFileSync(configPath, 'utf8');

// TESLA_API_BASE is now optional — the frontend has a built-in production fallback.
// If it IS provided, validate and inject it. Otherwise, skip injection and let
// the frontend use its built-in default.
if (rawApiBase) {
  const apiBase = rawApiBase.replace(/\/+$/, '');
  let parsed;
  try {
    parsed = new URL(apiBase);
  } catch {
    console.error(`⚠ TESLA_API_BASE is not a valid URL: ${rawApiBase}`);
    process.exit(1);
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    console.error(`⚠ TESLA_API_BASE must use HTTPS outside local development: ${apiBase}`);
    process.exit(1);
  }

  if (!parsed.pathname.endsWith('/api')) {
    console.error(`⚠ TESLA_API_BASE must end in /api: ${apiBase}`);
    process.exit(1);
  }

  const nextConfig = config.replace(/__TESLA_API_BASE__/g, apiBase);
  if (nextConfig === config) {
    console.error('⚠ Could not find __TESLA_API_BASE__ placeholder in docs/js/config.js');
    process.exit(1);
  }
  writeFileSync(configPath, nextConfig);
  console.log(`✓ Injected TESLA_API_BASE = ${parsed.origin}${parsed.pathname}`);
} else {
  console.log('ℹ TESLA_API_BASE not set — the frontend will use its built-in production fallback.');
}
