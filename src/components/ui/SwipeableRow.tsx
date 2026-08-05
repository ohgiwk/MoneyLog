import { useRef, useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

const ACTION_WIDTH = 72
const ACTIONS_TOTAL = ACTION_WIDTH * 2

interface Props {
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  deleteConfirmMessage?: string
  children: React.ReactNode
}

export default function SwipeableRow({
  onEdit,
  onDelete,
  onDuplicate,
  deleteConfirmMessage = 'この記録を削除しますか？',
  children,
}: Props) {
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const openRef = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const axisLocked = useRef<'h' | 'v' | null>(null)
  const moved = useRef(false)

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    startX.current = e.clientX
    startY.current = e.clientY
    axisLocked.current = null
    moved.current = false
    setIsDragging(true)
  }

  function onPointerMove(e: React.PointerEvent) {
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (!axisLocked.current) {
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        axisLocked.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
      }
    }
    if (axisLocked.current !== 'h') return
    e.preventDefault()
    moved.current = true
    const base = openRef.current ? -ACTIONS_TOTAL : 0
    const next = Math.min(0, Math.max(-ACTIONS_TOTAL, base + dx))
    setOffset(next)
  }

  function onPointerUp(e: React.PointerEvent) {
    setIsDragging(false)
    const dx = Math.abs(e.clientX - startX.current)
    const dy = Math.abs(e.clientY - startY.current)
    const isTap = dx < 8 && dy < 8
    if (!moved.current) {
      if (isTap) {
        if (openRef.current) {
          setOffset(0); openRef.current = false
        } else {
          onEdit()
        }
      }
      return
    }
    if (axisLocked.current !== 'h') return
    const swipeDx = e.clientX - startX.current
    if (openRef.current) {
      if (swipeDx > ACTIONS_TOTAL / 2) {
        setOffset(0); openRef.current = false
      } else {
        setOffset(-ACTIONS_TOTAL); openRef.current = true
      }
    } else {
      if (swipeDx < -ACTIONS_TOTAL / 2) {
        setOffset(-ACTIONS_TOTAL); openRef.current = true
      } else {
        setOffset(0); openRef.current = false
      }
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ width: ACTIONS_TOTAL }}
      >
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDuplicate(); setOffset(0); openRef.current = false }}
          className="flex flex-col items-center justify-center gap-0.5 text-white bg-ink-muted active:bg-ink"
          style={{ width: ACTION_WIDTH }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span className="text-[10px] font-medium">複製</span>
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }}
          className="flex flex-col items-center justify-center gap-0.5 text-white bg-danger-500 active:bg-danger-600"
          style={{ width: ACTION_WIDTH }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
          <span className="text-[10px] font-medium">削除</span>
        </button>
      </div>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative bg-surface touch-pan-y select-none"
      >
        {children}
      </div>
      {confirmOpen && (
        <ConfirmDialog
          message={deleteConfirmMessage}
          onConfirm={() => { setConfirmOpen(false); onDelete() }}
          onCancel={() => { setConfirmOpen(false); setOffset(0); openRef.current = false }}
        />
      )}
    </div>
  )
}
