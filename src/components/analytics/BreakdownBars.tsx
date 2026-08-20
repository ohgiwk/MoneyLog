import { categoryInfo, formatYen } from '../../utils'

interface Props {
  entries: [string, number][]
  total: number
  barColor: string
  valueColor: string
  onItemClick?: (cat: string) => void
}

export function BreakdownBars({ entries, total, barColor, valueColor, onItemClick }: Props) {
  if (entries.length === 0) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  return (
    <div className="space-y-2">
      {entries.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0
        const info = categoryInfo(cat)
        const clickable = onItemClick != null
        return (
          <div
            key={cat}
            onClick={clickable ? () => onItemClick(cat) : undefined}
            className={clickable ? 'cursor-pointer relative z-0 group' : undefined}
          >
            {clickable && (
              <div className="absolute -inset-x-1 -inset-y-1 -z-10 rounded-lg transition-colors group-active:bg-surface-hover" />
            )}
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-ink flex items-center gap-1">
                <span>{info.icon}</span>
                {cat}
              </span>
              <span className={`text-xs font-semibold ${valueColor}`}>
                -{formatYen(Math.round(amt))}
              </span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex justify-between items-center pt-1 border-t border-line-subtle">
        <span className="text-xs text-ink-muted">合計</span>
        <span className={`text-sm font-semibold ${valueColor}`}>
          -{formatYen(Math.round(total))}
        </span>
      </div>
    </div>
  )
}
