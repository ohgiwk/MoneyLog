export interface HeaderState {
  title: string
  onBack: () => void
  isSubmitting?: boolean
  action?: {
    label: string
    onClick: () => void
    disabled?: boolean
    tone?: 'default' | 'danger'
  }
}
