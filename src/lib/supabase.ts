import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qepuumjoultfduzfglzp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHV1bWpvdWx0ZmR1emZnbHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExOTM1NjAsImV4cCI6MjEwNjc2OTU2MH0.XQcQa-ZtXj1ygaLc71n9H4y4xrbxUV79CvJ55CcjRVo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
