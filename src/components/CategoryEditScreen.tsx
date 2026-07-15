import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoryList from './CategoryList'
import ScreenHeader from './ui/ScreenHeader'
import { useAppContext } from '../contexts/AppContext'

type TabKey = 'expense' | 'income' | 'fixed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'expense', label: '支出' },
  { key: 'income', label: '収入' },
  { key: 'fixed', label: '固定費' },
]

export default function CategoryEditScreen() {
  const navigate = useNavigate()
  const { categories } = useAppContext()
  const { expenseCategories, incomeCategories, fixedCategories, updateExpenseCategories, updateIncomeCategories, updateFixedCategories } = categories
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [activeTab, setActiveTab] = useState<TabKey>('expense')

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="カテゴリ編集" onBack={() => navigate(-1)} />
        <div className="flex px-4 gap-1 pb-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={
                'flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ' +
                (activeTab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-ink-muted')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto pb-8">
        {activeTab === 'expense' && (
          <CategoryList categories={expenseCategories} onChange={updateExpenseCategories} />
        )}
        {activeTab === 'income' && (
          <CategoryList categories={incomeCategories} onChange={updateIncomeCategories} />
        )}
        {activeTab === 'fixed' && (
          <CategoryList categories={fixedCategories} onChange={updateFixedCategories} />
        )}
      </div>
    </div>
  )
}
