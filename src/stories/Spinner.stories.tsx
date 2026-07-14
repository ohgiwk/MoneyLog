import type { Meta, StoryObj } from '@storybook/react-vite'
import Spinner from '../components/ui/Spinner'

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof Spinner>

export const Default: Story = {}
