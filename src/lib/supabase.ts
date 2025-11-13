import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://olzjxrwakkhcyqeguotn.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semp4cndha2toY3lxZWd1b3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM3MTgsImV4cCI6MjA3ODUxOTcxOH0.kCvW_8fvxtOWobrt9GGSZc9y3HYBk3P16837itsTxv0';

export const supabase = createClient<Database, 'public'>(supabaseUrl, supabaseAnonKey);
