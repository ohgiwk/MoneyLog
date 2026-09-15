import { useState, useEffect, useRef } from 'react'
import BottomSheet from './ui/BottomSheet'
import { useCumulativeSavings } from '../hooks/useCumulativeSavings'
import { useWishlistQuery } from '../hooks/queries/useWishlistQuery'
import { useSavingsGoalQuery, useSavingsGoalSave } from '../hooks/queries/useSavingsGoalQuery'
import { formatYen } from '../utils'

interface Props {
  userId: string
  isOpen: boolean
  onClose: () => void
}

function monthsUntilDate(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
}

export default function SavingsAllocationPanel({ userId, isOpen, onClose }: Props) {
  const { total, loading: savingsLoading } = useCumulativeSavings(userId)
  const { data: items = [], isLoading: itemsLoading } = useWishlistQuery(userId)
  const { data: existingGoals = {}, isLoading: allocLoading } = useSavingsGoalQuery(userId)
  const saveMutation = useSavingsGoalSave(userId)
  const initialized = useRef(false)

  const activeItems = items.filter((i) => !i.purchased_at)

  const [localAllocations, setLocalAllocations] = useState<Record<string, number>>({})
  const [localMonthlyTargets, setLocalMonthlyTargets] = useState<Record<string, number>>({})
  const [monthlyInputStrings, setMonthlyInputStrings] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && !allocLoading && !initialized.current) {
      initialized.current = true
      const amounts: Record<string, number> = {}
      const monthly: Record<string, number> = {}
      for (const [id, entry] of Object.entries(existingGoals)) {
        amounts[id] = entry.amount
        monthly[id] = entry.monthlyTarget
      }
      setLocalAllocations(amounts)
      setLocalMonthlyTargets(monthly)
    }
    if (!isOpen) {
      initialized.current = false
      setMonthlyInputStrings({})
      setSaveError(null)
      setSaveSuccess(false)
    }
  }, [isOpen, allocLoading, existingGoals])

  const handleMonthlyFocus = (itemId: string, value: number) => {
    setMonthlyInputStrings((prev) => ({ ...prev, [itemId]: value > 0 ? String(value) : '' }))
  }
  const handleMonthlyChange = (itemId: string, value: string) => {
    setMonthlyInputStrings((prev) => ({ ...prev, [itemId]: value.replace(/[^0-9]/g, '') }))
  }
  const handleMonthlyBlur = (itemId: string) => {
    const raw = monthlyInputStrings[itemId]
    if (raw !== undefined) {
      setLocalMonthlyTargets((prev) => ({ ...prev, [itemId]: parseInt(raw, 10) || 0 }))
      setMonthlyInputStrings((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    try {
      const payload = activeItems.map((item) => ({
        wishlistItemId: item.id,
        amount: localAllocations[item.id] ?? 0,
        monthlyTarget: localMonthlyTargets[item.id] ?? 0,
      }))
      await saveMutation.mutateAsync(payload)
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        onClose()
      }, 600)
    } catch {
      setSaveError('保存に失敗しました')
    }
  }

  const loading = savingsLoading || itemsLoading || allocLoading

  const footer = (
    <div className="space-y-2">
      {saveError && <p className="text-xs text-center text-danger-500">{saveError}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending || saveSuccess || activeItems.length === 0}
        className="w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-primary-500 active:bg-primary-600 text-white font-semibold disabled:opacity-50"
      >
        {saveSuccess ? '保存しました ✓' : saveMutation.isPending ? '保存中...' : '保存する'}
      </button>
    </div>
  )

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="積み立て計画"
      footer={footer}
      height="88dvh"
    >
      {loading ? (
        <div className="flex justify-center py-12 text-ink-muted text-sm">読み込み中...</div>
      ) : (
        <div className="space-y-3 pt-1">
          {/* 積立合計サマリ */}
          {activeItems.length > 0 &&
            (() => {
              const totalMonthly = activeItems.reduce(
                (s, i) => s + (localMonthlyTargets[i.id] ?? 0),
                0
              )
              const goalsWithPlan = activeItems.filter(
                (i) => (localMonthlyTargets[i.id] ?? 0) > 0
              ).length
              return (
                <div className="bg-surface rounded-xl shadow-sm px-4 py-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-ink-muted mb-0.5">月額積立 合計</div>
                      <div
                        className={`text-xl font-bold ${totalMonthly > 0 ? 'text-primary-600' : 'text-ink-muted'}`}
                      >
                        {totalMonthly > 0 ? formatYen(totalMonthly) : '未設定'}
                        {totalMonthly > 0 && (
                          <span className="text-sm font-normal text-ink-muted ml-1">/ 月</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-ink-muted mb-0.5">設定済み目標</div>
                      <div className="text-sm font-semibold text-ink">
                        {goalsWithPlan} / {activeItems.length} 件
                      </div>
                    </div>
                  </div>
                  {totalMonthly > 0 && (
                    <div className="space-y-1.5">
                      <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden flex">
                        {activeItems
                          .filter((i) => (localMonthlyTargets[i.id] ?? 0) > 0)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="h-full bg-primary-400 first:rounded-l-full last:rounded-r-full border-r border-surface last:border-0"
                              style={{
                                width: `${((localMonthlyTargets[item.id] ?? 0) / totalMonthly) * 100}%`,
                              }}
                            />
                          ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {activeItems
                          .filter((i) => (localMonthlyTargets[i.id] ?? 0) > 0)
                          .map((item) => (
                            <span key={item.id} className="text-xs text-ink-muted">
                              {item.name.length > 8 ? item.name.slice(0, 8) + '…' : item.name}:{' '}
                              {formatYen(localMonthlyTargets[item.id] ?? 0)}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

          {activeItems.length === 0 && (
            <div className="text-center py-12 text-ink-muted text-sm">
              積立計画を設定できる目標がありません
            </div>
          )}

          {activeItems.map((item, idx) => {
            const allocated = localAllocations[item.id] ?? 0
            const monthly = localMonthlyTargets[item.id] ?? 0
            const isEditingMonthly = monthlyInputStrings[item.id] !== undefined
            const remainingAmount = Math.max(0, item.target_amount - allocated)
            const isAchievable = allocated >= item.target_amount

            const monthsToGoal =
              !isAchievable && monthly > 0 ? Math.ceil(remainingAmount / monthly) : null
            const deadlineMonths = item.target_date ? monthsUntilDate(item.target_date) : null
            const deadlinePassed = deadlineMonths !== null && deadlineMonths < 0
            const deadlineThisMonth = deadlineMonths === 0
            const requiredMonthly =
              !isAchievable && deadlineMonths !== null && deadlineMonths > 0
                ? Math.ceil(remainingAmount / deadlineMonths)
                : null

            const onTrack =
              deadlineMonths !== null && deadlineMonths > 0 && monthsToGoal !== null
                ? monthsToGoal <= deadlineMonths
                : null

            return (
              <div key={item.id} className="bg-surface rounded-xl shadow-sm px-4 py-3 space-y-2.5">
                {/* ヘッダ */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs bg-warning-400 text-white rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-ink-strong truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {deadlinePassed && (
                      <span className="text-xs text-danger-500 font-medium">期限切れ</span>
                    )}
                    {deadlineThisMonth && !isAchievable && (
                      <span className="text-xs text-warning-600 font-medium">今月が期限</span>
                    )}
                    <span className="text-xs text-ink-muted">
                      目標 {formatYen(item.target_amount)}
                    </span>
                  </div>
                </div>

                {/* 月額積立入力（コンパクト） */}
                <div
                  className={`flex items-center bg-surface-muted rounded-lg px-3 py-2 gap-2 ${isEditingMonthly ? 'ring-2 ring-primary-400' : ''}`}
                >
                  <span className="text-xs text-ink-muted flex-shrink-0">月額</span>
                  <span className="text-ink-muted text-sm flex-shrink-0">¥</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      isEditingMonthly
                        ? (monthlyInputStrings[item.id] ?? '')
                        : monthly > 0
                          ? monthly.toLocaleString()
                          : ''
                    }
                    placeholder="未設定"
                    onChange={(e) => handleMonthlyChange(item.id, e.target.value)}
                    onFocus={() => handleMonthlyFocus(item.id, monthly)}
                    onBlur={() => handleMonthlyBlur(item.id)}
                    className="flex-1 bg-transparent text-sm font-semibold text-ink-strong outline-none min-w-0"
                    aria-label={`${item.name}の月額積立`}
                  />
                  <span className="text-xs text-ink-muted flex-shrink-0">円/月</span>
                </div>

                {/* 計算結果：コンパクト1行 */}
                {!isAchievable &&
                  !deadlinePassed &&
                  !deadlineThisMonth &&
                  (monthsToGoal !== null ||
                    requiredMonthly !== null ||
                    (monthly === 0 && deadlineMonths !== null && deadlineMonths > 0)) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                      {monthsToGoal !== null && (
                        <span>
                          達成見込み:{' '}
                          <span
                            className={`font-semibold ${onTrack === true ? 'text-income-600' : onTrack === false ? 'text-danger-500' : 'text-primary-600'}`}
                          >
                            約{monthsToGoal}ヶ月後
                          </span>
                        </span>
                      )}
                      {monthly === 0 && deadlineMonths !== null && deadlineMonths > 0 && (
                        <span>目標時期まで {deadlineMonths}ヶ月</span>
                      )}
                      {requiredMonthly !== null && (
                        <span>
                          必要月額:{' '}
                          <span
                            className={`font-semibold ${monthly > 0 && monthly >= requiredMonthly ? 'text-income-600' : monthly > 0 ? 'text-danger-500' : 'text-ink'}`}
                          >
                            {formatYen(requiredMonthly)}/月
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                {/* 配分状況 + 目標時期 */}
                {(allocated > 0 || item.target_date) && (
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    {allocated > 0 ? (
                      <span>
                        配分済み:{' '}
                        <span
                          className={`font-medium ${isAchievable ? 'text-income-600' : 'text-ink'}`}
                        >
                          {formatYen(allocated)}
                        </span>
                        {!isAchievable && `（残り ${formatYen(remainingAmount)}）`}
                      </span>
                    ) : (
                      <span />
                    )}
                    {item.target_date && (
                      <span>
                        {item.target_date.slice(0, 7).replace('-', '年').replace('-', '月')}頃
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </BottomSheet>
  )
}
