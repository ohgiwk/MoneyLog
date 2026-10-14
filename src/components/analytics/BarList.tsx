import { GrowBar } from '../ui/GrowBar'

export interface BarRow {
  key: string
  icon: string
  label: string
  value: number
}

interface Props {
  rows: BarRow[]
  // バーの長さを 100% とする値（合計に対する割合なら合計、最大値を基準にするなら最大値）
  scale: number
  total: number
  format: (value: number) => string
  barColor: string
  valueColor: string
  onItemClick?: (key: string) => void
}

// 分析画面の横棒グラフ（項目名・値・バーの行と、末尾の合計行）
export function BarList({ rows, scale, total, format, barColor, valueColor, onItemClick }: Props) {
  if (rows.length === 0) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  const clickable = onItemClick != null
  return (
    <div className="space-y-2">
      {rows.map(({ key, icon, label, value }, index) => (
        <div
          key={key}
          onClick={clickable ? () => onItemClick(key) : undefined}
          className={clickable ? 'cursor-pointer relative z-0 group' : undefined}
        >
          {clickable && (
            <div className="absolute -inset-x-1 -inset-y-1 -z-10 rounded-lg transition-colors group-active:bg-surface-hover" />
          )}
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-ink flex items-center gap-1">
              <span>{icon}</span>
              {label}
            </span>
            <span className={`text-xs font-semibold ${valueColor}`}>{format(value)}</span>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
            <GrowBar
              pct={scale > 0 ? (value / scale) * 100 : 0}
              index={index}
              axis="x"
              className={`h-full ${barColor} rounded-full`}
            />
          </div>
        </div>
      ))}
      <div className="flex justify-between items-center pt-1 border-t border-line-subtle">
        <span className="text-xs text-ink-muted">合計</span>
        <span className={`text-sm font-semibold ${valueColor}`}>{format(total)}</span>
      </div>
    </div>
  )
}
