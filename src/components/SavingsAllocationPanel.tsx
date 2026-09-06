import { useState, useEffect, useRef } from 'react'
import BottomSheet from './ui/BottomSheet'
import { TabGroup } from './ui/TabGroup'
import { useCumulativeSavings } from '../hooks/useCumulativeSavings'
import { useWishlistQuery } from '../hooks/queries/useWishlistQuery'
import { useSavingsGoalQuery, useSavingsGoalSave } from '../hooks/queries/useSavingsGoalQuery'
import { formatYen } from '../utils'
import type { WishlistItem } from '../lib/services/wishlistService'

interface Props {
  userId: string
  isOpen: boolean
  onClose: () => void
}

type AutoMode = 'priority' | 'equal' | 'proportional' | 'monthly'
type TabKey = 'manual' | 'plan'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'manual', label: '手動配分' },
  { key: 'plan', label: '積立計画' },
]

const STEP = 1000

function monthsUntilDate(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
}

function allocatePriority(total: number, items: WishlistItem[]): Record<string, number> {
  const result: Record<string, number> = {}
  let remaining = total
  for (const item of items) {
    const give = Math.min(remaining, item.target_amount)
    result[item.id] = give
    remaining = Math.max(0, remaining - give)
  }
  for (const item of items) {
    if (!(item.id in result)) result[item.id] = 0
  }
  return result
}

function allocateEqual(total: number, items: WishlistItem[]): Record<string, number> {
  if (items.length === 0) return {}
  const each = Math.floor(total / items.length)
  const result: Record<string, number> = {}
  for (const item of items) result[item.id] = each
  const remainder = total - each * items.length
  if (items.length > 0) result[items[0].id] = (result[items[0].id] ?? 0) + remainder
  return result
}

function allocateProportional(total: number, items: WishlistItem[]): Record<string, number> {
  const sum = items.reduce((s, i) => s + i.target_amount, 0)
  if (sum === 0) return allocateEqual(total, items)
  const result: Record<string, number> = {}
  let allocated = 0
  for (const item of items) {
    const amount = Math.floor((item.target_amount / sum) * total)
    result[item.id] = amount
    allocated += amount
  }
  const remainder = total - allocated
  if (items.length > 0) result[items[0].id] = (result[items[0].id] ?? 0) + remainder
  return result
}

function allocateByMonthly(
  total: number,
  items: WishlistItem[],
  monthlyTargets: Record<string, number>
): Record<string, number> {
  const sum = items.reduce((s, i) => s + (monthlyTargets[i.id] ?? 0), 0)
  if (sum === 0) return allocateEqual(total, items)
  const result: Record<string, number> = {}
  let allocated = 0
  for (const item of items) {
    const amount = Math.floor(((monthlyTargets[item.id] ?? 0) / sum) * total)
    result[item.id] = amount
    allocated += amount
  }
  const remainder = total - allocated
  if (items.length > 0) result[items[0].id] = (result[items[0].id] ?? 0) + remainder
  return result
}

