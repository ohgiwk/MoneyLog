import type { Meta, StoryObj } from '@storybook/react-vite'
import IconButton from '../components/ui/IconButton'
import { IconChevronLeft, IconChevronRight, IconX, IconPlus } from '@tabler/icons-react'

const meta: Meta<typeof IconButton> = {
  title: 'UI/IconButton',
  component: IconButton,
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}
export default meta
type Story = StoryObj<typeof IconButton>

export const Default: Story = {
  args: { icon: <IconChevronLeft size={20} />, label: '戻る', size: 'md' },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton icon={<IconChevronLeft size={16} />} label="戻る" size="sm" />
      <IconButton icon={<IconChevronLeft size={20} />} label="戻る" size="md" />
      <IconButton icon={<IconChevronLeft size={22} />} label="戻る" size="lg" />
    </div>
  ),
}

export const AllIcons: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton icon={<IconChevronLeft size={20} />} label="前へ" />
      <IconButton icon={<IconChevronRight size={20} />} label="次へ" />
      <IconButton icon={<IconX size={20} />} label="閉じる" />
      <IconButton icon={<IconPlus size={20} />} label="追加" />
    </div>
  ),
}
