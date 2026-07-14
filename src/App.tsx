import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import { useAuth } from './hooks/useAuth'
import { useCategories } from './hooks/useCategories'
import { useTheme } from './hooks/useTheme'
import { todayStr, shiftMonth, monthLabel } from './utils'
import AuthScreen from './components/AuthScreen'
import HomeTab from './components/HomeTab'
import RecordTab from './components/RecordTab'
import ShoppingTab from './components/ShoppingTab'
import FixedExpenseTab from './components/FixedExpenseTab'
import CalendarTab from './components/CalendarTab'
import DrawerMenu from './components/DrawerMenu'
import SettingsScreen from './components/SettingsScreen'
import CategoryEditScreen from './components/CategoryEditScreen'
import BudgetScreen from './components/BudgetScreen'
import ExchangeRateScreen from './components/ExchangeRateScreen'
import PaymentMethodsScreen from './components/PaymentMethodsScreen'
import OnboardingScreen from './components/OnboardingScreen'
import AnalyticsScreen from './components/AnalyticsScreen'
import SavingTipsScreen from './components/SavingTipsScreen'
import type { Transaction } from './lib/database.types'
import UpdateNotification from './components/UpdateNotification'
import PageTransition, { type NavDirection } from './components/PageTransition'

type TabKey = 'home' | 'record' | 'shopping' | 'fixed' | 'calendar'
type Screen = 'main' | 'settings' | 'category-edit' | 'budget' | 'exchange-rate' | 'payment-methods' | 'setup' | 'analytics' | 'saving-tips'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'ホーム', icon: '🏠' },
  { key: 'record', label: '記録', icon: '✏️' },
  { key: 'shopping', label: 'メモ', icon: '🛒' },
  { key: 'fixed', label: '固定費', icon: '📋' },
  { key: 'calendar', label: 'カレンダー', icon: '📅' },
]

export default function App() {
  const { user, loading, signOut } = useAuth()
  const categories = useCategories()
  const theme = useTheme()
  const [tab, setTab] = useState<TabKey>('home')
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('main')
  const [direction, setDirection] = useState<NavDirection>('forward')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [recordTapKey, setRecordTapKey] = useState(0)
  const [shoppingTapKey, setShoppingTapKey] = useState(0)
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

  function goToCalendarDate(date: string) {
    setMonth(date.slice(0, 7))
    setCalendarSelectedDate(date)
    setTab('calendar')
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
  }

  // フルスクリーンページへの遷移時は window もリセット
  useEffect(() => {
    if (screen !== 'main') window.scrollTo(0, 0)
  }, [screen])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center">
        <div className="text-ink-muted text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  let content: ReactNode

  if (screen === 'analytics') {
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
        themeMode={theme.mode}
        onThemeModeChange={theme.setMode}
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
    <div className="max-w-md mx-auto h-full bg-surface-subtle flex flex-col overflow-hidden">
      <UpdateNotification />
      {/* ヘッダー */}
      <div className="fixed top-0 left-0 right-0 max-w-md mx-auto z-10 bg-surface-subtle border-b-2 border-primary-500 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
          {headerBack ? (
            <button
              onClick={headerBack.onBack}
              className="text-ink-muted active:text-ink justify-self-start p-1"
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
              <span className="font-semibold text-ink-strong truncate">{headerBack.title}</span>
            ) : tab === 'calendar' ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMonth(shiftMonth(month, -1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:bg-surface-subtle text-ink-muted text-2xl"
                >
                  ‹
                </button>
                <span className="text-base font-bold text-ink-strong">{monthLabel(month)}</span>
                <button
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:bg-surface-subtle text-ink-muted text-2xl"
                >
                  ›
                </button>
              </div>
            ) : (
              <>
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="w-7 h-7 object-contain" />
                <span className="text-lg text-ink-strong" style={{ fontFamily: "'Kiwi Maru', serif" }}>キンカク手帖</span>
              </>
            )}
          </div>

          {headerBack ? (
            headerBack.action ? (
              <button
                onClick={headerBack.action.onClick}
                disabled={headerBack.action.disabled}
                className={
                  'justify-self-end p-1 active:opacity-70 disabled:opacity-40 ' +
                  (headerBack.action.tone === 'danger' ? 'text-danger-500' : 'text-primary-600')
                }
                aria-label={headerBack.action.label}
              >
                {headerBack.action.tone === 'danger' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">{headerBack.action.label}</span>
                )}
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
              <span className="block w-5 h-0.5 bg-ink-muted rounded" />
              <span className="block w-5 h-0.5 bg-ink-muted rounded" />
              <span className="block w-5 h-0.5 bg-ink-muted rounded" />
            </button>
          )}
        </div>
      </div>

      {/* ドロワーメニュー */}
      <AnimatePresence>
        {drawerOpen && (
          <DrawerMenu
            key="drawer"
            onSettings={() => navigate('settings')}
            onBudget={() => navigate('budget')}
            onSetup={() => navigate('setup')}
            onAnalytics={() => navigate('analytics')}
            onSavingTips={() => navigate('saving-tips')}
            onSignOut={signOut}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* コンテンツ */}
      <div ref={scrollRef} className="flex-1 min-h-0 pt-[calc(57px+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-y-auto">
        {tab === 'home' && (
          <HomeTab
            userId={user.id}
            onManageBudget={() => navigate('budget')}
            onSelectUpcomingEvent={goToCalendarDate}
          />
        )}
        {tab === 'record' && (
          <RecordTab
            userId={user.id}
            month={month}
            setMonth={setMonth}
            expenseCategories={categories.expenseCategories}
            incomeCategories={categories.incomeCategories}
            editingTx={editingTx}
            onEditDone={() => setEditingTx(null)}
            resetSignal={recordTapKey}
            onHeaderChange={setHeaderBack}
            onNavigate={resetScroll}
          />
        )}
        {tab === 'shopping' && (
          <ShoppingTab
            userId={user.id}
            month={month}
            expenseCategories={categories.expenseCategories}
            resetSignal={shoppingTapKey}
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
          <CalendarTab
            userId={user.id}
            month={month}
            setMonth={setMonth}
            initialSelectedDate={calendarSelectedDate}
            expenseCategories={categories.expenseCategories}
          />
        )}
      </div>

      {/* ボトムナビ */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10 bg-surface-subtle border-t border-line flex justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(1,38,100,0.06)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'record') setRecordTapKey((k) => k + 1)
              if (t.key === 'shopping') setShoppingTapKey((k) => k + 1)
              if (t.key === 'calendar') setCalendarSelectedDate(undefined)
              setTab(t.key)
            }}
            className={
              'flex flex-col items-center gap-0.5 px-6 py-1 ' +
              (tab === t.key ? 'text-primary-500' : 'text-ink-muted')
            }
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-[11px] font-medium">{t.label}</span>
            <span className={`block h-0.5 w-5 rounded-full mt-0.5 transition-all ${tab === t.key ? 'bg-primary-500' : 'bg-transparent'}`} />
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
