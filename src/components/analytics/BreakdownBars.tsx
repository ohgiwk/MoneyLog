import { categoryInfo } from '../../utils'
import { BarList } from './BarList'
import { formatExpense } from './barListStyle'

interface Props {
  entries: [string, number][]
  total: number
  barColor: string
  valueColor: string
  onItemClick?: (cat: string) => void
}

// カテゴリ別の内訳（合計に対する割合をバーで示す）
export function BreakdownBars({ entries, total, barColor, valueColor, onItemClick }: Props) {
  return (
    <BarList
      rows={entries.map(([cat, amount]) => ({
        key: cat,
        icon: categoryInfo(cat).icon,
        label: cat,
        value: amount,
      }))}
      scale={total}
      total={total}
      format={formatExpense}
      barColor={barColor}
      valueColor={valueColor}
      onItemClick={onItemClick}
    />
  )
}
