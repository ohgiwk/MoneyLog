import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUpWithEmail(email: string, password: string) {
    return supabase.auth.signUp({ email, password })
  }

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  return { user, session, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }
}
