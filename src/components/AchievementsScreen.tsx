import { useNavigate } from 'react-router-dom'
import { useAchievements, type Achievement } from '../hooks/useAchievements'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  userId: string
}

const CATEGORY_ICONS: Record<string, string> = {
  '固定費': '📋',
  '出費記録': '✏️',
}

function AchievementItem({ a }: { a: Achievement }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${a.achieved ? '' : 'opacity-40'}`}>
      <span className="text-2xl">{a.achieved ? '🏆' : '🔒'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink-strong">{a.title}</div>
        <div className="text-xs text-ink-muted mt-0.5">{a.description}</div>
        {a.achieved && a.achievedAt && (
          <div className="text-xs text-primary-500 mt-0.5">
            {new Date(a.achievedAt).toLocaleDateString('ja-JP')} 達成
          </div>
        )}
      </div>
      {a.achieved && (
        <span className="text-primary-500 text-lg">✓</span>
      )}
    </div>
  )
}

export default function AchievementsScreen({ userId }: Props) {
  const navigate = useNavigate()
  const { achievements, loading } = useAchievements(userId)

  const categories = ['固定費', '出費記録'] as const
  const achievedCount = achievements.filter((a) => a.achieved).length

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <ScreenHeader title="実績" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {/* 達成サマリー */}
        <div className="bg-surface rounded-xl p-4 flex items-center gap-3 shadow-sm border border-line-subtle">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="text-xs text-ink-muted">達成した実績</div>
            <div className="text-2xl font-bold text-ink-strong">
              {achievedCount}
              <span className="text-base font-normal text-ink-muted"> / {achievements.length}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-ink-muted text-sm py-12">読み込み中...</div>
        ) : (
          categories.map((cat) => {
            const items = achievements.filter((a) => a.category === cat)
            const catAchieved = items.filter((a) => a.achieved).length
            return (
              <div key={cat} className="bg-surface rounded-xl shadow-sm border border-line-subtle overflow-hidden">
                <div className="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                    <span className="font-semibold text-ink-strong text-sm">{cat}</span>
                  </div>
                  <span className="text-xs text-ink-muted">{catAchieved} / {items.length}</span>
                </div>
                <div className="divide-y divide-line-subtle">
                  {items.map((a) => (
                    <AchievementItem key={a.id} a={a} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
