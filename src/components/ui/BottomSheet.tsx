import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'

interface RightAction {
  label?: string
  onClick: () => void
  disabled?: boolean
  tone?: 'danger'
}

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  rightAction?: RightAction
  footer?: ReactNode
  children: ReactNode
  height?: string
}

export default function BottomSheet({ isOpen, onClose, title, rightAction, footer, children, height = '92dvh' }: Props) {
  const dragControls = useDragControls()

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="bs-backdrop"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="bs-sheet"
            className="fixed left-0 right-0 max-w-md mx-auto z-50 bg-surface-subtle rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{
              maxHeight: `min(${height}, calc(100dvh - var(--keyboard-height, 0px) - env(safe-area-inset-top, 0px) - 16px))`,
              bottom: 'var(--keyboard-height, 0px)',
              transition: 'bottom 0.25s ease-out, max-height 0.25s ease-out',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.1, bottom: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose()
              }
            }}
          >
            {/* ドラッグハンドル＋ヘッダー */}
            <div
              className="flex-shrink-0"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none', cursor: 'grab' }}
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-ink-muted/40" />
              </div>
              <div className="flex items-center justify-between px-4 pt-1 pb-2">
                <h2 className="text-base font-semibold text-ink-strong">{title}</h2>
                <div className="flex items-center gap-1">
                  {rightAction && (
                    <button
                      type="button"
                      onClick={rightAction.onClick}
                      disabled={rightAction.disabled}
                      className={
                        'flex items-center justify-center disabled:opacity-40 ' +
                        (rightAction.label
                          ? 'text-sm font-medium px-3 py-1.5 rounded-lg '
                          : 'w-8 h-8 rounded-full ') +
                        (rightAction.tone === 'danger'
                          ? 'text-danger-500 active:bg-danger-50 dark:active:bg-danger-950/40'
                          : 'text-primary-500 active:bg-primary-50 dark:active:bg-primary-950/40')
                      }
                    >
                      {rightAction.label ?? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover"
                    aria-label="閉じる"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* スクロール可能なコンテンツエリア */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
              onFocus={(e) => {
                const el = e.target as HTMLElement
                if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') return
                const container = e.currentTarget as HTMLElement
                setTimeout(() => {
                  const elRect = el.getBoundingClientRect()
                  const containerRect = container.getBoundingClientRect()
                  if (elRect.bottom > containerRect.bottom) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                }, 300)
              }}
            >
              {children}
            </div>

            {/* フッター（保存ボタン等） */}
            {footer && (
              <div
                className="flex-shrink-0 px-4 pt-3 bg-surface-subtle"
                style={{ paddingBottom: 'max(0.75rem, calc(2rem + env(safe-area-inset-bottom) - var(--keyboard-height, 0px)))' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
