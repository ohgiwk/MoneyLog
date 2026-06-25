import { useEffect, useState, type FormEvent } from 'react'
import type { CategoryInfo } from '../constants'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import type { Consumable, FixedExpense } from '../lib/database.types'
import { todayStr } from '../utils'
import { TabGroup } from './ui/TabGroup'
import FixedExpenseList from './FixedExpenseList'
import ConsumablesList from './ConsumablesList'

type RecordSubPage = 'one_time' | 'fixed' | 'consumables'

const SUB_PAGE_TABS: { key: RecordSubPage; label: string }[] = [
  { key: 'one_time', label: '臨時出費' },
  { key: 'fixed', label: '固定費' },
  { key: 'consumables', label: '消耗品費' },
]

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  fixedCategories: CategoryInfo[]
}

export default function RecordTab({
  userId,
  expenseCategories,
  incomeCategories,
  fixedCategories,
}: Props) {
  const [sub, setSub] = useState<RecordSubPage>('one_time')
  const [fixedEditing, setFixedEditing] = useState(false)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // 臨時出費フォーム state
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState(expenseCategories[0]?.name ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  const formCategories = type === 'expense' ? expenseCategories : incomeCategories

  function handleTypeChange(newType: 'expense' | 'income') {
    const cats = newType === 'expense' ? expenseCategories : incomeCategories
    setType(newType)
    setCategory(cats[0]?.name ?? '')
  }

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const [fixed, consumablesData, profile] = await Promise.all([
          fixedExpenseService.fetchByUser(userId),
          consumableService.fetchByUser(userId),
          profileService.fetchById(userId),
        ])
        setFixedExpenses(fixed)
        setConsumables(consumablesData)
        if (profile) setHouseholdMembers(profile.household_members ?? 1)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [userId])

  async function fetchFixedExpenses() {
    try {
      const data = await fixedExpenseService.fetchByUser(userId)
      setFixedExpenses(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  async function fetchConsumables() {
    try {
      const data = await consumableService.fetchByUser(userId)
      setConsumables(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setAmountError('正しい金額を入力してください')
      return
    }
    setAmountError(null)
    setSubmitError(null)
    setSubmitting(true)
    try {
      await transactionService.insert({
        user_id: userId,
        type,
        expense_kind: type === 'expense' ? 'one_time' : null,
        date,
        category,
        amount: amt,
        memo: memo.trim() || null,
        recurring_rule_id: null,
      })
      setAmount('')
      setMemo('')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '記録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const isEditing = fixedEditing || consumableEditing

  return (
    <div>
      {/* タブ切り替え */}
      {!isEditing && (
        <div className="px-4 pt-4">
          <TabGroup tabs={SUB_PAGE_TABS} active={sub} onChange={setSub} size="sm" />
        </div>
      )}

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="p-4 space-y-4">
        {sub === 'one_time' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {/* 収支トグル */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                  (type === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500')
                }
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                  (type === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500')
                }
              >
                収入
              </button>
            </div>

            {/* 日付 */}
            <div>
              <label className="text-xs text-slate-400">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label className="text-xs text-slate-400">カテゴリ</label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {formCategories.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    className={
                      'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                      (category === c.name
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-100 bg-slate-50')
                    }
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] leading-tight text-slate-600 text-center">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 金額 */}
            <div>
              <label className="text-xs text-slate-400">金額</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (amountError) setAmountError(null)
                }}
                className={`w-full mt-1 border rounded-xl px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 ${amountError ? 'border-rose-300' : 'border-slate-200'}`}
              />
              {amountError && <p className="text-xs text-rose-500 mt-1">{amountError}</p>}
            </div>

            {/* メモ */}
            <div>
              <label className="text-xs text-slate-400">メモ（任意）</label>
              <input
                type="text"
                placeholder="例: スーパーで買い物"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {submitError && <p className="text-xs text-rose-500">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className={
                'w-full py-3 rounded-xl text-white font-semibold shadow disabled:opacity-50 ' +
                (type === 'expense'
                  ? 'bg-rose-500 active:bg-rose-600'
                  : 'bg-emerald-500 active:bg-emerald-600')
              }
            >
              {submitting ? '記録中...' : '記録する'}
            </button>
          </form>
        )}

        {sub === 'fixed' && (
          <FixedExpenseList
            userId={userId}
            fixedExpenses={fixedExpenses}
            fixedCategories={fixedCategories}
            reload={fetchFixedExpenses}
            onEditingChange={setFixedEditing}
          />
        )}

        {sub === 'consumables' && (
          <ConsumablesList
            userId={userId}
            consumables={consumables}
            householdMembers={householdMembers}
            reload={fetchConsumables}
            onEditingChange={setConsumableEditing}
          />
        )}
      </div>
    </div>
  )
}
