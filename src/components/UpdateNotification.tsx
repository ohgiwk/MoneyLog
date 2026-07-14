import { useRegisterSW } from 'virtual:pwa-register/react'
import Modal from './ui/Modal'
import Button from './ui/Button'

export default function UpdateNotification() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()
  const [needRefreshState, setNeedRefresh] = needRefresh

  return (
    <Modal isOpen={needRefreshState} onClose={() => setNeedRefresh(false)}>
      <div className="px-6 py-5">
        <div className="text-2xl mb-3">🆕</div>
        <div className="font-bold text-ink-strong mb-1">アップデートがあります</div>
        <div className="text-sm text-ink-muted mb-5">
          新しいバージョンが利用できます。今すぐ更新しますか？
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setNeedRefresh(false)}>
            あとで
          </Button>
          <Button size="sm" onClick={() => updateServiceWorker(true)}>
            更新する
          </Button>
        </div>
      </div>
    </Modal>
  )
}
