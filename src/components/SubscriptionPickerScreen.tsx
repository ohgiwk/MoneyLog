import Card from './ui/Card'
import { useState } from 'react'
import { SUBSCRIPTION_PRESETS, SUBSCRIPTION_SUBCATEGORIES, type SubscriptionPreset } from '../constants'

interface Props {
  onSelect: (preset: SubscriptionPreset) => void
  onBack: () => void
}

export default function SubscriptionPickerScreen({ onSelect, onBack }: Props) {
  const [activeSubcategory, setActiveSubcategory] = useState(SUBSCRIPTION_SUBCATEGORIES[0].name)

  const filtered = SUBSCRIPTION_PRESETS.filter((p) => p.subcategory === activeSubcategory)

  function formatPrice(preset: SubscriptionPreset) {
    const cycle = preset.cycle === 'monthly' ? '月' : '年'
    if (preset.currency === 'USD') return `$${preset.usdAmount}/${cycle}`
    return `${preset.amount.toLocaleString()}円/${cycle}`
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-subtle">
      {/* ヘッダー */}
      <div className="bg-surface-subtle border-b-2 border-primary-500 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
          <button
            onClick={onBack}
            className="text-ink-muted active:text-ink justify-self-start p-1"
            aria-label="戻る"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="font-semibold text-ink-strong text-center">サブスクを選択</span>
          <span />
        </div>
      </div>

      {/* サブカテゴリタブ */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none border-b border-line-subtle bg-surface sticky top-0 z-10">
        {SUBSCRIPTION_SUBCATEGORIES.map((sub) => (
          <button
            key={sub.name}
            type="button"
            onClick={() => setActiveSubcategory(sub.name)}
            className={
              'flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ' +
              (activeSubcategory === sub.name
                ? 'bg-primary-500 text-white'
                : 'bg-surface-subtle text-ink-muted')
            }
          >
            <span>{sub.icon}</span>
            <span>{sub.name}</span>
          </button>
        ))}
      </div>

      {/* サービス一覧 */}
      <Card className="mx-4 mt-4 mb-6">
        <div className="divide-y divide-line-subtle">
          {filtered.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onSelect(preset)}
              className="w-full flex items-center justify-between px-4 py-3.5 active:bg-surface-hover transition-colors"
            >
              <span className="text-sm text-ink font-medium">{preset.name}</span>
              <span className="text-sm text-primary-400 font-medium ml-4 flex-shrink-0">{formatPrice(preset)}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
