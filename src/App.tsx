import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './hooks/useAuth'
import { useCategories } from './hooks/useCategories'
import { todayStr } from './utils'
import AuthScreen from './components/AuthScreen'
import HomeTab from './components/HomeTab'
import RecordTab from './components/RecordTab'
import FixedExpenseTab from './components/FixedExpenseTab'
import CalendarTab from './components/CalendarTab'
import DrawerMenu from './components/DrawerMenu'
import SettingsScreen from './components/SettingsScreen'
import CategoryEditScreen from './components/CategoryEditScreen'
import BudgetScreen from './components/BudgetScreen'
import ExchangeRateScreen from './components/ExchangeRateScreen'
import PaymentMethodsScreen from './components/PaymentMethodsScreen'
import OnboardingScreen from './components/OnboardingScreen'
import WishlistScreen from './components/WishlistScreen'
import AnalyticsScreen from './components/AnalyticsScreen'
import SavingTipsScreen from './components/SavingTipsScreen'
import type { Transaction } from './lib/database.types'
import UpdateNotification from './components/UpdateNotification'
import PageTransition, { type NavDirection } from './components/PageTransition'

type TabKey = 'home' | 'record' | 'fixed' | 'calendar'
type Screen = 'main' | 'settings' | 'category-edit' | 'budget' | 'exchange-rate' | 'payment-methods' | 'setup' | 'wishlist' | 'analytics' | 'saving-tips'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'ホーム', icon: '🏠' },
  { key: 'record', label: '記録', icon: '✏️' },
  { key: 'fixed', label: '固定費', icon: '📋' },
  { key: 'calendar', label: 'カレンダー', icon: '📅' },
]

