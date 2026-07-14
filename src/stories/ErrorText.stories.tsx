import type { Meta, StoryObj } from '@storybook/react-vite'
import ErrorText from '../components/ui/ErrorText'

const meta: Meta<typeof ErrorText> = {
  title: 'UI/ErrorText',
  component: ErrorText,
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof ErrorText>

export const Default: Story = {
  args: { children: 'カテゴリを選択してください' },
}

export const Empty: Story = {
  args: { children: '' },
  name: '空（非表示）',
}
