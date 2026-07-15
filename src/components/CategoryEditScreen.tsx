import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoryList, { type CategoryListHandle } from './CategoryList'
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
  const expenseRef = useRef<CategoryListHandle>(null)
  const incomeRef = useRef<CategoryListHandle>(null)
  const fixedRef = useRef<CategoryListHandle>(null)

  function handleFab() {
    if (activeTab === 'expense') expenseRef.current?.openAdd()
    else if (activeTab === 'income') incomeRef.current?.openAdd()
    else fixedRef.current?.openAdd()
  }

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

      <div className="flex-1 p-4 overflow-y-auto pb-24">
        {activeTab === 'expense' && (
          <CategoryList ref={expenseRef} categories={expenseCategories} onChange={updateExpenseCategories} />
        )}
        {activeTab === 'income' && (
          <CategoryList ref={incomeRef} categories={incomeCategories} onChange={updateIncomeCategories} />
        )}
        {activeTab === 'fixed' && (
          <CategoryList ref={fixedRef} categories={fixedCategories} onChange={updateFixedCategories} />
        )}
      </div>

      <div className="fixed bottom-8 left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <button
          onClick={handleFab}
          className="pointer-events-auto w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg active:bg-primary-600 flex items-center justify-center"
          aria-label="カテゴリを追加"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
