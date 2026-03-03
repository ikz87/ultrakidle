import { createClient } from '@supabase/supabase-js';
import { isRunningInDiscord } from './discord'

// Use the environment variable in browser, but use the local origin 
// in Discord to bypass CSP via the Vite proxy.
const supabaseUrl = isRunningInDiscord()
  ? window.location.origin
  : import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
