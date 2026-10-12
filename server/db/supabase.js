import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import WebSocket from 'ws';

dotenv.config();

// Ensure WebSocket polyfill exists for Node.js runtimes
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseUrl !== 'https://your-supabase-project.supabase.co' && supabaseKey && supabaseKey !== 'your-supabase-anon-key')
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      realtime: {
        transport: WebSocket
      }
    })
  : null;

if (supabase) {
  console.log('⚡ Supabase Client Connected to:', supabaseUrl);
} else {
  console.log('ℹ️ Supabase credentials not set or placeholder - Using Enterprise Stateful DB engine.');
}
