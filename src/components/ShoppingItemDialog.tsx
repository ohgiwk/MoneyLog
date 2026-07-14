import { useState } from 'react'
import { createPortal } from 'react-dom'
import { STORE_TYPES } from '../constants'
import type { ShoppingItem } from '../lib/database.types'

interface Props {
  item?: ShoppingItem
  defaultGroup?: string
  groups?: string[]
  onConfirm: (name: string, memo: string | null, budgetAmount: number, group: string) => Promise<void>
  onCancel: () => void
}

export default function ShoppingItemDialog({ item, defaultGroup, groups = [], onConfirm, onCancel }: Props) {
  // 編集時 or グループ指定済みの場合はステップ2から開始
  const initialStep = (item || defaultGroup !== undefined) ? 2 : 1

  const [step, setStep] = useState<1 | 2>(initialStep)
  const [group, setGroup] = useState(item?.category ?? defaultGroup ?? '')
  const [customGroup, setCustomGroup] = useState('')
  const [name, setName] = useState(item?.name ?? '')
  const [memo, setMemo] = useState(item?.memo ?? '')
  const [budget, setBudget] = useState(item?.budget_amount ? String(item.budget_amount) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCustomGroup = group === '__custom__'
  const resolvedGroup = isCustomGroup ? customGroup.trim() : group

  const customGroups = groups.filter(g => !STORE_TYPES.some(st => st.name === g))

  function handleGroupNext() {
    setStep(2)
  }

  async function handleSubmit() {
    const trimmedName = name.trim()
    if (!trimmedName) { setError('商品名を入力してください'); return }
    const parsedBudget = budget.trim() ? parseInt(budget, 10) : 0
    if (budget.trim() && (isNaN(parsedBudget) || parsedBudget < 0)) {
      setError('予算は0以上の数値で入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm(trimmedName, memo.trim() || null, parsedBudget, resolvedGroup)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden">

        {step === 1 ? (
          /* ── Step 1: グループ選択 ── */
          <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-base font-bold text-ink-strong">グループを選択</h2>
              <span className="text-xs text-ink-muted">1 / 2</span>
            </div>

            {/* 店舗種別パネル */}
            <div>
              <p className="text-xs text-ink-muted mb-2">店舗種別</p>
              <div className="grid grid-cols-4 gap-2">
                {STORE_TYPES.filter(st => st.name !== 'ガソリンスタンド' && st.name !== '飲食店').map(st => (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => setGroup(group === st.name ? '' : st.name)}
                    className={
                      'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                      (group === st.name
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-line-subtle bg-surface-subtle')
                    }
                  >
                    <span className="text-lg">{st.icon}</span>
                    <span className="text-[10px] leading-tight text-ink text-center">{st.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 既存カスタムグループ */}
            {customGroups.length > 0 && (
              <div>
                <p className="text-xs text-ink-muted mb-2">既存グループ</p>
                <div className="grid grid-cols-4 gap-2">
                  {customGroups.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGroup(group === g ? '' : g)}
                      className={
                        'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                        (group === g
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-line-subtle bg-surface-subtle')
                      }
                    >
                      <span className="text-lg">🏷️</span>
                      <span className="text-[10px] leading-tight text-ink text-center">{g}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* カスタム入力 */}
            <div>
              <p className="text-xs text-ink-muted mb-2">または自由入力</p>
              <input
                type="text"
                value={customGroup}
                onChange={(e) => { setCustomGroup(e.target.value); setGroup('__custom__') }}
                onFocus={() => setGroup('__custom__')}
                placeholder="グループ名を入力..."
                className={
                  'w-full border rounded-xl px-3 py-2.5 text-sm text-ink-strong focus:outline-none ' +
                  (isCustomGroup ? 'border-primary-400' : 'border-line focus:border-primary-400')
                }
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-line text-sm text-ink active:bg-surface-subtle"
              >
                キャンセル
              </button>
              <button
                onClick={handleGroupNext}
                className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-medium active:bg-primary-600"
              >
                {resolvedGroup ? `「${resolvedGroup}」で次へ` : 'グループなしで次へ'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Step 2: 商品入力 ── */
          <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              {!item && defaultGroup === undefined && (
                <button
                  onClick={() => setStep(1)}
                  className="p-1 -ml-1 text-ink-muted active:text-ink rounded-lg"
                  aria-label="グループ選択に戻る"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
              )}
              <h2 className="flex-1 text-base font-bold text-ink-strong">
                {item ? '買い物メモを編集' : '商品を入力'}
              </h2>
              {!item && defaultGroup === undefined && (
                <span className="text-xs text-ink-muted">2 / 2</span>
              )}
            </div>

            {/* 選択中グループ表示（新規・グループパネル経由） */}
            {!item && (
              resolvedGroup ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-50 rounded-xl w-fit">
                  <span className="text-xs text-primary-600 font-medium">{resolvedGroup}</span>
                  {defaultGroup === undefined && (
                    <button onClick={() => setStep(1)} className="text-primary-400 active:text-primary-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ) : null
            )}

            {/* グループ変更（編集時） */}
            {item && (
              <div>
                <label className="block text-xs text-ink-muted mb-1">グループ</label>
                <select
                  value={isCustomGroup ? '__custom__' : group}
                  onChange={(e) => { setGroup(e.target.value); if (e.target.value !== '__custom__') setCustomGroup('') }}
                  className="w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400 bg-surface"
                >
                  <option value="">グループなし</option>
                  <optgroup label="店舗種別">
                    {STORE_TYPES.filter(st => st.name !== 'ガソリンスタンド' && st.name !== '飲食店').map(st => (
                      <option key={st.name} value={st.name}>{st.icon} {st.name}</option>
                    ))}
                  </optgroup>
                  {customGroups.length > 0 && (
                    <optgroup label="既存グループ">
                      {customGroups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__custom__">＋ 自由入力...</option>
                </select>
                {isCustomGroup && (
                  <input
                    autoFocus
                    type="text"
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    placeholder="グループ名を入力..."
                    className="mt-2 w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-ink-muted mb-1">商品名</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 牛乳"
                className="w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs text-ink-muted mb-1">メモ（任意）</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例: 特売のもの"
                className="w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs text-ink-muted mb-1">予算（任意）</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">¥</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0"
                  className="w-full border border-line rounded-xl pl-7 pr-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400"
                />
              </div>
            </div>

            {error && <p className="text-xs text-danger-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-line text-sm text-ink active:bg-surface-subtle"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-medium active:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
