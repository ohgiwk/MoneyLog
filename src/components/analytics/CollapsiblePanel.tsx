import { useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { InViewContext } from '../ui/inViewContext'
import { EASE_SOFT } from '../../lib/motion'

export function CollapsiblePanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  // スクロールで画面内に入るまでは隠しておき、入ったら一度だけ表示する
  const inView = useInView(ref, { once: true, amount: 0.2 })
  return (
    <motion.div
      ref={ref}
      className="bg-surface rounded-2xl shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: EASE_SOFT }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-surface-hover"
      >
        <span className="text-sm font-semibold text-ink">{title}</span>
        <svg
          className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.2s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 pb-4 space-y-3">
            <InViewContext.Provider value={inView}>{children}</InViewContext.Provider>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
