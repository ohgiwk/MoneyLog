function fmtShort(amount: number): string {
  if (amount === 0) return '¥0'
  return `¥${amount.toLocaleString()}`
}

const ROW_BG = ['bg-surface', 'bg-surface-subtle'] as const

interface Row {
  label: string
  meals: Map<string, number>
  future?: boolean
}

interface Props {
  cols: string[]
  rows: Row[]
}

export function FoodTable({ cols, rows }: Props) {
  const hasAnyData = rows.some((r) => !r.future && cols.some((c) => (r.meals.get(c) ?? 0) > 0))
  if (!hasAnyData) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[10px] border-collapse min-w-[320px]">
        <thead>
          <tr className="border-b border-line-subtle">
            <th className="text-left text-ink-muted font-medium py-1 pr-2 w-10 sticky left-0 bg-surface border-r border-line-subtle" />
            {cols.map((col) => (
              <th key={col} className="text-center text-ink-muted font-medium py-1 px-1">
                {col.replace('飲み物', '飲料')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, meals, future }, idx) => {
            const bg = ROW_BG[idx % 2]
            return (
              <tr key={label} className={`border-b border-line-subtle last:border-0 ${bg}`}>
                <td
                  className={`text-ink-muted py-1 pr-2 sticky left-0 ${bg} font-medium border-r border-line-subtle`}
                >
                  {label}
                </td>
                {cols.map((col) => {
                  const amt = meals.get(col) ?? 0
                  const isFutureZero = future && amt === 0
                  return (
                    <td
                      key={col}
                      className={`text-center py-1 px-1 tabular-nums ${amt > 0 ? 'text-ink' : 'text-ink-muted opacity-30'}`}
                    >
                      {isFutureZero ? '-' : fmtShort(amt)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
