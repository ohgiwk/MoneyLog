import { PAYMENT_TYPES } from '../../constants'
import { BarList } from './BarList'
import { countOrAmountBars } from './barListStyle'

interface Props {
  entries: [string, number][]
  valueType: 'amount' | 'count'
  onItemClick?: (paymentType: string) => void
}

export function PaymentBars({ entries, valueType, onItemClick }: Props) {
  return (
    <BarList
      rows={entries.map(([paymentType, value]) => {
        const info = PAYMENT_TYPES.find((p) => p.type === paymentType)
        const unrecorded = paymentType === '未記録'
        return {
          key: paymentType,
          icon: unrecorded ? '−' : (info?.icon ?? '💳'),
          label: unrecorded ? '未記録' : (info?.name ?? paymentType),
          value,
        }
      })}
      {...countOrAmountBars(entries, valueType)}
      onItemClick={onItemClick}
    />
  )
}
