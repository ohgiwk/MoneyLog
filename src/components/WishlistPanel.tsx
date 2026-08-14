import { useState } from 'react'
import FabButton from './ui/FabButton'
import { useQueryClient } from '@tanstack/react-query'
import { useWishlistQuery, useWishlistInsert, useWishlistUpdate, useWishlistDelete } from '../hooks/queries/useWishlistQuery'
import type { WishlistItem } from '../lib/services/wishlistService'
import { useCumulativeSavings } from '../hooks/useCumulativeSavings'
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
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

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

type TopItemStatus =
  | { kind: 'achieved' }
  | { kind: 'months'; count: number }
  | { kind: 'no-data' }

export default function WishlistPanel({ userId }: Props) {
  const [editing, setEditing] = useState<WishlistItem | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [celebrationItem, setCelebrationItem] = useState<WishlistItem | null>(null)
  const [marking, setMarking] = useState(false)

  const queryClient = useQueryClient()
  const { data: items = [], isLoading: loading } = useWishlistQuery(userId)
  const insertMutation = useWishlistInsert(userId)
  const updateMutation = useWishlistUpdate(userId)
  const deleteMutation = useWishlistDelete(userId)

  const { total, monthlyAverage, loading: savingsLoading } = useCumulativeSavings(userId)

  const activeItems = items.filter(i => !i.purchased_at)
  const achievedItems = items.filter(i => !!i.purchased_at)
  const topItem = activeItems.length > 0 ? activeItems[0] : null

  let topItemStatus: TopItemStatus | null = null
  if (topItem && !savingsLoading && total !== null && monthlyAverage !== null) {
    if (total >= topItem.target_amount) {
      topItemStatus = { kind: 'achieved' }
    } else if (monthlyAverage > 0) {
      topItemStatus = { kind: 'months', count: Math.ceil((topItem.target_amount - total) / monthlyAverage) }
    } else {
      topItemStatus = { kind: 'no-data' }
    }
  }

  const saving = insertMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const renormalize = async (ordered: WishlistItem[]) => {
    await Promise.all(
      ordered.map((item, i) => updateMutation.mutateAsync({ id: item.id, data: { priority: i + 1 } }))
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeItems.findIndex(i => i.id === active.id)
    const newIndex = activeItems.findIndex(i => i.id === over.id)
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
    if (!form.name.trim()) { setError('商品名を入力してください'); return }
    if (!form.price) { setError('金額を入力してください'); return }
    setError(null)
    try {
      if (editing === 'new') {
        const targetDate = form.targetYear && form.targetMonth
        ? `${form.targetYear}-${String(form.targetMonth).padStart(2, '0')}-01`
        : null
        const nextPriority = activeItems.length > 0 ? activeItems[activeItems.length - 1].priority + 1 : 1
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
        const targetDate = form.targetYear && form.targetMonth
          ? `${form.targetYear}-${String(form.targetMonth).padStart(2, '0')}-01`
          : null
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { name: form.name.trim(), target_amount: Number(form.price), target_date: targetDate },
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
      const remaining = activeItems.filter(i => i.id !== (editing as WishlistItem).id)
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
        data: { purchased_at: null, priority: activeItems.length + 1 },
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
      const remaining = activeItems.filter(i => i.id !== celebrationItem.id)
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
        ) : activeItems.length === 0 && achievedItems.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-sm">目標がまだありません</p>
            <p className="text-sm mt-1">下の＋ボタンから追加できます</p>
          </div>
        ) : (
          <>
            {/* 貯蓄サマリーカード */}
            {activeItems.length > 0 && (
              <div className="bg-surface rounded-xl shadow-sm px-4 py-4 mb-4 space-y-3">
                {/* 累計・平均 */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-ink-muted mb-0.5">累計貯蓄額</div>
                    {savingsLoading ? (
                      <div className="text-base font-bold text-ink-muted">計算中...</div>
                    ) : (
                      <div className={`text-lg font-bold ${(total ?? 0) >= 0 ? 'text-income-600' : 'text-danger-500'}`}>
                        {(total ?? 0) >= 0 ? '+' : ''}{formatYen(total ?? 0)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-muted mb-0.5">平均貯蓄額</div>
                    {savingsLoading ? (
                      <div className="text-sm text-ink-muted">...</div>
                    ) : (
                      <div className={`text-sm font-semibold ${(monthlyAverage ?? 0) >= 0 ? 'text-income-600' : 'text-danger-500'}`}>
                        {(monthlyAverage ?? 0) >= 0 ? '+' : ''}{formatYen(monthlyAverage ?? 0)} / 月
                      </div>
                    )}
                  </div>
                </div>

                {/* 1位アイテムの進捗 */}
                {topItem && (
                  <div className="border-t border-line-subtle pt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs bg-warning-400 text-white rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center font-bold">1</span>
                        <span className="text-sm font-medium text-ink-strong truncate">{topItem.name}</span>
                      </div>
                      <span className="text-xs text-ink-muted flex-shrink-0">¥{topItem.target_amount.toLocaleString()}</span>
                    </div>

                    {/* プログレスバー */}
                    {!savingsLoading && total !== null && (
                      <>
                        <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-income-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, Math.min((total / topItem.target_amount) * 100, 100))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-ink-muted">
                            {Math.round(Math.max(0, Math.min((total / topItem.target_amount) * 100, 100)))}%
                          </span>
                          {topItemStatus?.kind === 'achieved' ? (
                            <button
                              onClick={() => setCelebrationItem(topItem)}
                              className="text-xs font-semibold text-white bg-income-600 rounded-full px-3 py-1 active:bg-income-700"
                            >
                              達成済み ✓
                            </button>
                          ) : topItemStatus?.kind === 'months' ? (
                            <span className="text-xs font-semibold text-primary-600">あと{topItemStatus.count}ヶ月で達成見込み</span>
                          ) : topItemStatus?.kind === 'no-data' ? (
                            <span className="text-xs text-ink-muted">データ不足</span>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* アクティブリスト */}
            {activeItems.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={activeItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-3">
                    {activeItems.map((item) => (
                      <SortableWishlistItem
                        key={item.id}
                        item={item}
                        onEdit={openEdit}
                        detail={item.target_date
                          ? `${item.target_date.slice(0, 7).replace('-', '年').replace('-', '月')}頃`
                          : item.notes ?? undefined
                        }
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            {/* 達成済みリスト */}
            {achievedItems.length > 0 && (
              <div className="mt-6">
                <div className="text-xs text-ink-muted mb-2 px-1">達成済み</div>
                <ul className="space-y-2">
                  {achievedItems.map(item => (
                    <li key={item.id} className="bg-surface rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                      <span className="text-income-600 text-base flex-shrink-0">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm truncate line-through">{item.name}</p>
                        {item.purchased_at && (
                          <p className="text-ink-muted text-xs">
                            {item.purchased_at.slice(0, 10).replace(/-/g, '/')} 達成
                          </p>
                        )}
                      </div>
                      <span className="text-ink-muted text-sm flex-shrink-0 mr-1">¥{item.target_amount.toLocaleString()}</span>
                      <button
                        onClick={() => handleRevertAchieved(item)}
                        disabled={saving}
                        className="text-ink-muted active:text-ink flex-shrink-0 p-1 disabled:opacity-40"
                        aria-label="達成を取り消す"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
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
        rightAction={editing !== null && editing !== 'new' ? {
          onClick: () => setConfirmDelete(true),
          disabled: saving,
          tone: 'danger',
        } : undefined}
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
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例：新しいスニーカー"
              />
            </div>
            <div>
              <FormLabel className="font-medium">金額（円）</FormLabel>
              <Input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="例：12000"
                inputMode="numeric"
              />
            </div>
            <div>
              <FormLabel className="font-medium">目標購入時期（任意）</FormLabel>
              <div className="flex gap-2">
                <select
                  value={form.targetYear}
                  onChange={e => setForm(f => ({ ...f, targetYear: e.target.value }))}
                  className="flex-1 bg-surface-muted text-ink rounded-lg px-3 py-2.5 text-sm border border-line-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">年</option>
                  {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + i).map(y => (
                    <option key={y} value={String(y)}>{y}年</option>
                  ))}
                </select>
                <select
                  value={form.targetMonth}
                  onChange={e => setForm(f => ({ ...f, targetMonth: e.target.value }))}
                  className="flex-1 bg-surface-muted text-ink rounded-lg px-3 py-2.5 text-sm border border-line-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={String(m)}>{m}月</option>
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
      {celebrationItem && (
        <Modal isOpen onClose={() => setCelebrationItem(null)} position="center" className="w-full max-w-sm mx-4 px-5 pt-6 pb-6">
          <div className="text-center space-y-2">
            <div className="text-5xl">🎉</div>
            <div className="text-lg font-bold text-ink-strong">おめでとうございます！</div>
            <div className="text-sm text-ink-muted leading-relaxed">
              「{celebrationItem.name}」の<br />目標を達成しました！
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
