import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []

          return document.cookie.split(';').map((c) => {
            const [name, value] = c.split('=')
            return { name: name.trim(), value }
          })
        },
        setAll(cookiesToSet) {
          // FORCE insecure cookies for HTTP IP access
          // We remove the "Secure" attribute and use "SameSite=Lax"
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${value}; path=/; SameSite=Lax`
          })
        },
      },
    }
  )
}

