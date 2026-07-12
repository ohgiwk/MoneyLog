import { CATEGORY_META, type MultiItem } from './data'

interface MultiStepProps {
  items: MultiItem[]
  showCategoryHeaders: boolean
  onChange: (items: MultiItem[]) => void
}

export function MultiStep({ items, showCategoryHeaders, onChange }: MultiStepProps) {
  // カテゴリごとにグループ化して表示
  const categories = showCategoryHeaders ? [...new Set(items.map((it) => it.category))] : null

  return (
    <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
      {categories
        ? categories.map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {CATEGORY_META[cat]?.icon} {cat}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              {items
                .map((item, i) => ({ item, i }))
                .filter(({ item }) => item.category === cat)
                .map(({ item, i }) => (
                  <div key={i} className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-slate-600 w-28 shrink-0">{item.name}</span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={item.amount}
                        onChange={(e) => {
                          const next = [...items]
                          next[i] = { ...item, amount: e.target.value }
                          onChange(next)
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        円
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ))
        : items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-28 shrink-0">{item.name}</span>
              <div className="flex-1 relative">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...items]
                    next[i] = { ...item, amount: e.target.value }
                    onChange(next)
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  円
                </span>
              </div>
            </div>
          ))}
    </div>
  )
}
