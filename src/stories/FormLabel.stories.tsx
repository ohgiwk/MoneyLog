import type { Meta, StoryObj } from '@storybook/react-vite'
import FormLabel from '../components/ui/FormLabel'
import Input from '../components/ui/Input'

const meta: Meta<typeof FormLabel> = {
  title: 'UI/FormLabel',
  component: FormLabel,
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof FormLabel>

export const Default: Story = {
  args: { children: '商品名' },
}

export const Required: Story = {
  args: { children: '金額', required: true },
}

export const WithInput: Story = {
  render: () => (
    <div className="flex flex-col gap-1 w-64">
      <FormLabel required>カテゴリ</FormLabel>
      <Input variant="dialog" placeholder="例：食費" />
    </div>
  ),
}
