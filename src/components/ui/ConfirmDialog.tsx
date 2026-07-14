import Modal from './Modal'
import Button from './Button'

interface Props {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  message,
  confirmLabel = '削除',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal isOpen onClose={onCancel}>
      <div className="px-5 py-5">
        <p className="text-sm text-ink text-center leading-relaxed mb-5">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
