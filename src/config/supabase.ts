import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_API_KEY must be defined in your environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_API_KEY
); 