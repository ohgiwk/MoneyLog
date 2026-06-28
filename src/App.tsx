import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useCategories } from './hooks/useCategories'
import { todayStr } from './utils'
import AuthScreen from './components/AuthScreen'
import SummaryTab from './components/SummaryTab'
import RecordTab from './components/RecordTab'
import RecordDetailScreen from './components/RecordDetailScreen'
import CalendarTab from './components/CalendarTab'
import DrawerMenu from './components/DrawerMenu'
import SettingsScreen from './components/SettingsScreen'
import CategoryEditScreen from './components/CategoryEditScreen'
import BudgetScreen from './components/BudgetScreen'
import type { Transaction } from './lib/database.types'
import UpdateNotification from './components/UpdateNotification'

type TabKey = 'summary' | 'record' | 'calendar'
type Screen = 'main' | 'settings' | 'category-edit' | 'budget' | 'record-detail'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'summary', label: 'ホーム', icon: '🏠' },
  { key: 'record', label: '記録', icon: '✏️' },
  { key: 'calendar', label: 'カレンダー', icon: '📅' },
]

export default function App() {
  const { user, loading, signOut } = useAuth()
  const categories = useCategories()
  const [tab, setTab] = useState<TabKey>('summary')
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('main')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  function handleEditTx(tx: Transaction) {
    setEditingTx(tx)
    setTab('record')
    setScreen('main')
  }

  function handleEditSaved() {
    setEditingTx(null)
    setTab('summary')
    setScreen('record-detail')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  if (screen === 'budget') {
    return <BudgetScreen userId={user.id} onBack={() => setScreen('main')} />
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        userId={user.id}
        onCategoryEdit={() => setScreen('category-edit')}
        onBack={() => setScreen('main')}
      />
    )
  }

  if (screen === 'category-edit') {
    return (
      <CategoryEditScreen
        expenseCategories={categories.expenseCategories}
        incomeCategories={categories.incomeCategories}
        fixedCategories={categories.fixedCategories}
        onUpdateExpense={categories.updateExpenseCategories}
        onUpdateIncome={categories.updateIncomeCategories}
        onUpdateFixed={categories.updateFixedCategories}
        onBack={() => setScreen('settings')}
      />
    )
  }

  if (screen === 'record-detail') {
    return (
      <RecordDetailScreen
        userId={user.id}
        month={month}
        setMonth={setMonth}
        onBack={() => setScreen('main')}
        onEditTx={handleEditTx}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      <UpdateNotification />
      {/* ヘッダー */}
      <div className="fixed top-0 left-0 right-0 max-w-md mx-auto z-10 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-bold text-lg text-slate-800">マネログ</span>
            <span className="text-xs text-slate-400">MoneyLog</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col gap-1 p-2 active:opacity-60"
            aria-label="メニューを開く"
          >
            <span className="block w-5 h-0.5 bg-slate-500 rounded" />
            <span className="block w-5 h-0.5 bg-slate-500 rounded" />
            <span className="block w-5 h-0.5 bg-slate-500 rounded" />
          </button>
        </div>
      </div>

      {/* ドロワーメニュー */}
      {drawerOpen && (
        <DrawerMenu
          onSettings={() => setScreen('settings')}
          onBudget={() => setScreen('budget')}
          onSignOut={signOut}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* コンテンツ */}
      <div className="flex-1 pt-[57px] pb-20 overflow-y-auto">
        {tab === 'summary' && (
          <SummaryTab
            userId={user.id}
            month={month}
            setMonth={setMonth}
            fixedCategories={categories.fixedCategories}
          />
        )}
        {tab === 'record' && (
          <RecordTab
            userId={user.id}
            expenseCategories={categories.expenseCategories}
            incomeCategories={categories.incomeCategories}
            fixedCategories={categories.fixedCategories}
            editingTx={editingTx}
            onEditDone={() => setEditingTx(null)}
            onEditSaved={handleEditSaved}
            onGoToList={() => setTab('summary')}
            onEditTx={handleEditTx}
            onDetail={() => setScreen('record-detail')}
          />
        )}
        {tab === 'calendar' && (
          <CalendarTab userId={user.id} month={month} setMonth={setMonth} />
        )}
      </div>

      {/* ボトムナビ */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 flex justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              'flex flex-col items-center gap-0.5 px-6 py-1 ' +
              (tab === t.key ? 'text-emerald-600' : 'text-slate-400')
            }
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-[11px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
