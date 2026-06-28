import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { authService } from '../lib/services/authService'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email: string, password: string) {
    return authService.signInWithPassword(email, password)
  }

  async function signUpWithEmail(email: string, password: string) {
    return authService.signUp(email, password)
  }

  async function signInWithGoogle() {
    return authService.signInWithGoogle()
  }

  async function signOut() {
    return authService.signOut()
  }

  return { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }
}
