import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { transactionService } from '../lib/services/transactionService'
import { formatYen, categoryInfo, todayStr } from '../utils'
import { PAYMENT_TYPES, MEAL_TYPES } from '../constants'
import type { Transaction } from '../lib/database.types'
import BottomSheet from './ui/BottomSheet'
import ConfirmDialog from './ui/ConfirmDialog'
import FabButton from './ui/FabButton'
import PinnedItemSheet from './PinnedItemSheet'
import { useQuickRecordPresets } from '../hooks/useQuickRecordPresets'
import { useStoreTypes } from '../hooks/useStoreTypes'
import {
  draftFromTx,
  expenseKey,
  migratePinnedPresets,
  pinnedItemToTx,
  usePinnedItems,
  type PinnedItem,
} from '../hooks/usePinnedItems'

interface Props {
  userId: string
  isOpen: boolean
  onClose: () => void
  onSelect: (tx: Transaction) => void
}

interface ListProps {
  userId: string
  onSelect: (tx: Transaction) => void
  // true のときだけ、ピン留めの追加・編集・削除ができる（長押しシートは選ぶだけ）
  editable?: boolean
}

function frequentOpenKey(userId: string) {
  return `qrfreq_open_${userId}`
}

function paymentTypeInfo(type: string | null) {
  if (!type) return null
  return PAYMENT_TYPES.find((p) => p.type === type) ?? null
}

function mealTypeInfo(name: string | null) {
  if (!name) return null
  return MEAL_TYPES.find((m) => m.name === name) ?? null
}

export default function QuickRecordSheet({ userId, isOpen, onClose, onSelect }: Props) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="よく記録する出費" height="70dvh">
      <QuickRecordList
        userId={userId}
        onSelect={(tx) => {
          onClose()
          onSelect(tx)
        }}
      />
    </BottomSheet>
  )
}

