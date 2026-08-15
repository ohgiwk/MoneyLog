interface Props {
  value: 'monthly' | 'yearly'
  onChange: (v: 'monthly' | 'yearly') => void
  monthLabel?: string
  yearLabel?: string
}

export default function PeriodToggle({
  value,
  onChange,
  monthLabel = '月',
  yearLabel = '年',
}: Props) {
  return (
    <div className="shrink-0 flex rounded-lg border border-line overflow-hidden text-xs font-medium">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={
          'px-2.5 py-1 ' +
          (value === 'monthly' ? 'bg-primary-500 text-white' : 'bg-surface text-ink-muted')
        }
      >
        {monthLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange('yearly')}
        className={
          'px-2.5 py-1 ' +
          (value === 'yearly' ? 'bg-primary-500 text-white' : 'bg-surface text-ink-muted')
        }
      >
        {yearLabel}
      </button>
    </div>
  )
}
