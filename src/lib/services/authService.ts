import { supabase } from '../supabase'

export const authService = {
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(callback),
  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signUp: (email: string, password: string) => supabase.auth.signUp({ email, password }),
  signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google' }),
  signOut: () => supabase.auth.signOut(),
}
