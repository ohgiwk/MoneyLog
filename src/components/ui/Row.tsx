interface RowProps {
  label: string
  value: string
  valueColor: string
  bold?: boolean
}

export function Row({ label, value, valueColor, bold }: RowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}
