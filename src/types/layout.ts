export interface HeaderState {
  title: string
  onBack: () => void
  action?: {
    label: string
    onClick: () => void
    disabled?: boolean
    tone?: 'default' | 'danger'
  }
}
