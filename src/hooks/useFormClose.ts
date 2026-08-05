import { useRef } from 'react'

export function useFormClose(onClose: () => void) {
  const closedRef = useRef(false)
  function closeAndNotify() {
    closedRef.current = true
    onClose()
  }
  return { closedRef, closeAndNotify }
}
