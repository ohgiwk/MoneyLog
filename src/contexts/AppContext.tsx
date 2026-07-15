import { createContext, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Transaction } from '../lib/database.types'
import { useAuth } from '../hooks/useAuth'
import { useCategories } from '../hooks/useCategories'
import { useTheme } from '../hooks/useTheme'
import { todayStr } from '../utils'

export type HeaderBack = {
  title: string
  onBack: () => void
  action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
} | null

interface AppContextValue {
  user: User | null
  authLoading: boolean
  signOut: () => unknown
  month: string
  setMonth: (m: string) => void
  calendarSelectedDate: string | undefined
  setCalendarSelectedDate: (d: string | undefined) => void
  editingTx: Transaction | null
  setEditingTx: (tx: Transaction | null) => void
  headerBack: HeaderBack
  setHeaderBack: (state: HeaderBack) => void
  recordTapKey: number
  shoppingTapKey: number
  bumpRecordTap: () => void
  bumpShoppingTap: () => void
  categories: ReturnType<typeof useCategories>
  theme: ReturnType<typeof useTheme>
  scrollToTop: () => void
  registerScrollToTop: (fn: () => void) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const categories = useCategories()
  const theme = useTheme()
  const scrollToTopFn = useRef<() => void>(() => {})
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | undefined>(undefined)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [headerBack, setHeaderBack] = useState<HeaderBack>(null)
  const [recordTapKey, setRecordTapKey] = useState(0)
  const [shoppingTapKey, setShoppingTapKey] = useState(0)

  return (
    <AppContext.Provider value={{
      user: auth.user,
      authLoading: auth.loading,
      signOut: auth.signOut,
      month,
      setMonth,
      calendarSelectedDate,
      setCalendarSelectedDate,
      editingTx,
      setEditingTx,
      headerBack,
      setHeaderBack,
      recordTapKey,
      shoppingTapKey,
      bumpRecordTap: () => setRecordTapKey(k => k + 1),
      bumpShoppingTap: () => setShoppingTapKey(k => k + 1),
      categories,
      theme,
      scrollToTop: () => scrollToTopFn.current(),
      registerScrollToTop: (fn) => { scrollToTopFn.current = fn },
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
