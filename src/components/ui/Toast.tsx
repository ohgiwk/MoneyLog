import { useEffect } from 'react'
import { motion } from 'motion/react'

interface Props {
  message: string
  actionLabel?: string
  onAction?: () => void
  onClose: () => void
  duration?: number
}

// 退場アニメーションを付ける場合は呼び出し側で AnimatePresence で包む
export default function Toast({ message, actionLabel, onAction, onClose, duration = 5000 }: Props) {
  // message が変わったら表示時間を数え直す
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  return (
    // 57px は MainLayout のヘッダーの高さ
    <div className="fixed top-[calc(57px+env(safe-area-inset-top)+0.5rem)] left-0 right-0 max-w-md mx-auto px-4 z-30 pointer-events-none">
      <motion.div
        role="status"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        className="pointer-events-auto flex items-center gap-3 bg-surface border border-line rounded-xl shadow-lg pl-4 pr-2 py-2"
      >
        <span className="flex-1 min-w-0 text-sm text-ink truncate py-1">{message}</span>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary-500 active:bg-surface-subtle"
          >
            {actionLabel}
          </button>
        )}
      </motion.div>
    </div>
  )
}
