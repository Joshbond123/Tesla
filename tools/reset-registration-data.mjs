import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to reset registration data.');

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const tables = [
  ['tracking_data', 'created_at'],
  ['orders', 'created_at'],
  ['delivery_details', 'created_at'],
  ['selected_cars', 'created_at'],
  ['user_sessions', 'created_at'],
  ['giveaway_users', 'created_at'],
];

for (const [table, column] of tables) {
  const { error } = await supabase.from(table).delete().not(column, 'is', null);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`Cleared ${table}`);
}
