import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
  console.warn('⚠️ [Supabase Warning]: SUPABASE_URL or SUPABASE_ANON_KEY is not set or using placeholder in .env');
}

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => {
  return Boolean(supabase);
};

export default supabase;
