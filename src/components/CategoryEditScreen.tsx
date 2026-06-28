import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import CategoryList from './CategoryList'

type TabKey = 'expense' | 'income' | 'fixed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'expense', label: '支出' },
  { key: 'income', label: '収入' },
  { key: 'fixed', label: '固定費' },
]

interface Props {
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  fixedCategories: CategoryInfo[]
  onUpdateExpense: (cats: CategoryInfo[]) => void
  onUpdateIncome: (cats: CategoryInfo[]) => void
  onUpdateFixed: (cats: CategoryInfo[]) => void
  onBack: () => void
}

export default function CategoryEditScreen({
  expenseCategories,
  incomeCategories,
  fixedCategories,
  onUpdateExpense,
  onUpdateIncome,
  onUpdateFixed,
  onBack,
}: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [activeTab, setActiveTab] = useState<TabKey>('expense')

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 active:text-slate-600 text-xl px-1">
            ←
          </button>
          <span className="font-bold text-lg text-slate-800">カテゴリ編集</span>
        </div>
        <div className="flex px-4 gap-1 pb-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={
                'flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ' +
                (activeTab === t.key
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-400')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto pb-8">
        {activeTab === 'expense' && (
          <CategoryList categories={expenseCategories} onChange={onUpdateExpense} />
        )}
        {activeTab === 'income' && (
          <CategoryList categories={incomeCategories} onChange={onUpdateIncome} />
        )}
        {activeTab === 'fixed' && (
          <CategoryList categories={fixedCategories} onChange={onUpdateFixed} />
        )}
      </div>
    </div>
  )
}
