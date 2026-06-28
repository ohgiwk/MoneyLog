import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdateNotification() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()
  const [needRefreshState] = needRefresh

  useEffect(() => {
    if (needRefreshState) {
      // 2秒後に自動更新
      const timer = setTimeout(() => {
        updateServiceWorker(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [needRefreshState, updateServiceWorker])

  if (!needRefreshState) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-max max-w-xs">
      <div className="bg-emerald-500 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2">
        <span className="animate-spin text-base">⟳</span>
        <span>新しいバージョンに更新中...</span>
      </div>
    </div>
  )
}
