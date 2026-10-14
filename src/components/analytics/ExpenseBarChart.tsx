import { formatYen } from '../../utils'
import { GrowBar } from '../ui/GrowBar'

function niceMax(value: number, steps = 4): number {
  if (value <= 0) return steps
  const rough = value / steps
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const factor = [1, 2, 3, 5, 10].find((f) => f * mag >= rough) ?? 10
  return factor * mag * steps
}

interface Entry {
  label: string
  amount: number
  showLabel?: boolean
  // 見込み（未確定）の値。色を薄くして確定した値と見分ける
  projected?: boolean
}

interface Props {
  entries: Entry[]
  barGap?: 'gap-px' | 'gap-1'
}

const CHART_H = 120
const LABEL_W = 48
const LABEL_H = 16
const BAR_H = CHART_H - LABEL_H
const GRID_RATIOS = [1, 0.75, 0.5, 0.25]

export function ExpenseBarChart({ entries, barGap = 'gap-px' }: Props) {
  const rawMax = Math.max(...entries.map((e) => e.amount), 1)
  const max = niceMax(rawMax)
  const hasData = entries.some((e) => e.amount > 0)

  if (!hasData) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }

  return (
    <div className="flex gap-1">
      <div
        className="flex flex-col justify-between pb-4 shrink-0"
        style={{ width: LABEL_W, height: CHART_H }}
      >
        {GRID_RATIOS.map((r) => (
          <span key={r} className="text-[9px] text-ink-muted text-right leading-none">
            {formatYen(Math.round(max * r))}
          </span>
        ))}
      </div>

      <div className="relative flex-1 min-w-0" style={{ height: CHART_H }}>
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: 0, height: BAR_H }}
        >
          {GRID_RATIOS.map((r) => (
            <div
              key={r}
              className="absolute left-0 right-0 border-t border-line-subtle"
              style={{ top: `${(1 - r) * 100}%` }}
            />
          ))}
        </div>

        <div className={`absolute inset-0 flex items-end ${barGap} overflow-x-auto`}>
          {entries.map(({ label, amount, showLabel = true, projected = false }, index) => {
            const pct = amount > 0 ? (amount / max) * 100 : 0
            return (
              <div
                // 同じラベルが複数回出る（年をまたぐ月など）ことがあるため位置も含める
                key={`${index}:${label}`}
                className="flex flex-col items-center flex-1 min-w-0"
                style={{ height: '100%' }}
              >
                <div className="w-full flex flex-col justify-end" style={{ height: BAR_H }}>
                  {amount > 0 && (
                    <GrowBar
                      pct={pct}
                      index={index}
                      axis="y"
                      className={`w-full rounded-t-sm ${projected ? 'bg-danger-400/35' : 'bg-danger-400'}`}
                    />
                  )}
                </div>
                <div
                  className="text-[9px] text-ink-muted leading-none whitespace-nowrap"
                  style={{
                    height: LABEL_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showLabel ? label : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
