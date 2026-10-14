import { formatYen } from '../../utils'

export const formatExpense = (value: number) => `-${formatYen(Math.round(value))}`

// 記録数／合計額を、最大値を基準にしたバーで並べるグラフ（店舗種別・支払い方法別）の共通設定
export function countOrAmountBars(entries: [string, number][], valueType: 'amount' | 'count') {
  const values = entries.map(([, v]) => v)
  return {
    scale: Math.max(0, ...values),
    total: values.reduce((sum, v) => sum + v, 0),
    format: valueType === 'amount' ? formatExpense : (v: number) => `${v}件`,
    barColor: valueType === 'amount' ? 'bg-danger-400' : 'bg-indigo-400',
    valueColor: valueType === 'amount' ? 'text-danger-500' : 'text-ink',
  }
}
