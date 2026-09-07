import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Capture recovery flag NOW — before Supabase clears the hash during init
export const isPasswordRecoveryLink = window.location.hash.includes('type=recovery')
if (isPasswordRecoveryLink) {
  sessionStorage.setItem('arcadia_recovery', '1')
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder'
)
