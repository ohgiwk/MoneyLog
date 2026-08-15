import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  userId: string
}

export default function MyPageScreen({ userId }: Props) {
  const navigate = useNavigate()

  const [recordDays, setRecordDays] = useState<number | null>(null)
  const [recordCount, setRecordCount] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('transactions').select('date').eq('user_id', userId)
      if (data) {
        setRecordCount(data.length)
        setRecordDays(new Set(data.map((t) => t.date)).size)
      }
      setStatsLoading(false)
    }
    fetchStats()
  }, [userId])

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <ScreenHeader title="マイページ" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {/* 累計記録 */}
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-ink mb-3">累計記録</div>
          {statsLoading ? (
            <div className="text-sm text-ink-muted">読み込み中...</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-subtle rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary-500">{recordDays ?? 0}</div>
                <div className="text-xs text-ink-muted mt-0.5">記録日数</div>
              </div>
              <div className="bg-surface-subtle rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary-500">{recordCount ?? 0}</div>
                <div className="text-xs text-ink-muted mt-0.5">記録回数</div>
              </div>
            </div>
          )}
        </div>

        {/* 分析 */}
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => navigate('/analytics')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-ink active:bg-surface-subtle"
          >
            <span className="flex items-center gap-2">
              <span>📊</span>
              分析
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ink-muted"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
