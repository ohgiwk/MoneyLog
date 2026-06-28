import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdateNotification() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()
  const [needRefreshState, setNeedRefresh] = needRefresh

  if (!needRefreshState) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setNeedRefresh(false)} />
      <div className="relative bg-white rounded-2xl px-6 py-5 mx-4 w-full max-w-xs shadow-xl">
        <div className="text-2xl mb-3">🆕</div>
        <div className="font-bold text-slate-800 mb-1">アップデートがあります</div>
        <div className="text-sm text-slate-500 mb-5">
          新しいバージョンが利用できます。今すぐ更新しますか？
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setNeedRefresh(false)}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm active:bg-slate-50"
          >
            あとで
          </button>
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:bg-emerald-600"
          >
            更新する
          </button>
        </div>
      </div>
    </div>
  )
}
