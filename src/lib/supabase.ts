import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv]
  if (typeof value !== 'string' || value === '') {
    throw new Error(`環境変数 ${name} が設定されていません`)
  }
  return value
}

const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