export default function SavingsAllocationPanel({ userId, isOpen, onClose }: Props) {
  const { total, loading: savingsLoading } = useCumulativeSavings(userId)
  const { data: items = [], isLoading: itemsLoading } = useWishlistQuery(userId)
  const { data: existingGoals = {}, isLoading: allocLoading } = useSavingsGoalQuery(userId)
  const saveMutation = useSavingsGoalSave(userId)
  const autoMenuRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  const activeItems = items.filter((i) => !i.purchased_at)
  const totalPool = Math.max(0, total ?? 0)

  const [tab, setTab] = useState<TabKey>('manual')
  const [localAllocations, setLocalAllocations] = useState<Record<string, number>>({})
  const [localMonthlyTargets, setLocalMonthlyTargets] = useState<Record<string, number>>({})
  const [inputStrings, setInputStrings] = useState<Record<string, string>>({})
  const [monthlyInputStrings, setMonthlyInputStrings] = useState<Record<string, string>>({})
  const [showAutoMenu, setShowAutoMenu] = useState(false)
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
      setTab('manual')
      setInputStrings({})
      setMonthlyInputStrings({})
      setSaveError(null)
      setSaveSuccess(false)
    }
  }, [isOpen, allocLoading, existingGoals])

  useEffect(() => {
    if (!showAutoMenu) return
    const handler = (e: MouseEvent) => {
      if (autoMenuRef.current && !autoMenuRef.current.contains(e.target as Node)) {
        setShowAutoMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAutoMenu])

  const totalAllocated = Object.values(localAllocations).reduce((s, v) => s + v, 0)
  const remaining = totalPool - totalAllocated
  const allocationPct = totalPool > 0 ? Math.min((totalAllocated / totalPool) * 100, 100) : 0
  const hasMonthlyTargets = activeItems.some((i) => (localMonthlyTargets[i.id] ?? 0) > 0)

  const setAllocation = (itemId: string, newAmount: number) => {
    const current = localAllocations[itemId] ?? 0
    const clamped = Math.max(0, Math.min(newAmount, current + remaining))
    setLocalAllocations((prev) => ({ ...prev, [itemId]: clamped }))
  }

  const handleInputFocus = (itemId: string, allocated: number) => {
    setInputStrings((prev) => ({ ...prev, [itemId]: allocated > 0 ? String(allocated) : '' }))
  }
  const handleInputChange = (itemId: string, value: string) => {
    setInputStrings((prev) => ({ ...prev, [itemId]: value.replace(/[^0-9]/g, '') }))
  }
  const handleInputBlur = (itemId: string) => {
    const raw = inputStrings[itemId]
    if (raw !== undefined) {
      setAllocation(itemId, parseInt(raw, 10) || 0)
      setInputStrings((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    }
  }

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

  const applyAuto = (mode: AutoMode) => {
    setShowAutoMenu(false)
    let result: Record<string, number>
    if (mode === 'priority') result = allocatePriority(totalPool, activeItems)
    else if (mode === 'equal') result = allocateEqual(totalPool, activeItems)
    else if (mode === 'monthly')
      result = allocateByMonthly(totalPool, activeItems, localMonthlyTargets)
    else result = allocateProportional(totalPool, activeItems)
    setLocalAllocations(result)
    setInputStrings({})
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="貯蓄配分" footer={footer} height="88dvh">
      {loading ? (
        <div className="flex justify-center py-12 text-ink-muted text-sm">読み込み中...</div>
      ) : (
        <div className="space-y-3 pt-1">
          {/* タブ切り替え */}
          <TabGroup tabs={TABS} active={tab} onChange={setTab} size="sm" />

          {/* ===== 手動配分タブ ===== */}
          {tab === 'manual' && (
            <>
              {/* 貯蓄プールカード */}
              <div className="bg-surface rounded-xl shadow-sm px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-ink-muted mb-0.5">配分可能な累計貯蓄</div>
                    <div
                      className={`text-xl font-bold ${totalPool >= 0 ? 'text-income-600' : 'text-danger-500'}`}
                    >
                      {totalPool >= 0 ? '+' : ''}
                      {formatYen(totalPool)}
                    </div>
                  </div>

                  {activeItems.length > 0 && (
                    <div className="relative flex-shrink-0" ref={autoMenuRef}>
                      <button
                        onClick={() => setShowAutoMenu((v) => !v)}
                        className="flex items-center gap-1 text-sm font-medium text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg active:bg-primary-100"
                      >
                        自動配分
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {showAutoMenu && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-surface rounded-xl shadow-lg overflow-hidden z-[60] border border-line-subtle">
                          {(
                            [
                              { mode: 'priority' as AutoMode, label: '優先度順に充填' },
                              { mode: 'equal' as AutoMode, label: '均等に配分' },
                              { mode: 'proportional' as AutoMode, label: '目標額の比率で配分' },
                              ...(hasMonthlyTargets
                                ? [{ mode: 'monthly' as AutoMode, label: '月額積立の比率で配分' }]
                                : []),
                            ] as const
                          ).map(({ mode, label }) => (
                            <button
                              key={mode}
                              onClick={() => applyAuto(mode)}
                              className="w-full text-left px-4 py-3 text-sm text-ink active:bg-surface-muted border-b border-line-subtle last:border-b-0"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* プログレスバー */}
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${remaining < 0 ? 'bg-danger-500' : 'bg-income-500'}`}
                      style={{ width: `${allocationPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-muted">
                      配分済:{' '}
                      <span className="text-ink font-medium">{formatYen(totalAllocated)}</span>
                    </span>
                    <span
                      className={
                        remaining < 0
                          ? 'text-danger-500 font-semibold'
                          : remaining === 0
                            ? 'text-income-600 font-medium'
                            : 'text-ink-muted'
                      }
                    >
                      {remaining === 0 ? '全額配分済 ✓' : `未配分: ${formatYen(remaining)}`}
                    </span>
                  </div>
                </div>
              </div>

              {activeItems.length === 0 && (
                <div className="text-center py-12 text-ink-muted text-sm">
                  配分できる目標がありません
                </div>
              )}

              {/* 各目標カード（手動配分） */}
              {activeItems.map((item, idx) => {
                const allocated = localAllocations[item.id] ?? 0
                const pct =
                  item.target_amount > 0 ? Math.min((allocated / item.target_amount) * 100, 100) : 0
                const isAchievable = allocated >= item.target_amount
                const canIncrease = remaining >= STEP
                const isEditing = inputStrings[item.id] !== undefined

                return (
                  <div
                    key={item.id}
                    className="bg-surface rounded-xl shadow-sm px-4 py-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs bg-warning-400 text-white rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-ink-strong truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs text-ink-muted flex-shrink-0">
                        目標 {formatYen(item.target_amount)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isAchievable ? 'bg-income-500' : 'bg-primary-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-ink-muted">{Math.round(pct)}%</span>
                        {isAchievable ? (
                          <span className="text-xs font-semibold text-income-600">達成可能 ✓</span>
                        ) : item.target_amount > allocated ? (
                          <span className="text-xs text-ink-muted">
                            あと {formatYen(item.target_amount - allocated)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAllocation(item.id, allocated - STEP)}
                        disabled={allocated <= 0}
                        className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-ink text-xl leading-none active:bg-line-subtle disabled:opacity-30 flex-shrink-0"
                        aria-label="1,000円減らす"
                      >
                        −
                      </button>
                      <div
                        className={`flex-1 flex items-center bg-surface-muted rounded-lg px-3 py-2 gap-1 ${isEditing ? 'ring-2 ring-primary-400' : ''}`}
                      >
                        <span className="text-ink-muted text-sm flex-shrink-0">¥</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            isEditing ? (inputStrings[item.id] ?? '') : allocated.toLocaleString()
                          }
                          onChange={(e) => handleInputChange(item.id, e.target.value)}
                          onFocus={() => handleInputFocus(item.id, allocated)}
                          onBlur={() => handleInputBlur(item.id)}
                          className="flex-1 bg-transparent text-base font-semibold text-ink-strong text-center outline-none min-w-0"
                          aria-label={`${item.name}への配分額`}
                        />
                      </div>
                      <button
                        onClick={() => setAllocation(item.id, allocated + STEP)}
                        disabled={!canIncrease}
                        className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-ink text-xl leading-none active:bg-line-subtle disabled:opacity-30 flex-shrink-0"
                        aria-label="1,000円増やす"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ===== 積立計画タブ ===== */}
          {tab === 'plan' && (
            <>
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

                return (
                  <div
                    key={item.id}
                    className="bg-surface rounded-xl shadow-sm px-4 py-4 space-y-4"
                  >
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
                      <span className="text-xs text-ink-muted flex-shrink-0">
                        目標 {formatYen(item.target_amount)}
                      </span>
                    </div>

                    {/* 現在の配分状況 */}
                    {allocated > 0 && (
                      <div className="text-xs text-ink-muted">
                        配分済み:{' '}
                        <span className="text-ink font-medium">{formatYen(allocated)}</span> ／ 残り{' '}
                        <span className={isAchievable ? 'text-income-600 font-medium' : ''}>
                          {isAchievable ? '達成可能 ✓' : formatYen(remainingAmount)}
                        </span>
                      </div>
                    )}

                    {/* 月額積立入力 */}
                    <div className="space-y-1.5">
                      <div className="text-xs text-ink-muted font-medium">毎月の積立額</div>
                      <div
                        className={`flex items-center bg-surface-muted rounded-xl px-4 py-3 gap-2 ${isEditingMonthly ? 'ring-2 ring-primary-400' : ''}`}
                      >
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
                          placeholder="金額を入力"
                          onChange={(e) => handleMonthlyChange(item.id, e.target.value)}
                          onFocus={() => handleMonthlyFocus(item.id, monthly)}
                          onBlur={() => handleMonthlyBlur(item.id)}
                          className="flex-1 bg-transparent text-base font-semibold text-ink-strong outline-none min-w-0"
                          aria-label={`${item.name}の月額積立`}
                        />
                        <span className="text-sm text-ink-muted flex-shrink-0">円 / 月</span>
                      </div>
                    </div>

                    {/* 目標時期が過去の場合の警告 */}
                    {deadlinePassed && (
                      <div className="bg-danger-50 rounded-xl px-4 py-3 text-xs text-danger-600 font-medium">
                        目標時期（
                        {item.target_date!.slice(0, 7).replace('-', '年').replace('-', '月')}
                        ）が過ぎています
                      </div>
                    )}

                    {/* 今月が目標時期 */}
                    {deadlineThisMonth && !isAchievable && (
                      <div className="bg-warning-50 rounded-xl px-4 py-3 text-xs text-warning-700 font-medium">
                        今月が目標時期です
                      </div>
                    )}

                    {/* 計算結果（目標時期が将来の場合のみ） */}
                    {!isAchievable &&
                      !deadlinePassed &&
                      !deadlineThisMonth &&
                      (monthsToGoal !== null ||
                        requiredMonthly !== null ||
                        deadlineMonths !== null) &&
                      (() => {
                        const onTrack =
                          deadlineMonths !== null && deadlineMonths > 0 && monthsToGoal !== null
                            ? monthsToGoal <= deadlineMonths
                            : null
                        return (
                          <div className="space-y-2 bg-surface-muted rounded-xl px-4 py-3">
                            {/* 達成見込み（色分け） */}
                            {monthsToGoal !== null && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-ink-muted">達成見込み</span>
                                <span
                                  className={`font-semibold ${
                                    onTrack === true
                                      ? 'text-income-600'
                                      : onTrack === false
                                        ? 'text-danger-500'
                                        : 'text-primary-600'
                                  }`}
                                >
                                  約 {monthsToGoal} ヶ月後
                                </span>
                              </div>
                            )}

                            {/* 目標時期まで残り月数（積立未設定時） */}
                            {monthly === 0 && deadlineMonths !== null && deadlineMonths > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-ink-muted">目標時期まで</span>
                                <span className="text-ink-muted">{deadlineMonths} ヶ月</span>
                              </div>
                            )}

                            {/* 必要月額 */}
                            {requiredMonthly !== null && (
                              <div className="flex justify-between items-center text-sm border-t border-line-subtle pt-2 mt-1">
                                <span className="text-ink-muted">目標時期に必要な月額</span>
                                <span
                                  className={`font-semibold ${
                                    monthly > 0 && monthly >= requiredMonthly
                                      ? 'text-income-600'
                                      : monthly > 0
                                        ? 'text-danger-500'
                                        : 'text-ink'
                                  }`}
                                >
                                  {formatYen(requiredMonthly)} / 月
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                    {item.target_date && (
                      <p className="text-xs text-ink-muted">
                        目標時期:{' '}
                        {item.target_date.slice(0, 7).replace('-', '年').replace('-', '月')}
                      </p>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
