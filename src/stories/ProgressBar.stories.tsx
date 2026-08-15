import type { Meta, StoryObj } from '@storybook/react-vite'
import ProgressBar from '../components/ui/ProgressBar'

const meta: Meta<typeof ProgressBar> = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  parameters: { layout: 'centered' },
  argTypes: {
    ratio: { control: { type: 'range', min: 0, max: 1.5, step: 0.05 } },
    color: { control: 'color' },
  },
}
export default meta
type Story = StoryObj<typeof ProgressBar>

export const Default: Story = {
  args: { ratio: 0.6, className: 'w-64' } as Parameters<typeof ProgressBar>[0] & {
    className?: string
  },
  render: (args) => (
    <div className="w-64">
      <ProgressBar {...args} />
    </div>
  ),
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <div>
        <p className="text-xs text-ink-muted mb-1">25%（余裕あり）</p>
        <ProgressBar ratio={0.25} />
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-1">70%（標準）</p>
        <ProgressBar ratio={0.7} />
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-1">90%（注意）</p>
        <ProgressBar ratio={0.9} color="#f59e0b" />
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-1">120%（超過）</p>
        <ProgressBar ratio={1.2} />
      </div>
    </div>
  ),
}
