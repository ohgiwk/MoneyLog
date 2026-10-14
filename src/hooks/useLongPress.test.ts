import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { useLongPress } from './useLongPress'

// 要素の範囲は (100,100)〜(180,180)
function pointer(x: number, y: number, extra: Partial<PointerEvent<HTMLElement>> = {}) {
  return {
    pointerType: 'touch',
    button: 0,
    pointerId: 1,
    clientX: x,
    clientY: y,
    currentTarget: {
      setPointerCapture: vi.fn(),
      getBoundingClientRect: () => ({ left: 100, top: 100, right: 180, bottom: 180 }),
    },
    ...extra,
  } as unknown as PointerEvent<HTMLElement>
}

function setup() {
  const onStart = vi.fn()
  const onLongPress = vi.fn()
  const hook = renderHook(() =>
    useLongPress<HTMLElement>({ durationMs: 500, slopPx: 24, onStart, onLongPress })
  )
  return { ...hook, onStart, onLongPress }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useLongPress', () => {
  it('押し続けると指定時間後に成立し、押している間だけ pressing が true になる', () => {
    const { result, onStart, onLongPress } = setup()
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    expect(result.current.pressing).toBe(true)
    expect(onStart).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(onLongPress).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(result.current.pressing).toBe(false)
  })

  it('成立前に指を離すと成立しない', () => {
    const { result, onLongPress } = setup()
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => result.current.handlers.onPointerUp())
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onLongPress).not.toHaveBeenCalled()
    expect(result.current.pressing).toBe(false)
  })

  it('指が許容範囲内でずれても中断しない', () => {
    const { result, onLongPress } = setup()
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    // 右端 180 から 24px 外まで
    act(() => result.current.handlers.onPointerMove(pointer(204, 140)))
    expect(result.current.pressing).toBe(true)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('指が許容範囲を超えて外れると中断する', () => {
    const { result, onLongPress } = setup()
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    act(() => result.current.handlers.onPointerMove(pointer(205, 140)))
    expect(result.current.pressing).toBe(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('タッチが打ち切られたら中断する', () => {
    const { result, onLongPress } = setup()
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    act(() => result.current.handlers.onPointerCancel())
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('マウスの左ボタン以外では始まらない', () => {
    const { result, onStart } = setup()
    act(() =>
      result.current.handlers.onPointerDown(pointer(140, 140, { pointerType: 'mouse', button: 2 }))
    )
    expect(result.current.pressing).toBe(false)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('consumeLongPress は成立直後の1回だけ true を返す', () => {
    const { result } = setup()
    expect(result.current.consumeLongPress()).toBe(false)
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    act(() => result.current.handlers.onPointerUp())
    expect(result.current.consumeLongPress()).toBe(true)
    expect(result.current.consumeLongPress()).toBe(false)
  })

  it('成立した長押しの後に押し直すと、前回の成立は持ち越さない', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    act(() => result.current.handlers.onPointerDown(pointer(140, 140)))
    act(() => result.current.handlers.onPointerUp())
    expect(result.current.consumeLongPress()).toBe(false)
  })
})