// よく記録する出費のリスト本体（長押しシートと記録タブのサブタブで共用する）
export function QuickRecordList({ userId, onSelect, editable = false }: ListProps) {
  const {
    data: frequentExpenses = [],
    isLoading,
    isSuccess,
  } = useQuery({
    queryKey: ['frequentExpenses', 'v3', userId],
    queryFn: () => transactionService.fetchFrequentExpenses(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const { presets } = useQuickRecordPresets(userId)
  const { items: pinnedItems, addItem, updateItem, removeItem } = usePinnedItems(userId)
  const { items: storeTypes } = useStoreTypes()
  const [menuOpenKey, setMenuOpenKey] = useState<string | null>(null)
  const [frequentOpen, setFrequentOpen] = useState(
    () => localStorage.getItem(frequentOpenKey(userId)) !== '0'
  )
  // ピン留めの追加・編集シート（item が null なら新規作成）
  const [pinEdit, setPinEdit] = useState<{ item: PinnedItem | null } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // 旧形式のピン留めは、元の記録が分かるこのタイミングで独立した項目へ移す
  useEffect(() => {
    if (isSuccess)
      migratePinnedPresets(
        userId,
        frequentExpenses.map((f) => f.tx)
      )
  }, [isSuccess, userId, frequentExpenses])

  // ピン留めと同じ出費は「よく使う」側に重ねて出さない
  const pinnedKeys = new Set(pinnedItems.map(expenseKey))
  const frequentRows = frequentExpenses.filter(({ tx }) => !pinnedKeys.has(expenseKey(tx)))

  function toggleMenu(key: string) {
    setMenuOpenKey(menuOpenKey === key ? null : key)
  }

  function openPinEdit(item: PinnedItem | null) {
    setPinEdit({ item })
    setMenuOpenKey(null)
  }

  function toggleFrequent() {
    const next = !frequentOpen
    setFrequentOpen(next)
    try {
      localStorage.setItem(frequentOpenKey(userId), next ? '1' : '0')
    } catch {
      // 開閉状態は保存できなくても支障がない
    }
  }

  return (
    <>
      {/* メニューが開いているとき背景タップで閉じる */}
      {menuOpenKey && <div className="fixed inset-0 z-10" onClick={() => setMenuOpenKey(null)} />}

      {/* pb-20: 最後の行が FAB に隠れないようにする */}
      <div className={'flex flex-col gap-2 ' + (editable ? 'pb-20' : 'pb-2')}>
        <p className="text-[11px] font-semibold text-ink-muted px-1 pt-1">ピン留め</p>

        {pinnedItems.length === 0 && (
          <p className="text-xs text-ink-muted px-1 pb-1">
            {editable
              ? 'ピン留めはまだありません。右下の＋ボタンから自由に作成できます'
              : 'ピン留めはまだありません。記録タブの「よく記録する出費」から作成できます'}
          </p>
        )}

        {pinnedItems.map((item) => {
          const rowKey = `pin:${item.id}`
          const tx = pinnedItemToTx(item, userId, todayStr())
          return (
            <QuickRow
              key={item.id}
              tx={tx}
              displayName={item.name}
              isPinned
              storeIcon={storeTypes.find((s) => s.name === tx.store_type)?.icon}
              onSelect={() => onSelect(tx)}
              menu={
                editable
                  ? {
                      isOpen: menuOpenKey === rowKey,
                      onToggle: () => toggleMenu(rowKey),
                      items: [
                        { label: '編集', icon: <EditIcon />, onClick: () => openPinEdit(item) },
                        {
                          label: '削除',
                          icon: <TrashIcon />,
                          tone: 'danger',
                          onClick: () => {
                            setDeleteId(item.id)
                            setMenuOpenKey(null)
                          },
                        },
                      ],
                    }
                  : undefined
              }
            />
          )
        })}

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
          frequentRows.length > 0 && (
            <div>
              <button
                type="button"
                onClick={toggleFrequent}
                aria-expanded={frequentOpen}
                className="w-full flex items-center justify-between px-1 pt-2 pb-1.5 rounded-lg active:bg-surface-hover"
              >
                <span className="text-[11px] font-semibold text-ink-muted">
                  よく使う（{frequentRows.length}）
                </span>
                <svg
                  className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${frequentOpen ? '' : '-rotate-90'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: frequentOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.2s ease',
                }}
              >
                {/* -mx-1 px-1: 閉じるための overflow-hidden で行の影が切れないよう余白を取る。
                    閉じ終えたら invisible にして、中のボタンにフォーカスが当たらないようにする */}
                <div
                  className={
                    'overflow-hidden -mx-1 px-1 transition-[visibility] duration-0 ' +
                    (frequentOpen ? 'visible' : 'invisible delay-200')
                  }
                >
                  <div className="flex flex-col gap-2 pb-1">
                    {frequentRows.map(({ count, tx }) => {
                      const key = expenseKey(tx)
                      const displayName = presets[key]?.name ?? null
                      return (
                        <QuickRow
                          key={key}
                          tx={tx}
                          displayName={displayName}
                          count={count}
                          storeIcon={storeTypes.find((s) => s.name === tx.store_type)?.icon}
                          onSelect={() => onSelect(tx)}
                          onPin={editable ? () => addItem(draftFromTx(tx, displayName)) : undefined}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {editable && (
        <>
          {/* FAB */}
          <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
            <FabButton onClick={() => openPinEdit(null)} ariaLabel="ピン留めを追加" />
          </div>

          <PinnedItemSheet
            isOpen={pinEdit !== null}
            initial={pinEdit?.item ?? null}
            onSave={(draft) => {
              if (pinEdit?.item) updateItem(pinEdit.item.id, draft)
              else addItem(draft)
              setPinEdit(null)
            }}
            onClose={() => setPinEdit(null)}
            onDelete={() => {
              if (pinEdit?.item) setDeleteId(pinEdit.item.id)
              setPinEdit(null)
            }}
          />

          {deleteId && (
            <ConfirmDialog
              message="このピン留めを削除しますか？"
              onConfirm={() => {
                removeItem(deleteId)
                setDeleteId(null)
              }}
              onCancel={() => setDeleteId(null)}
            />
          )}
        </>
      )}
    </>
  )
}

interface MenuItem {
  label: string
  icon: ReactNode
  onClick: () => void
  tone?: 'danger'
}

function QuickRow({
  tx,
  displayName,
  count,
  isPinned = false,
  storeIcon,
  onSelect,
  menu,
  onPin,
}: {
  tx: Transaction
  displayName: string | null
  // よく使う出費の記録回数（ピン留めには無い）
  count?: number
  isPinned?: boolean
  storeIcon?: string
  onSelect: () => void
  // ピン留めの行: ３点リーダーのメニュー
  menu?: { isOpen: boolean; onToggle: () => void; items: MenuItem[] }
  // よく使う出費の行: 編集はできず、ピン留めへの追加だけできる
  onPin?: () => void
}) {
  const cat = categoryInfo(tx.category)
  const payment = paymentTypeInfo(tx.payment_type)
  const meal = mealTypeInfo(tx.meal_type)

  return (
    <div>
      {/* メイン行 */}
      <div className="relative flex items-stretch bg-surface rounded-xl shadow-sm overflow-visible">
        {/* タップ領域（記録） */}
        <button
          type="button"
          onClick={onSelect}
          className={
            'flex-1 flex items-center gap-3 px-4 py-3 active:bg-surface-hover text-left overflow-hidden ' +
            (menu || onPin ? 'rounded-l-xl' : 'rounded-xl')
          }
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
                  <span className="text-xs font-medium text-ink-muted">{tx.category}</span>
                  {meal && (
                    <span className="text-xs text-ink-muted">
                      {meal.icon} {meal.name}
                    </span>
                  )}
                </div>
                {tx.memo && (
                  <p className="text-sm font-semibold text-ink-strong truncate mt-0.5">{tx.memo}</p>
                )}
              </>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {tx.store_type && (
                <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-full">
                  {storeIcon ?? '🏷️'} {tx.store_type}
                </span>
              )}
              {payment && (
                <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-full">
                  {payment.icon} {tx.payment_method ?? payment.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <p className="text-base font-bold text-danger-500">{formatYen(tx.amount)}</p>
            {count !== undefined && <p className="text-xs text-ink-muted mt-0.5">{count}回</p>}
          </div>
        </button>

        {onPin && (
          <button
            type="button"
            onClick={onPin}
            className="flex-shrink-0 flex items-center justify-center w-10 border-l border-line rounded-r-xl text-base active:bg-surface-hover"
            aria-label="ピン留め"
          >
            📍
          </button>
        )}

        {/* ３点リーダーボタン */}
        {menu && (
          <button
            type="button"
            onClick={menu.onToggle}
            className={
              'relative z-20 flex-shrink-0 flex items-center justify-center w-10 border-l border-line rounded-r-xl active:bg-surface-hover ' +
              (menu.isOpen ? 'bg-surface-muted' : '')
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
        )}

        {/* ドロップダウンメニュー */}
        <AnimatePresence>
          {menu?.isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              style={{ transformOrigin: 'top right' }}
              className="absolute right-0 top-full mt-1 z-30 bg-surface rounded-xl shadow-lg border border-line overflow-hidden min-w-36 divide-y divide-line"
            >
              {menu.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={
                    'flex items-center gap-2.5 w-full px-4 py-3 text-sm active:bg-surface-hover text-left ' +
                    (item.tone === 'danger' ? 'text-danger-500' : 'text-ink-strong')
                  }
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function EditIcon() {
  return (
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
  )
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}
