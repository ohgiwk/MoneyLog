import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionService } from '../lib/services/transactionService'
import { formatYen, categoryInfo } from '../utils'
import { STORE_TYPES, PAYMENT_TYPES, MEAL_TYPES } from '../constants'
import type { Transaction } from '../lib/database.types'
import BottomSheet from './ui/BottomSheet'
import { useQuickRecordPresets } from '../hooks/useQuickRecordPresets'

interface Props {
  userId: string
  isOpen: boolean
  onClose: () => void
  onSelect: (tx: Transaction) => void
}

function storeTypeInfo(name: string | null) {
  if (!name) return null
  return STORE_TYPES.find((s) => s.name === name) ?? null
}

function paymentTypeInfo(type: string | null) {
  if (!type) return null
  return PAYMENT_TYPES.find((p) => p.type === type) ?? null
}

function mealTypeInfo(name: string | null) {
  if (!name) return null
  return MEAL_TYPES.find((m) => m.name === name) ?? null
}

function txKey(tx: Transaction) {
  return `${tx.category}|${tx.amount}|${tx.memo ?? ''}`
}

export default function QuickRecordSheet({ userId, isOpen, onClose, onSelect }: Props) {
  const { data: frequentExpenses = [], isLoading } = useQuery({
    queryKey: ['frequentExpenses', 'v3', userId],
    queryFn: () => transactionService.fetchFrequentExpenses(userId),
    enabled: isOpen && !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const { presets, updatePreset } = useQuickRecordPresets(userId)
  const [menuOpenKey, setMenuOpenKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPinned, setEditPinned] = useState(false)

  function handleSelect(tx: Transaction) {
    onClose()
    onSelect(tx)
  }

  function openMenu(key: string) {
    setMenuOpenKey(menuOpenKey === key ? null : key)
  }

  function openEdit(tx: Transaction) {
    const key = txKey(tx)
    const preset = presets[key] ?? {}
    setEditName(preset.name ?? '')
    setEditPinned(preset.pinned ?? false)
    setEditingKey(key)
    setMenuOpenKey(null)
  }

  function togglePin(tx: Transaction) {
    const key = txKey(tx)
    const isPinned = !!presets[key]?.pinned
    updatePreset(key, { pinned: !isPinned || undefined })
    setMenuOpenKey(null)
  }

  function saveEdit(tx: Transaction) {
    const key = txKey(tx)
    updatePreset(key, {
      name: editName.trim() || undefined,
      pinned: editPinned || undefined,
    })
    setEditingKey(null)
  }

  // ピン留め優先、次いで頻度順
  const sorted = [...frequentExpenses].sort((a, b) => {
    const ap = presets[txKey(a.tx)]?.pinned ? 1 : 0
    const bp = presets[txKey(b.tx)]?.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    return b.count - a.count
  })

  const hasPinned = sorted.some(({ tx }) => presets[txKey(tx)]?.pinned)
  const hasUnpinned = sorted.some(({ tx }) => !presets[txKey(tx)]?.pinned)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="よく記録する出費" height="70dvh">
      {/* メニューが開いているとき背景タップで閉じる */}
      {menuOpenKey && <div className="fixed inset-0 z-10" onClick={() => setMenuOpenKey(null)} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-ink-muted text-sm">
          読み込み中…
        </div>
      ) : frequentExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-ink-muted">
          <span className="text-3xl">📋</span>
          <p className="text-sm">よく使う出費がまだありません</p>
          <p className="text-xs">出費を記録すると、ここに表示されます</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pb-2">
          {hasPinned && (
            <p className="text-[11px] font-semibold text-ink-muted px-1 pt-1">ピン留め</p>
          )}
          {sorted.map(({ count, tx }, idx) => {
            const key = txKey(tx)
            const preset = presets[key] ?? {}
            const isPinned = !!preset.pinned
            const isEditing = editingKey === key
            const isMenuOpen = menuOpenKey === key

            const showSeparator =
              hasPinned &&
              hasUnpinned &&
              idx > 0 &&
              !isPinned &&
              presets[txKey(sorted[idx - 1].tx)]?.pinned

            const cat = categoryInfo(tx.category)
            const store = storeTypeInfo(tx.store_type)
            const payment = paymentTypeInfo(tx.payment_type)
            const meal = mealTypeInfo(tx.meal_type)
            const displayName = preset.name ?? null

            return (
              <div key={key}>
                {showSeparator && (
                  <p className="text-[11px] font-semibold text-ink-muted px-1 pt-2 pb-0.5">
                    よく使う
                  </p>
                )}

                {/* メイン行 */}
                <div className="relative flex items-stretch bg-surface rounded-xl shadow-sm overflow-visible">
                  {/* タップ領域（記録） */}
                  <button
                    type="button"
                    onClick={() => handleSelect(tx)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 active:bg-surface-hover text-left rounded-l-xl overflow-hidden"
                  >
                    <span className="text-3xl flex-shrink-0 leading-none">{cat.icon}</span>

                    <div className="flex-1 min-w-0">
                      {displayName ? (
                        <>
                          <p className="text-sm font-semibold text-ink-strong truncate">
                            {isPinned && (
                              <span className="inline-block mr-1 text-primary-500 text-xs">📌</span>
                            )}
                            {displayName}
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5 truncate">
                            {tx.category}
                            {tx.memo ? ` · ${tx.memo}` : ''}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPinned && <span className="text-primary-500 text-xs">📌</span>}
                            <span className="text-xs font-medium text-ink-muted">
                              {tx.category}
                            </span>
                            {meal && (
                              <span className="text-xs text-ink-muted">
                                {meal.icon} {meal.name}
                              </span>
                            )}
                          </div>
                          {tx.memo && (
                            <p className="text-sm font-semibold text-ink-strong truncate mt-0.5">
                              {tx.memo}
                            </p>
                          )}
                        </>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {store && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-full">
                            {store.icon} {store.name}
                          </span>
                        )}
                        {payment && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-full">
                            {payment.icon} {payment.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="text-base font-bold text-danger-500">{formatYen(tx.amount)}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{count}回</p>
                    </div>
                  </button>

                  {/* ３点リーダーボタン */}
                  <button
                    type="button"
                    onClick={() => openMenu(key)}
                    className={
                      'relative z-20 flex-shrink-0 flex items-center justify-center w-10 border-l border-line rounded-r-xl active:bg-surface-hover ' +
                      (isMenuOpen ? 'bg-surface-muted' : '')
                    }
                    aria-label="メニュー"
                  >
                    <svg
                      width="4"
                      height="16"
                      viewBox="0 0 4 16"
                      fill="currentColor"
                      className="text-ink-muted"
                    >
                      <circle cx="2" cy="2" r="1.5" />
                      <circle cx="2" cy="8" r="1.5" />
                      <circle cx="2" cy="14" r="1.5" />
                    </svg>
                  </button>

                  {/* ドロップダウンメニュー */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 bg-surface rounded-xl shadow-lg border border-line overflow-hidden min-w-36">
                      <button
                        type="button"
                        onClick={() => togglePin(tx)}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink-strong active:bg-surface-hover text-left"
                      >
                        <span className="text-base">{isPinned ? '📌' : '📍'}</span>
                        {isPinned ? 'ピン留めを解除' : 'ピン留め'}
                      </button>
                      <div className="h-px bg-line" />
                      <button
                        type="button"
                        onClick={() => openEdit(tx)}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink-strong active:bg-surface-hover text-left"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-ink-muted"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        名前を編集
                      </button>
                    </div>
                  )}
                </div>

                {/* インライン編集フォーム */}
                {isEditing && (
                  <div className="bg-surface-muted rounded-b-xl px-4 py-3 -mt-1 flex flex-col gap-3 border-t border-line">
                    <div>
                      <label className="text-xs font-semibold text-ink-muted mb-1 block">
                        表示名
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={tx.memo ? tx.memo : tx.category}
                        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-strong placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingKey(null)}
                        className="flex-1 py-2 rounded-lg text-sm text-ink-muted bg-surface active:bg-surface-hover border border-line"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(tx)}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary-500 active:bg-primary-600"
                      >
                        保存
                      </button>
                    </div>
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
