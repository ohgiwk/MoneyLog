interface Props {
  onSettings: () => void
  onBudget: () => void
  onSetup: () => void
  onWishlist: () => void
  onAnalytics: () => void
  onSavingTips: () => void
  onSignOut: () => void
  onClose: () => void
}

export default function DrawerMenu({ onSettings, onBudget, onSetup, onWishlist, onAnalytics, onSavingTips, onSignOut, onClose }: Props) {
  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 z-20 bg-black/30" onClick={onClose} />
      {/* ドロワー */}
      <div className="fixed top-0 right-0 bottom-0 z-30 w-64 bg-surface shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-line-subtle">
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
            onClick={() => {
              onSetup()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">🚀</span>
            セットアップ
          </button>
          <button
            onClick={() => {
              onWishlist()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">🎯</span>
            目標・欲しいもの
          </button>
          <button
            onClick={() => {
              onBudget()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">💰</span>
            予算
          </button>
          <button
            onClick={() => {
              onAnalytics()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">📊</span>
            分析
          </button>
          <button
            onClick={() => {
              onSavingTips()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">💡</span>
            節約のコツ
          </button>
          <button
            onClick={() => {
              onSettings()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-ink active:bg-surface-subtle text-sm"
          >
            <span className="text-lg">⚙️</span>
            設定
          </button>
        </nav>
        <div className="border-t border-line-subtle py-2">
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
      </div>
    </>
  )
}
