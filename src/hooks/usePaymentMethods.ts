import { useCallback, useState } from 'react'
import type { PaymentType } from '../constants'

export interface PaymentMethod {
  id: string
  type: PaymentType
  name: string
}

export interface DefaultPayment {
  type: PaymentType
  name: string | null
}

const METHODS_KEY = 'moneylog_payment_methods'
const DEFAULT_KEY = 'moneylog_default_payment'

function loadMethods(): PaymentMethod[] {
  try {
    const raw = localStorage.getItem(METHODS_KEY)
    return raw ? (JSON.parse(raw) as PaymentMethod[]) : []
  } catch {
    return []
  }
}

function saveMethods(methods: PaymentMethod[]) {
  localStorage.setItem(METHODS_KEY, JSON.stringify(methods))
}

function loadDefaultPayment(): DefaultPayment {
  try {
    const raw = localStorage.getItem(DEFAULT_KEY)
    return raw ? (JSON.parse(raw) as DefaultPayment) : { type: 'cash', name: null }
  } catch {
    return { type: 'cash', name: null }
  }
}

function saveDefaultPayment(payment: DefaultPayment) {
  localStorage.setItem(DEFAULT_KEY, JSON.stringify(payment))
}

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>(() => loadMethods())
  const [defaultPayment, setDefaultPaymentState] = useState<DefaultPayment>(() =>
    loadDefaultPayment()
  )

  const addMethod = useCallback((type: PaymentType, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setMethods((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), type, name: trimmed }]
      saveMethods(next)
      return next
    })
  }, [])

  const removeMethod = useCallback(
    (id: string) => {
      setMethods((prev) => {
        const next = prev.filter((m) => m.id !== id)
        saveMethods(next)
        return next
      })
      setDefaultPaymentState((prev) => {
        const removed = methods.find((m) => m.id === id)
        if (!removed || prev.name !== removed.name || prev.type !== removed.type) return prev
        const next: DefaultPayment = { type: 'cash', name: null }
        saveDefaultPayment(next)
        return next
      })
    },
    [methods]
  )

  const setDefaultPayment = useCallback((payment: DefaultPayment) => {
    saveDefaultPayment(payment)
    setDefaultPaymentState(payment)
  }, [])

  return {
    methods,
    defaultPayment,
    addMethod,
    removeMethod,
    setDefaultPayment,
  }
}

export function getDefaultPayment(): DefaultPayment {
  return loadDefaultPayment()
}
