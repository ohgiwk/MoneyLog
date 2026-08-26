import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmDialog from './ConfirmDialog'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const MENU_HEIGHT = 148

  useEffect(() => {
    if (!menuOpen) return
    function handleClose() {
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handleClose)
    return () => document.removeEventListener('pointerdown', handleClose)
  }, [menuOpen])

  function handleMenuToggle(e: React.PointerEvent) {
    e.nativeEvent.stopPropagation()
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const top =
      rect.bottom + MENU_HEIGHT > window.innerHeight ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setMenuOpen(true)
  }

  return (
    <>
      <div className="relative" onClick={onEdit}>
        <div className="pr-10">{children}</div>
        <button
          ref={btnRef}
          onPointerDown={handleMenuToggle}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center text-ink-muted active:bg-surface-subtle"
          aria-label="メニューを開く"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {menuOpen &&
          createPortal(
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
              className="bg-surface rounded-xl shadow-xl overflow-hidden border border-border min-w-[120px]"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full px-4 py-3 text-left text-sm text-ink flex items-center gap-2.5 active:bg-surface-subtle"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                編集
              </button>
              <div className="border-t border-border" />
              <button
                className="w-full px-4 py-3 text-left text-sm text-ink flex items-center gap-2.5 active:bg-surface-subtle"
                onClick={() => {
                  setMenuOpen(false)
                  onDuplicate()
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                複製
              </button>
              <div className="border-t border-border" />
              <button
                className="w-full px-4 py-3 text-left text-sm text-danger-500 flex items-center gap-2.5 active:bg-surface-subtle"
                onClick={() => {
                  setMenuOpen(false)
                  setConfirmOpen(true)
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
                削除
              </button>
            </div>,
            document.body
          )}
      </div>
      {confirmOpen && (
        <ConfirmDialog
          message={deleteConfirmMessage}
          onConfirm={() => {
            setConfirmOpen(false)
            onDelete()
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  )
}
