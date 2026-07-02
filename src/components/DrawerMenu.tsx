interface Props {
  onSettings: () => void
  onBudget: () => void
  onSetup: () => void
  onWishlist: () => void
  onAnalytics: () => void
  onSignOut: () => void
  onClose: () => void
}

export default function DrawerMenu({ onSettings, onBudget, onSetup, onWishlist, onAnalytics, onSignOut, onClose }: Props) {
  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 z-20 bg-black/30" onClick={onClose} />
      {/* ドロワー */}
      <div className="fixed top-0 right-0 bottom-0 z-30 w-64 bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <span className="font-semibold text-slate-700">メニュー</span>
          <button
            onClick={onClose}
            className="text-slate-400 active:text-slate-600 text-xl px-1"
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
            className="w-full flex items-center gap-3 px-5 py-3.5 text-slate-700 active:bg-slate-50 text-sm"
          >
            <span className="text-lg">🚀</span>
            セットアップ
          </button>
          <button
            onClick={() => {
              onWishlist()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-slate-700 active:bg-slate-50 text-sm"
          >
            <span className="text-lg">🎯</span>
            目標・欲しいもの
          </button>
          <button
            onClick={() => {
              onBudget()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-slate-700 active:bg-slate-50 text-sm"
          >
            <span className="text-lg">💰</span>
            予算
          </button>
          <button
            onClick={() => {
              onAnalytics()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-slate-700 active:bg-slate-50 text-sm"
          >
            <span className="text-lg">📊</span>
            分析
          </button>
          <button
            onClick={() => {
              onSettings()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-slate-700 active:bg-slate-50 text-sm"
          >
            <span className="text-lg">⚙️</span>
            設定
          </button>
        </nav>
        <div className="border-t border-slate-100 py-2">
          <button
            onClick={() => {
              onSignOut()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-rose-500 active:bg-rose-50 text-sm"
          >
            <span className="text-lg">🚪</span>
            ログアウト
          </button>
        </div>
      </div>
    </>
  )
}
