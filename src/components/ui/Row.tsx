interface RowProps {
  label: string
  value: string
  valueColor: string
  bold?: boolean
  // グラフの凡例を兼ねる色の印（Tailwind の bg-* クラス）
  swatch?: string
}

export function Row({ label, value, valueColor, bold, swatch }: RowProps) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`flex items-center gap-2 text-sm ${bold ? 'font-semibold text-ink' : 'text-ink-muted'}`}
      >
        {swatch && <span aria-hidden className={`w-2.5 h-2.5 rounded-sm ${swatch}`} />}
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}
