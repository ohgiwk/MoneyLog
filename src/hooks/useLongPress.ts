import { useEffect, useRef, useState, type PointerEvent } from 'react'

interface Options {
  // 長押しが成立するまでの時間
  durationMs: number
  // 押している間に指がこの距離まで要素の外へずれても、押し続けているとみなす
  slopPx: number
  onStart?: () => void
  onLongPress: () => void
}

// 要素の長押しを検知する。返り値の handlers を対象の要素に渡して使う。
// わずかな指のずれでは中断せず、要素から大きく離れたときだけ中断する
export function useLongPress<T extends HTMLElement>({
  durationMs,
  slopPx,
  onStart,
  onLongPress,
}: Options) {
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function cancel() {
    setPressing(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // firedRef は直後の click が参照するため、ここではリセットしない
  }

  function start(e: PointerEvent<T>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    cancel()
    // 指が要素の外へずれても move / up を受け取り続ける
    e.currentTarget.setPointerCapture(e.pointerId)
    rectRef.current = e.currentTarget.getBoundingClientRect()
    firedRef.current = false
    setPressing(true)
    onStart?.()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      firedRef.current = true
      setPressing(false)
      onLongPress()
    }, durationMs)
  }

  function move(e: PointerEvent<T>) {
    const rect = rectRef.current
    if (timerRef.current === null || !rect) return
    const outside =
      e.clientX < rect.left - slopPx ||
      e.clientX > rect.right + slopPx ||
      e.clientY < rect.top - slopPx ||
      e.clientY > rect.bottom + slopPx
    if (outside) cancel()
  }

  // 長押しが成立した直後の click かどうか。指を離した時の click を通常のタップとして扱わないために使う
  function consumeLongPress(): boolean {
    if (!firedRef.current) return false
    firedRef.current = false
    return true
  }

  return {
    // 押し始めてから、成立または中断するまで true
    pressing,
    consumeLongPress,
    handlers: {
      onPointerDown: start,
      onPointerMove: move,
      onPointerUp: cancel,
      onPointerCancel: cancel,
    },
  }
}
