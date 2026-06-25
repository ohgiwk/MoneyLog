import { useState } from 'react'

interface UseFormReturn<T> {
  values: T
  setValue: <K extends keyof T>(key: K, value: T[K]) => void
  setValues: (values: T) => void
  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void
  error: string | null
  setError: (msg: string | null) => void
  reset: () => void
}

export function useForm<T>(initialValues: T): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setValue<K extends keyof T>(key: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function reset() {
    setValues(initialValues)
    setError(null)
    setIsSubmitting(false)
  }

  return { values, setValue, setValues, isSubmitting, setIsSubmitting, error, setError, reset }
}
