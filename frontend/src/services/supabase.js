import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const getSupabaseConfigInfo = () => {
  return {
    configured: isSupabaseConfigured(),
    url: supabaseUrl ? (supabaseUrl.length > 30 ? `${supabaseUrl.substring(0, 25)}...` : supabaseUrl) : 'Not configured',
    hasKey: Boolean(supabaseAnonKey)
  };
};

export * from './supabaseService';

export default supabase;
