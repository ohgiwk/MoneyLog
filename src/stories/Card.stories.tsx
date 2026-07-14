import type { Meta, StoryObj } from '@storybook/react-vite'
import Card from '../components/ui/Card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    className: 'w-72',
    children: (
      <div className="divide-y divide-line-subtle">
        <div className="px-4 py-3 text-sm text-ink">アイテム 1</div>
        <div className="px-4 py-3 text-sm text-ink">アイテム 2</div>
        <div className="px-4 py-3 text-sm text-ink">アイテム 3</div>
      </div>
    ),
  },
}

export const WithHeader: Story = {
  render: () => (
    <Card className="w-72">
      <div className="px-4 py-3 border-b border-line-subtle bg-surface-hover">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">セクション</span>
      </div>
      <div className="divide-y divide-line-subtle">
        <div className="px-4 py-3.5 text-sm text-ink flex items-center justify-between">
          <span>設定項目</span>
          <span className="text-ink-muted">›</span>
        </div>
        <div className="px-4 py-3.5 text-sm text-ink flex items-center justify-between">
          <span>別の設定</span>
          <span className="text-ink-muted">›</span>
        </div>
      </div>
    </Card>
  ),
}
