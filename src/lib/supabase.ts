import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  interface Window {
    Clerk: any;
  }
}

export const createSupabaseClient = async () => {
  const clerkToken = await window.Clerk?.session?.getToken({ template: 'supabase' });
  
  const headers: Record<string, string> = {};
  if (clerkToken) {
    headers['Authorization'] = `Bearer ${clerkToken}`;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers,
    },
  });
};
