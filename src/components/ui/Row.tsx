interface RowProps {
  label: string
  value: string
  valueColor: string
  bold?: boolean
}

export function Row({ label, value, valueColor, bold }: RowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}
