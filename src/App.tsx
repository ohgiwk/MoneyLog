import { useAuth } from './hooks/useAuth'
import { todayStr } from './utils'
import { useState } from 'react'
import AuthScreen from './components/AuthScreen'
import SummaryTab from './components/SummaryTab'
import RecordTab from './components/RecordTab'

type TabKey = 'summary' | 'record' | 'calendar'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'summary', label: 'サマリー', icon: '📊' },
  { key: 'record', label: '記録', icon: '✏️' },
  { key: 'calendar', label: 'カレンダー', icon: '📅' },
]

export default function App() {
  const { user, loading, signOut } = useAuth()
  const [tab, setTab] = useState<TabKey>('summary')
  const [month, setMonth] = useState(todayStr().slice(0, 7))

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-bold text-lg text-slate-800">マネログ</span>
            <span className="text-xs text-slate-400">MoneyLog</span>
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-slate-400 active:text-slate-600"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 pb-20 overflow-y-auto">
        {tab === 'summary' && <SummaryTab userId={user.id} month={month} setMonth={setMonth} />}
        {tab === 'record' && <RecordTab userId={user.id} month={month} setMonth={setMonth} />}
        {tab === 'calendar' && (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            カレンダー機能は近日実装予定です
          </div>
        )}
      </div>

      {/* ボトムナビ */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 flex justify-around py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
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
