import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getServiceSupabaseClient(): SupabaseClient | null {
  if (cachedClient) {
    console.debug('[Supabase] Reusing cached service client');
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    console.warn('[Supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY is not configured.');
    return null;
  }

  console.log('[Supabase] Initialising service client');
  cachedClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });
  console.log('[Supabase] Service client initialised');

  return cachedClient;
}
