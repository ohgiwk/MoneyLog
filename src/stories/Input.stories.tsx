import type { Meta, StoryObj } from '@storybook/react-vite'
import Input from '../components/ui/Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'dialog'] },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { variant: 'default', placeholder: 'テキストを入力...', className: 'w-64' },
}

export const Dialog: Story = {
  args: { variant: 'dialog', placeholder: '例：スーパーで購入', className: 'w-64' },
}

export const WithError: Story = {
  args: { variant: 'dialog', placeholder: '金額を入力', error: true, className: 'w-64' },
}

export const Disabled: Story = {
  args: { variant: 'default', value: '無効化されたフィールド', disabled: true, className: 'w-64' },
}

export const Number: Story = {
  args: {
    variant: 'dialog',
    type: 'number',
    inputMode: 'numeric',
    placeholder: '0',
    className: 'w-64',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <Input variant="default" placeholder="デフォルト（フォーム系）" />
      <Input variant="dialog" placeholder="ダイアログ（購入系）" />
      <Input variant="dialog" placeholder="エラー状態" error />
      <Input variant="default" value="無効化" disabled readOnly />
    </div>
  ),
}
