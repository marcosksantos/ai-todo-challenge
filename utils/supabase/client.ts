// AI Todo Copilot - Supabase Client (Browser)
// Creates a Supabase client for use in Client Components

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for browser-side usage.
 * Should only be used in Client Components.
 * 
 * @returns Supabase client instance
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

