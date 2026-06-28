import { useEffect, useState, type FormEvent } from 'react'
import type { CategoryInfo } from '../constants'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { todayStr } from '../utils'
import { useForm } from '../hooks/useForm'
import { TabGroup } from './ui/TabGroup'
import FixedExpenseList from './FixedExpenseList'
import ConsumablesList from './ConsumablesList'

type RecordSubPage = 'one_time' | 'fixed' | 'consumables'

const SUB_PAGE_TABS: { key: RecordSubPage; label: string }[] = [
  { key: 'one_time', label: '臨時出費' },
  { key: 'fixed', label: '固定費' },
  { key: 'consumables', label: '消耗品費' },
]

interface OneTimeFormValues {
  type: 'expense' | 'income'
  date: string
  category: string
  amount: string
  memo: string
}

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  fixedCategories: CategoryInfo[]
  editingTx?: Transaction | null
  onEditDone?: () => void
  onEditSaved?: () => void
}

export default function RecordTab({
  userId,
  expenseCategories,
  incomeCategories,
  fixedCategories,
  editingTx,
  onEditDone,
  onEditSaved,
}: Props) {
  const [sub, setSub] = useState<RecordSubPage>('one_time')
  const [fixedEditing, setFixedEditing] = useState(false)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  const { values, setValue, setValues, isSubmitting, setIsSubmitting, error, setError, reset } =
    useForm<OneTimeFormValues>({
      type: 'expense',
      date: todayStr(),
      category: expenseCategories[0]?.name ?? '',
      amount: '',
      memo: '',
    })

  const formCategories = values.type === 'expense' ? expenseCategories : incomeCategories

  useEffect(() => {
    if (editingTx) {
      setValues({
        type: editingTx.type as 'expense' | 'income',
        date: editingTx.date,
        category: editingTx.category,
        amount: String(editingTx.amount),
        memo: editingTx.memo ?? '',
      })
      setSub('one_time')
    }
  }, [editingTx]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTypeChange(newType: 'expense' | 'income') {
    const cats = newType === 'expense' ? expenseCategories : incomeCategories
    setValues({ ...values, type: newType, category: cats[0]?.name ?? '' })
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

  async function handleDelete() {
    if (!editingTx) return
    setIsSubmitting(true)
    try {
      await transactionService.delete(editingTx.id)
      onEditDone?.()
      onEditSaved?.()
      reset()
      setValue('date', todayStr())
      setValue('category', expenseCategories[0]?.name ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(values.amount)
    if (!amt || amt <= 0) {
      setAmountError('正しい金額を入力してください')
      return
    }
    setAmountError(null)
    setError(null)
    setIsSubmitting(true)
    try {
      if (editingTx) {
        await transactionService.update(editingTx.id, {
          type: values.type,
          expense_kind: values.type === 'expense' ? (editingTx.expense_kind ?? 'one_time') : null,
          date: values.date,
          category: values.category,
          amount: amt,
          memo: values.memo.trim() || null,
        })
        onEditDone?.()
        onEditSaved?.()
      } else {
        await transactionService.insert({
          user_id: userId,
          type: values.type,
          expense_kind: values.type === 'expense' ? 'one_time' : null,
          date: values.date,
          category: values.category,
          amount: amt,
          memo: values.memo.trim() || null,
          recurring_rule_id: null,
        })
      }
      reset()
      setValue('date', todayStr())
      setValue('category', expenseCategories[0]?.name ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました')
    } finally {
      setIsSubmitting(false)
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
                  (values.type === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500')
                }
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                  (values.type === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500')
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
                value={values.date}
                onChange={(e) => setValue('date', e.target.value)}
                className="w-full min-w-0 max-w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
                    onClick={() => setValue('category', c.name)}
                    className={
                      'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                      (values.category === c.name
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
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={values.amount}
                  onChange={(e) => {
                    setValue('amount', e.target.value)
                    if (amountError) setAmountError(null)
                  }}
                  className={`flex-1 border rounded-xl px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 ${amountError ? 'border-rose-300' : 'border-slate-200'}`}
                />
                <span className="text-sm text-slate-500 font-medium">円</span>
              </div>
              {amountError && <p className="text-xs text-rose-500 mt-1">{amountError}</p>}
            </div>

            {/* メモ */}
            <div>
              <label className="text-xs text-slate-400">メモ（任意）</label>
              <input
                type="text"
                placeholder="例: スーパーで買い物"
                value={values.memo}
                onChange={(e) => setValue('memo', e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={
                'w-full py-3 rounded-xl text-white font-semibold shadow disabled:opacity-50 ' +
                (values.type === 'expense'
                  ? 'bg-rose-500 active:bg-rose-600'
                  : 'bg-emerald-500 active:bg-emerald-600')
              }
            >
              {isSubmitting ? (editingTx ? '更新中...' : '記録中...') : (editingTx ? '更新する' : '記録する')}
            </button>

            {editingTx && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="w-[30%] py-3 rounded-xl text-rose-500 font-semibold border border-rose-200 active:bg-rose-50 disabled:opacity-50"
                >
                  削除
                </button>
                <button
                  type="button"
                  onClick={() => { onEditDone?.(); onEditSaved?.(); reset(); setValue('date', todayStr()); setValue('category', expenseCategories[0]?.name ?? '') }}
                  disabled={isSubmitting}
                  className="w-[70%] py-3 rounded-xl text-slate-500 font-semibold border border-slate-200 active:bg-slate-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            )}
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
