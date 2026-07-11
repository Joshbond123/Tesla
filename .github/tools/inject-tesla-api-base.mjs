import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rawApiBase = process.env.TESLA_API_BASE?.trim();
if (!rawApiBase) {
  throw new Error('TESLA_API_BASE is required. Configure it as a GitHub repository/environment variable or secret.');
}

const apiBase = rawApiBase.replace(/\/+$/, '');
let parsed;
try {
  parsed = new URL(apiBase);
} catch {
  throw new Error(`TESLA_API_BASE must be a valid URL, received: ${rawApiBase}`);
}

if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
  throw new Error(`TESLA_API_BASE must use HTTPS outside local development, received: ${apiBase}`);
}

if (!parsed.pathname.endsWith('/api')) {
  throw new Error(`TESLA_API_BASE must end in /api, received: ${apiBase}`);
}

const configPath = resolve('docs/js/config.js');
const config = readFileSync(configPath, 'utf8');
const nextConfig = config.replace(/__TESLA_API_BASE__/g, apiBase);
if (nextConfig === config) {
  throw new Error('Could not find __TESLA_API_BASE__ placeholder in docs/js/config.js');
}
writeFileSync(configPath, nextConfig);
console.log(`Injected TESLA_API_BASE for ${parsed.origin}${parsed.pathname}`);
