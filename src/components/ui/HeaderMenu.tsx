import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface HeaderMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  items: HeaderMenuItem[]
}

export default function HeaderMenu({ items }: Props) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClose() {
      setOpen(false)
    }
    document.addEventListener('pointerdown', handleClose)
    return () => document.removeEventListener('pointerdown', handleClose)
  }, [open])

  function handleToggle(e: React.PointerEvent) {
    e.nativeEvent.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setOpen(true)
  }

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={handleToggle}
        onClick={(e) => e.stopPropagation()}
        className="p-1 text-ink-muted active:text-ink"
        aria-label="メニューを開く"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-surface rounded-xl shadow-xl overflow-hidden border border-border min-w-[140px]"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, i) => (
              <div key={i}>
                {i > 0 && <div className="border-t border-border" />}
                <button
                  className={
                    'w-full px-4 py-3 text-left text-sm flex items-center gap-2.5 active:bg-surface-subtle ' +
                    (item.danger ? 'text-danger-500' : 'text-ink')
                  }
                  onClick={() => {
                    setOpen(false)
                    item.onClick()
                  }}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
