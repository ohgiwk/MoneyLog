import { PAYMENT_TYPES } from '../../constants'
import { formatYen } from '../../utils'

interface Props {
  entries: [string, number][]
  valueType: 'amount' | 'count'
  onItemClick?: (paymentType: string) => void
}

export function PaymentBars({ entries, valueType, onItemClick }: Props) {
  if (entries.length === 0) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  const max = Math.max(...entries.map(([, v]) => v))
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const barColor = valueType === 'amount' ? 'bg-danger-400' : 'bg-indigo-400'
  const valueColor = valueType === 'amount' ? 'text-danger-500' : 'text-ink'
  const fmt = (v: number) => (valueType === 'amount' ? `-${formatYen(Math.round(v))}` : `${v}件`)
  return (
    <div className="space-y-2">
      {entries.map(([paymentType, value]) => {
        const info = PAYMENT_TYPES.find((p) => p.type === paymentType)
        const icon = paymentType === '未記録' ? '−' : (info?.icon ?? '💳')
        const label = paymentType === '未記録' ? '未記録' : (info?.name ?? paymentType)
        const pct = max > 0 ? (value / max) * 100 : 0
        const clickable = onItemClick != null
        return (
          <div
            key={paymentType}
            onClick={clickable ? () => onItemClick(paymentType) : undefined}
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
              <span className={`text-xs font-semibold ${valueColor}`}>{fmt(value)}</span>
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
        <span className={`text-sm font-semibold ${valueColor}`}>{fmt(total)}</span>
      </div>
    </div>
  )
}
