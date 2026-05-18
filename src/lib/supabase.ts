import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './env';

const config = getSupabaseConfig();

export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const supabaseConfig = config;
