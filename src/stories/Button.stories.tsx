import type { Meta, StoryObj } from '@storybook/react-vite'
import Button from '../components/ui/Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'fab'] },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: '保存する' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'キャンセル' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: '削除する' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: '削除する', className: 'text-danger-500' },
}

export const FAB: Story = {
  args: { variant: 'primary', size: 'fab', children: '記録する', className: 'w-[60%]' },
}

export const Disabled: Story = {
  args: { variant: 'primary', children: '記録中...', disabled: true },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <Button variant="primary">プライマリ</Button>
      <Button variant="secondary">セカンダリ</Button>
      <Button variant="danger">危険操作</Button>
      <Button variant="ghost" className="text-danger-500">ゴースト（削除）</Button>
      <Button variant="primary" size="sm">小サイズ</Button>
      <Button variant="primary" size="lg">大サイズ</Button>
      <Button variant="primary" size="fab" className="w-full rounded-[2rem]">FAB</Button>
      <Button variant="primary" disabled>無効化</Button>
    </div>
  ),
}
