import { useState, useEffect, useRef } from 'react'
import FabButton from './ui/FabButton'
import { useQueryClient } from '@tanstack/react-query'
import {
  useWishlistQuery,
  useWishlistInsert,
  useWishlistUpdate,
  useWishlistDelete,
} from '../hooks/queries/useWishlistQuery'
import type { WishlistItem } from '../lib/services/wishlistService'
import { useCumulativeSavings } from '../hooks/useCumulativeSavings'
import SavingsAllocationPanel from './SavingsAllocationPanel'
import { useSavingsGoalQuery, useSavingsGoalSave } from '../hooks/queries/useSavingsGoalQuery'
import ConfirmDialog from './ui/ConfirmDialog'
import Modal from './ui/Modal'
import Button from './ui/Button'
import BottomSheet from './ui/BottomSheet'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'
import SortableWishlistItem from './ui/SortableWishlistItem'
import { formatYen, todayStr } from '../utils'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

interface Props {
  userId: string
}

interface FormState {
  name: string
  price: string
  targetYear: string
  targetMonth: string
}

const emptyForm = (): FormState => ({ name: '', price: '', targetYear: '', targetMonth: '' })

export default function WishlistPanel({ userId }: Props) {
  const [editing, setEditing] = useState<WishlistItem | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [celebrationItem, setCelebrationItem] = useState<WishlistItem | null>(null)
  const [marking, setMarking] = useState(false)
  const [showAllocation, setShowAllocation] = useState(false)
  const [showSavingsDetail, setShowSavingsDetail] = useState(false)
  const [localAllocations, setLocalAllocations] = useState<Record<string, number>>({})
  const [allocationSaveError, setAllocationSaveError] = useState<string | null>(null)
  const [allocationSaveSuccess, setAllocationSaveSuccess] = useState(false)
  const initialized = useRef(false)

  const queryClient = useQueryClient()
  const { data: items = [], isLoading: loading } = useWishlistQuery(userId)
  const insertMutation = useWishlistInsert(userId)
  const updateMutation = useWishlistUpdate(userId)
  const deleteMutation = useWishlistDelete(userId)
  const allocationSaveMutation = useSavingsGoalSave(userId)

  const {
    total,
    monthlyAverage,
    monthlyBreakdown,
    loading: savingsLoading,
  } = useCumulativeSavings(userId)
  const { data: allocations = {}, isLoading: allocLoading } = useSavingsGoalQuery(userId)

  const allActiveItems = items.filter((i) => !i.purchased_at)
  const achievedItems = items.filter((i) => !!i.purchased_at)
  const activeItems = allActiveItems
  const saving = insertMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  // ローカル配分状態の初期化（DBデータが変わったとき一度だけ）
  useEffect(() => {
    if (allocLoading || initialized.current) return
    initialized.current = true
    const amounts: Record<string, number> = {}
    for (const [id, entry] of Object.entries(allocations)) {
      amounts[id] = entry.amount
    }
    setLocalAllocations(amounts)
  }, [allocations, allocLoading])

  const ALLOCATION_STEP = 1000
  const totalPool = Math.max(0, total ?? 0)
  const totalAllocated = Object.values(localAllocations).reduce((s, v) => s + v, 0)
  const poolRemaining = totalPool - totalAllocated
  const isDirty = allActiveItems.some(
    (i) => (localAllocations[i.id] ?? 0) !== (allocations[i.id]?.amount ?? 0)
  )

  const handleIncrease = (itemId: string) => {
    if (poolRemaining < ALLOCATION_STEP) return
    setLocalAllocations((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + ALLOCATION_STEP }))
  }

  const handleDecrease = (itemId: string) => {
    const current = localAllocations[itemId] ?? 0
    if (current <= 0) return
    setLocalAllocations((prev) => ({
      ...prev,
      [itemId]: Math.max(0, current - ALLOCATION_STEP),
    }))
  }

  const handleSaveAllocations = async () => {
    setAllocationSaveError(null)
    try {
      const payload = allActiveItems.map((item) => ({
        wishlistItemId: item.id,
        amount: localAllocations[item.id] ?? 0,
        monthlyTarget: allocations[item.id]?.monthlyTarget ?? 0,
      }))
      await allocationSaveMutation.mutateAsync(payload)
      setAllocationSaveSuccess(true)
      setTimeout(() => setAllocationSaveSuccess(false), 1500)
    } catch {
      setAllocationSaveError('保存に失敗しました')
    }
  }

  const renormalize = async (ordered: WishlistItem[]) => {
    await Promise.all(
      ordered.map((item, i) =>
        updateMutation.mutateAsync({ id: item.id, data: { priority: i + 1 } })
      )
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeItems.findIndex((i) => i.id === active.id)
    const newIndex = activeItems.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(activeItems, oldIndex, newIndex)
    queryClient.setQueryData(['wishlist', userId], [...reordered, ...achievedItems])
    try {
      await renormalize(reordered)
    } catch {
      queryClient.setQueryData(['wishlist', userId], items)
      setError('並び替えに失敗しました')
    }
  }

  const openNew = () => {
    setForm(emptyForm())
    setEditing('new')
    setError(null)
  }

  const openEdit = (item: WishlistItem) => {
    let targetYear = ''
    let targetMonth = ''
    if (item.target_date) {
      const [y, m] = item.target_date.split('-')
      targetYear = y
      targetMonth = String(Number(m))
    }
    setForm({ name: item.name, price: String(item.target_amount), targetYear, targetMonth })
    setEditing(item)
    setError(null)
  }

  const closeForm = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('商品名を入力してください')
      return
    }
    if (!form.price) {
      setError('金額を入力してください')
      return
    }
    setError(null)
    try {
      if (editing === 'new') {
        const targetDate =
          form.targetYear && form.targetMonth
            ? `${form.targetYear}-${String(form.targetMonth).padStart(2, '0')}-01`
            : null
        const nextPriority =
          allActiveItems.length > 0 ? allActiveItems[allActiveItems.length - 1].priority + 1 : 1
        await insertMutation.mutateAsync({
          user_id: userId,
          name: form.name.trim(),
          target_amount: Number(form.price),
          priority: nextPriority,
          purchased_at: null,
          target_date: targetDate,
          notes: null,
        })
      } else if (editing) {
        const targetDate =
          form.targetYear && form.targetMonth
            ? `${form.targetYear}-${String(form.targetMonth).padStart(2, '0')}-01`
            : null
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            name: form.name.trim(),
            target_amount: Number(form.price),
            target_date: targetDate,
          },
        })
      }
      closeForm()
    } catch {
      setError('保存に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (editing === 'new' || !editing) return
    setConfirmDelete(false)
    try {
      await deleteMutation.mutateAsync(editing.id)
      const remaining = activeItems.filter((i) => i.id !== (editing as WishlistItem).id)
      await renormalize(remaining)
      closeForm()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleRevertAchieved = async (item: WishlistItem) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        data: { purchased_at: null, priority: allActiveItems.length + 1 },
      })
    } catch {
      setError('取り消しに失敗しました')
    }
  }

  const handleMarkAchieved = async () => {
    if (!celebrationItem) return
    setMarking(true)
    try {
      await updateMutation.mutateAsync({
        id: celebrationItem.id,
        data: { purchased_at: todayStr() },
      })
      const remaining = allActiveItems.filter((i) => i.id !== celebrationItem.id)
      await renormalize(remaining)
      setCelebrationItem(null)
    } catch {
      setError('更新に失敗しました')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="relative">
      <div className="px-4 py-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12 text-ink-muted text-sm">読み込み中...</div>
        ) : allActiveItems.length === 0 && achievedItems.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-sm">目標がまだありません</p>
            <p className="text-sm mt-1">下の＋ボタンから追加できます</p>
          </div>
        ) : (
          <>
            {/* 貯蓄サマリーカード */}
            {allActiveItems.length > 0 && (
              <div className="bg-surface rounded-xl shadow-sm px-4 py-4 mb-4 space-y-3">
                {/* 累計・平均（パネル全体タップで内訳表示） */}
                <button
                  onClick={() => !savingsLoading && setShowSavingsDetail(true)}
                  disabled={savingsLoading || monthlyBreakdown.length === 0}
                  className="w-full text-left active:opacity-70 disabled:opacity-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-ink-muted mb-0.5">
                        累計貯蓄額
                        {!savingsLoading && monthlyBreakdown.length > 0 && (
                          <svg
                            width="10"
                            height="10"
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
                        )}
                      </div>
                      {savingsLoading ? (
                        <div className="text-base font-bold text-ink-muted">計算中...</div>
                      ) : (
                        <div
                          className={`text-lg font-bold ${(total ?? 0) >= 0 ? 'text-income-600' : 'text-danger-500'}`}
                        >
                          {(total ?? 0) >= 0 ? '+' : ''}
                          {formatYen(total ?? 0)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-ink-muted mb-0.5">平均貯蓄額</div>
                      {savingsLoading ? (
                        <div className="text-sm text-ink-muted">...</div>
                      ) : (
                        <div
                          className={`text-sm font-semibold ${(monthlyAverage ?? 0) >= 0 ? 'text-income-600' : 'text-danger-500'}`}
                        >
                          {(monthlyAverage ?? 0) >= 0 ? '+' : ''}
                          {formatYen(monthlyAverage ?? 0)} / 月
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* 未配分残高 + 保存 */}
                <div className="border-t border-line-subtle pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-muted">
                      未配分:{' '}
                      <span
                        className={`font-semibold ${poolRemaining < 0 ? 'text-danger-500' : 'text-ink'}`}
                      >
                        {formatYen(poolRemaining)}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAllocation(true)}
                        className="text-xs text-primary-500 font-medium active:opacity-70"
                      >
                        積み立て計画 ›
                      </button>
                      {isDirty && (
                        <button
                          onClick={handleSaveAllocations}
                          disabled={allocationSaveMutation.isPending || allocationSaveSuccess}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-500 text-white active:bg-primary-600 disabled:opacity-50"
                        >
                          {allocationSaveSuccess
                            ? '保存しました ✓'
                            : allocationSaveMutation.isPending
                              ? '保存中...'
                              : '保存する'}
                        </button>
                      )}
                    </div>
                  </div>
                  {allocationSaveError && (
                    <p className="text-xs text-danger-500">{allocationSaveError}</p>
                  )}
                </div>
              </div>
            )}

            {/* アクティブリスト */}
            {activeItems.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-3">
                    {activeItems.map((item) => {
                      const localAmount = localAllocations[item.id] ?? 0
                      return (
                        <SortableWishlistItem
                          key={item.id}
                          item={item}
                          onEdit={openEdit}
                          detail={
                            item.target_date
                              ? `${item.target_date.slice(0, 7).replace('-', '年').replace('-', '月')}頃`
                              : (item.notes ?? undefined)
                          }
                          allocated={localAmount}
                          remaining={poolRemaining}
                          monthlyTarget={allocations[item.id]?.monthlyTarget ?? 0}
                          onIncrease={() => handleIncrease(item.id)}
                          onDecrease={() => handleDecrease(item.id)}
                          onMarkAchieved={
                            item.target_amount > 0 && localAmount >= item.target_amount
                              ? () => setCelebrationItem(item)
                              : undefined
                          }
                        />
                      )
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            {/* 購入済みリスト */}
            {achievedItems.length > 0 && (
              <div className="mt-6">
                <div className="text-xs text-ink-muted mb-2 px-1">購入済み</div>
                <ul className="space-y-2">
                  {achievedItems.map((item) => (
                    <li
                      key={item.id}
                      className="bg-surface rounded-xl px-4 py-3 flex items-center gap-3 opacity-60"
                    >
                      <span className="text-income-600 text-base flex-shrink-0">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm truncate line-through">{item.name}</p>
                        {item.purchased_at && (
                          <p className="text-ink-muted text-xs">
                            {item.purchased_at.slice(0, 10).replace(/-/g, '/')} 達成
                          </p>
                        )}
                      </div>
                      <span className="text-ink-muted text-sm flex-shrink-0 mr-1">
                        ¥{item.target_amount.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleRevertAchieved(item)}
                        disabled={saving}
                        className="text-ink-muted active:text-ink flex-shrink-0 p-1 disabled:opacity-40"
                        aria-label="達成を取り消す"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-10">
        <FabButton onClick={openNew} ariaLabel="目標を追加" />
      </div>

      {/* 編集・追加ボトムシート */}
      <BottomSheet
        isOpen={editing !== null}
        onClose={closeForm}
        title={editing === 'new' ? '目標を追加' : '目標を編集'}
        rightAction={
          editing !== null && editing !== 'new'
            ? {
                onClick: () => setConfirmDelete(true),
                disabled: saving,
                tone: 'danger',
              }
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-primary-500 active:bg-primary-600 text-white font-semibold disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        }
      >
        <div className="space-y-4">
          <ErrorText>{error}</ErrorText>
          <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <FormLabel className="font-medium">商品名</FormLabel>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例：新しいスニーカー"
              />
            </div>
            <div>
              <FormLabel className="font-medium">金額（円）</FormLabel>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="例：12000"
                inputMode="numeric"
              />
            </div>
            <div>
              <FormLabel className="font-medium">目標購入時期（任意）</FormLabel>
              <div className="flex gap-2">
                <select
                  value={form.targetYear}
                  onChange={(e) => setForm((f) => ({ ...f, targetYear: e.target.value }))}
                  className="flex-1 bg-surface-muted text-ink rounded-lg px-3 py-2.5 text-sm border border-line-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">年</option>
                  {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                    <option key={y} value={String(y)}>
                      {y}年
                    </option>
                  ))}
                </select>
                <select
                  value={form.targetMonth}
                  onChange={(e) => setForm((f) => ({ ...f, targetMonth: e.target.value }))}
                  className="flex-1 bg-surface-muted text-ink rounded-lg px-3 py-2.5 text-sm border border-line-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      {m}月
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </BottomSheet>

      {confirmDelete && editing !== null && editing !== 'new' && (
        <ConfirmDialog
          message={`「${(editing as WishlistItem).name}」を削除しますか？`}
          confirmLabel="削除"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* 達成お祝いダイアログ */}
      <SavingsAllocationPanel
        userId={userId}
        isOpen={showAllocation}
        onClose={() => setShowAllocation(false)}
      />

      {/* 累計貯蓄額 月別内訳ボトムシート */}
      <BottomSheet
        isOpen={showSavingsDetail}
        onClose={() => setShowSavingsDetail(false)}
        title="累計貯蓄額の内訳"
      >
        <div className="space-y-2 pt-1">
          {/* 合計行 */}
          <div className="bg-surface rounded-xl shadow-sm px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-ink">合計</span>
            <span
              className={`text-base font-bold ${(total ?? 0) >= 0 ? 'text-income-600' : 'text-danger-500'}`}
            >
              {(total ?? 0) >= 0 ? '+' : ''}
              {formatYen(total ?? 0)}
            </span>
          </div>
          {/* 月別リスト */}
          {monthlyBreakdown.map((entry) => {
            const [y, m] = entry.month.split('-')
            const label = `${y}年${Number(m)}月`
            const isPositive = entry.total >= 0
            return (
              <div
                key={entry.month}
                className="bg-surface rounded-xl shadow-sm px-4 py-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-ink">{label}</span>
                  <span
                    className={`text-sm font-bold ${isPositive ? 'text-income-600' : 'text-danger-500'}`}
                  >
                    {isPositive ? '+' : ''}
                    {formatYen(entry.total)}
                  </span>
                </div>
                <div className="space-y-1 border-t border-line-subtle pt-2">
                  <div className="flex justify-between text-xs text-ink-muted">
                    <span>予算収入</span>
                    <span className="text-income-600">+{formatYen(entry.budgetIncome)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-ink-muted">
                    <span>固定費</span>
                    <span>−{formatYen(entry.fixedExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-ink-muted">
                    <span>臨時支出</span>
                    <span className={entry.oneTimeExpenses > 0 ? 'text-danger-500' : ''}>
                      −{formatYen(entry.oneTimeExpenses)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          {monthlyBreakdown.length === 0 && (
            <div className="text-center py-12 text-ink-muted text-sm">データがありません</div>
          )}
        </div>
      </BottomSheet>

      {celebrationItem && (
        <Modal
          isOpen
          onClose={() => setCelebrationItem(null)}
          position="center"
          className="w-full max-w-sm mx-4 px-5 pt-6 pb-6"
        >
          <div className="text-center space-y-2">
            <div className="text-5xl">🎉</div>
            <div className="text-lg font-bold text-ink-strong">おめでとうございます！</div>
            <div className="text-sm text-ink-muted leading-relaxed">
              「{celebrationItem.name}」の
              <br />
              目標を達成しました！
            </div>
            <div className="text-2xl font-bold text-income-600 pt-1">
              {formatYen(celebrationItem.target_amount)}
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Button fullWidth onClick={handleMarkAchieved} disabled={marking}>
              {marking ? '更新中...' : '達成済みにする 🎊'}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setCelebrationItem(null)}>
              キャンセル
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
