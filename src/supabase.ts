import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL və VITE_SUPABASE_PUBLISHABLE_KEY təyin edilməyib.')
}

function isNewSupabaseApiKey(value: string) {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_')
}

function customFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    )
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value))
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization')
    }
    headers.set('apikey', supabaseKey)
    return fetch(input, { ...init, headers })
  }
}

export const supabase = createClient(url, key, {
  global: { fetch: customFetch(key) },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