export default function App() {
  const { user, loading, signOut } = useAuth()
  const categories = useCategories()
  const [tab, setTab] = useState<TabKey>('home')
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('main')
  const [direction, setDirection] = useState<NavDirection>('forward')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [recordInitialSub, setRecordInitialSub] = useState<'one_time' | 'consumables' | undefined>(undefined)
  const [recordTapKey, setRecordTapKey] = useState(0)
  const [fixedFromOnboarding, setFixedFromOnboarding] = useState(false)
  const [headerBack, setHeaderBack] = useState<{
    title: string
    onBack: () => void
    action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [prevTab, setPrevTab] = useState(tab)

  function navigate(next: Screen, dir: NavDirection = 'forward') {
    setDirection(dir)
    setScreen(next)
  }

  function resetScroll() {
    scrollRef.current?.scrollTo(0, 0)
  }

  // タブ・画面遷移時にスクロールをトップに戻す
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [tab, screen])

  // タブ切り替え時はヘッダーの戻るボタン状態と initialSub をリセット
  // （レンダー中に前回値と比較して即座に補正する React 推奨パターン）
  if (tab !== prevTab) {
    setPrevTab(tab)
    setHeaderBack(null)
    if (recordInitialSub) setRecordInitialSub(undefined)
  }

  // フルスクリーンページへの遷移時は window もリセット
  useEffect(() => {
    if (screen !== 'main') window.scrollTo(0, 0)
  }, [screen])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  let content: ReactNode

  if (screen === 'wishlist') {
    content = <WishlistScreen userId={user.id} onBack={() => navigate('main', 'back')} />
  } else if (screen === 'analytics') {
    content = <AnalyticsScreen userId={user.id} onBack={() => navigate('main', 'back')} />
  } else if (screen === 'saving-tips') {
    content = <SavingTipsScreen onBack={() => navigate('main', 'back')} />
  } else if (screen === 'setup') {
    content = (
      <OnboardingScreen
        userId={user.id}
        onComplete={() => { setFixedFromOnboarding(true); navigate('main', 'back'); setTab('fixed') }}
      />
    )
  } else if (screen === 'budget') {
    content = <BudgetScreen userId={user.id} onBack={() => navigate('main', 'back')} />
  } else if (screen === 'exchange-rate') {
    content = <ExchangeRateScreen onBack={() => navigate('settings', 'back')} />
  } else if (screen === 'payment-methods') {
    content = <PaymentMethodsScreen onBack={() => navigate('settings', 'back')} />
  } else if (screen === 'settings') {
    content = (
      <SettingsScreen
        userId={user.id}
        onCategoryEdit={() => navigate('category-edit')}
        onExchangeRate={() => navigate('exchange-rate')}
        onPaymentMethods={() => navigate('payment-methods')}
        onBack={() => navigate('main', 'back')}
      />
    )
  } else if (screen === 'category-edit') {
    content = (
      <CategoryEditScreen
        expenseCategories={categories.expenseCategories}
        incomeCategories={categories.incomeCategories}
        fixedCategories={categories.fixedCategories}
        onUpdateExpense={categories.updateExpenseCategories}
        onUpdateIncome={categories.updateIncomeCategories}
        onUpdateFixed={categories.updateFixedCategories}
        onBack={() => navigate('settings', 'back')}
      />
    )
  } else {
    content = (
    <div className="max-w-md mx-auto h-full bg-slate-50 flex flex-col overflow-hidden">
      <UpdateNotification />
      {/* ヘッダー */}
      <div className="fixed top-0 left-0 right-0 max-w-md mx-auto z-10 bg-white border-b border-slate-100 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
          {headerBack ? (
            <button
              onClick={headerBack.onBack}
              className="text-slate-500 active:text-slate-700 justify-self-start p-1"
              aria-label="戻る"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center justify-center gap-2 min-w-0">
            {headerBack ? (
              <span className="font-semibold text-slate-800 truncate">{headerBack.title}</span>
            ) : (
              <>
                <span className="text-2xl">💰</span>
                <span className="font-bold text-lg text-slate-800">マネログ</span>
                <span className="text-xs text-slate-400">MoneyLog</span>
              </>
            )}
          </div>

          {headerBack ? (
            headerBack.action ? (
              <button
                onClick={headerBack.action.onClick}
                disabled={headerBack.action.disabled}
                className={
                  'justify-self-end px-1 text-sm font-semibold active:opacity-70 disabled:opacity-40 ' +
                  (headerBack.action.tone === 'danger' ? 'text-danger-500' : 'text-primary-600')
                }
              >
                {headerBack.action.label}
              </button>
            ) : (
              <span />
            )
          ) : (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col gap-1 p-2 active:opacity-60 justify-self-end"
              aria-label="メニューを開く"
            >
              <span className="block w-5 h-0.5 bg-slate-500 rounded" />
              <span className="block w-5 h-0.5 bg-slate-500 rounded" />
              <span className="block w-5 h-0.5 bg-slate-500 rounded" />
            </button>
          )}
        </div>
      </div>

      {/* ドロワーメニュー */}
      {drawerOpen && (
        <DrawerMenu
          onSettings={() => navigate('settings')}
          onBudget={() => navigate('budget')}
          onSetup={() => navigate('setup')}
          onWishlist={() => navigate('wishlist')}
          onAnalytics={() => navigate('analytics')}
          onSavingTips={() => navigate('saving-tips')}
          onSignOut={signOut}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* コンテンツ */}
      <div ref={scrollRef} className="flex-1 min-h-0 pt-[calc(57px+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-y-auto">
        {tab === 'home' && <HomeTab userId={user.id} onManageBudget={() => navigate('budget')} />}
        {tab === 'record' && (
          <RecordTab
            userId={user.id}
            month={month}
            setMonth={setMonth}
            expenseCategories={categories.expenseCategories}
            incomeCategories={categories.incomeCategories}
            editingTx={editingTx}
            onEditDone={() => setEditingTx(null)}
            initialSub={recordInitialSub}
            resetSignal={recordTapKey}
            onHeaderChange={setHeaderBack}
            onNavigate={resetScroll}
          />
        )}
        {tab === 'fixed' && (
          <FixedExpenseTab
            userId={user.id}
            fixedCategories={categories.fixedCategories}
            fromOnboarding={fixedFromOnboarding}
            onWizardOpen={() => setFixedFromOnboarding(false)}
            onHeaderChange={setHeaderBack}
            onNavigate={resetScroll}
          />
        )}
        {tab === 'calendar' && (
          <CalendarTab userId={user.id} month={month} setMonth={setMonth} />
        )}
      </div>

      {/* ボトムナビ */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10 bg-white border-t border-slate-100 flex justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'record') setRecordTapKey((k) => k + 1)
              setTab(t.key)
            }}
            className={
              'flex flex-col items-center gap-0.5 px-6 py-1 ' +
              (tab === t.key ? 'text-primary-600' : 'text-slate-400')
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

  return (
    <PageTransition pageKey={screen} direction={direction} className="h-[100dvh]" fillHeight>
      {content}
    </PageTransition>
  )
}
