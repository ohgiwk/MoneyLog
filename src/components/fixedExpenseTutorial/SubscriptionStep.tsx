import { useState } from 'react'
import { SUBSCRIPTION_PRESETS, SUBSCRIPTION_SUBCATEGORIES } from '../../constants'

interface SubscriptionStepProps {
  selected: Set<string>
  cycleOverrides: Map<string, 'monthly' | 'yearly'>
  onToggle: (name: string) => void
  onCycleChange: (name: string, cycle: 'monthly' | 'yearly') => void
}

export function SubscriptionStep({
  selected,
  cycleOverrides,
  onToggle,
  onCycleChange,
}: SubscriptionStepProps) {
  const [activeTab, setActiveTab] = useState(SUBSCRIPTION_SUBCATEGORIES[0].name)

  const presets = SUBSCRIPTION_PRESETS.filter((p) => p.subcategory === activeTab)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* タブ */}
      <div className="flex flex-wrap gap-1 pb-2 mb-3 shrink-0">
        {SUBSCRIPTION_SUBCATEGORIES.map((sub) => {
          const hasSelected = SUBSCRIPTION_PRESETS.some(
            (p) => p.subcategory === sub.name && selected.has(p.name)
          )
          return (
            <button
              key={sub.name}
              type="button"
              onClick={() => setActiveTab(sub.name)}
              className={
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition border ' +
                (activeTab === sub.name
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-slate-500 border-slate-200')
              }
            >
              <span>{sub.icon}</span>
              <span>{sub.name}</span>
              {hasSelected && (
                <span
                  className={
                    'w-1.5 h-1.5 rounded-full ' +
                    (activeTab === sub.name ? 'bg-white' : 'bg-primary-400')
                  }
                />
              )}
            </button>
          )
        })}
      </div>
      {/* サービス一覧 */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {presets.map((p) => {
          const checked = selected.has(p.name)
          const cycle = cycleOverrides.get(p.name) ?? p.cycle
          return (
            <div
              key={p.name}
              className={
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition ' +
                (checked ? 'border-primary-400 bg-primary-50' : 'border-slate-200 bg-white')
              }
            >
              <button
                type="button"
                onClick={() => onToggle(p.name)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <span
                  className={
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ' +
                    (checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300')
                  }
                >
                  {checked && <span className="text-white text-xs font-bold">✓</span>}
                </span>
                <span className="flex-1 text-sm text-slate-700 truncate">{p.name}</span>
              </button>
              {/* 月/年トグル（年額プランがある場合のみ表示） */}
              {(p.yearlyAmount != null || p.cycle === 'yearly') && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => onCycleChange(p.name, 'monthly')}
                    className={
                      'px-2 py-1 transition ' +
                      (cycle === 'monthly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')
                    }
                  >
                    月
                  </button>
                  <button
                    type="button"
                    onClick={() => onCycleChange(p.name, 'yearly')}
                    className={
                      'px-2 py-1 transition border-l border-slate-200 ' +
                      (cycle === 'yearly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')
                    }
                  >
                    年
                  </button>
                </div>
              )}
              <span className="text-xs text-slate-400 shrink-0 w-24 text-right">
                {p.currency === 'USD'
                  ? cycle === 'yearly'
                    ? `$${(p.usdYearlyAmount ?? p.usdAmount ?? 0).toLocaleString()}/年`
                    : `$${(p.usdAmount ?? 0).toLocaleString()}/月`
                  : cycle === 'yearly'
                    ? `${(p.yearlyAmount ?? p.amount).toLocaleString()}円/年`
                    : `${p.amount.toLocaleString()}円/月`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
