import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Modal>

function CenterModalDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>中央モーダルを開く</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} position="center">
        <div className="px-5 py-5">
          <p className="text-sm text-ink text-center leading-relaxed mb-5">
            本当に削除しますか？この操作は元に戻せません。
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button variant="danger" size="sm" onClick={() => setOpen(false)}>
              削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function BottomModalDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>下からモーダルを開く</Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        position="bottom"
        className="w-full max-w-md p-5 pb-8"
      >
        <h2 className="text-base font-bold text-ink-strong mb-4">タイトル</h2>
        <p className="text-sm text-ink mb-4">ここにフォームが入ります</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={() => setOpen(false)}>確定</Button>
        </div>
      </Modal>
    </div>
  )
}

export const Center: Story = { render: () => <CenterModalDemo /> }
export const Bottom: Story = { render: () => <BottomModalDemo /> }
