import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const projectRef = process.env["SUPABASE_PROJECT_REF"] ?? "puebwzumwqizgbmksrpq";
const supabaseUrl = process.env["SUPABASE_URL"] ?? `https://${projectRef}.supabase.co`;
const anonKey = process.env["SUPABASE_ANON_KEY"] ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZWJ3enVtd3FpemdibWtzcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzk1MDAsImV4cCI6MjA5ODc1NTUwMH0.SRRbUf5LL90p9pFZJRA6u62PXp4pTdU38LHALBeRiec";

let serviceClientPromise: Promise<SupabaseClient> | undefined;

async function resolveServiceKey(): Promise<string> {
  const configured = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (configured) return configured;

  const token = process.env["SUPABASE_ACCESS_TOKEN"];
  if (!token) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ACCESS_TOKEN must be configured for server-side database access.");
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Unable to resolve Supabase service key: ${response.status} ${response.statusText}`);
  }
  const keys = await response.json() as { name?: string; api_key?: string }[];
  const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
  if (!serviceKey) throw new Error("Supabase service_role key was not returned by the Management API.");
  return serviceKey;
}

export const supabasePublic = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  serviceClientPromise ??= resolveServiceKey().then((serviceKey) => {
    logger.info({ projectRef }, "Supabase admin client initialized");
    return createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });
  return serviceClientPromise;
}
