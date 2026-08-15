import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'

interface Props {
  onSignOut: () => void
  onClose: () => void
}

export default function DrawerMenu({ onSignOut, onClose }: Props) {
  const navigate = useNavigate()

  function go(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* オーバーレイ */}
      <motion.div
        className="fixed inset-0 z-20 bg-black/30"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      {/* ドロワー */}
      <motion.div
        className="fixed top-0 right-0 bottom-0 z-30 w-64 bg-surface shadow-xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.25 }}
      >
        <div className="flex items-center justify-between px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-line-subtle">
          <span className="font-semibold text-ink">メニュー</span>
          <button
            onClick={onClose}
            className="text-ink-muted active:text-ink text-xl px-1"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 py-2">
          <button
            onClick={() => go('/setup')}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">🚀</span>
            セットアップ
          </button>
          <button
            onClick={() => go('/budget')}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">💰</span>
            予算
          </button>
          <button
            onClick={() => go('/saving-tips')}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">💡</span>
            節約のコツ
          </button>
          <button
            onClick={() => go('/achievements')}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">🏆</span>
            実績
          </button>
          <button
            onClick={() => go('/settings')}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">⚙️</span>
            設定
          </button>
        </nav>
        <div className="border-t border-line-subtle py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              onSignOut()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-danger-500 active:bg-danger-50 text-sm"
          >
            <span className="text-lg">🚪</span>
            ログアウト
          </button>
        </div>
      </motion.div>
    </>
  )
}
