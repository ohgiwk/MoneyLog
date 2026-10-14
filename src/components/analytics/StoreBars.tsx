import { BarList } from './BarList'
import { countOrAmountBars } from './barListStyle'

interface Props {
  entries: [string, number][]
  valueType: 'amount' | 'count'
  storeTypes: { name: string; icon: string }[]
  onItemClick?: (storeName: string) => void
}

export function StoreBars({ entries, valueType, storeTypes, onItemClick }: Props) {
  return (
    <BarList
      rows={entries.map(([storeName, value]) => ({
        key: storeName,
        icon:
          storeName === '未記録'
            ? '−'
            : (storeTypes.find((s) => s.name === storeName)?.icon ?? '🏷️'),
        label: storeName,
        value,
      }))}
      {...countOrAmountBars(entries, valueType)}
      onItemClick={onItemClick}
    />
  )
}
