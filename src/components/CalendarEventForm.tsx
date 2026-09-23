import { useState, useEffect, useRef } from 'react'
import type { CalendarEvent } from '../lib/database.types'
import { calendarEventService } from '../lib/services/calendarEventService'
import BottomSheet from './ui/BottomSheet'
import ConfirmDialog from './ui/ConfirmDialog'
import DatePicker from './ui/DatePicker'
import ErrorText from './ui/ErrorText'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import { formatYen } from '../utils'

interface Props {
  isOpen: boolean
  userId: string
  date: string
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

interface ExpenseRow {
  id: number
  label: string
  amount: string
}

// 明細導入前に登録された予定は planned_expense しか持たないため、ラベルなしの1行として扱う
function initialExpenseRows(event: CalendarEvent | null): ExpenseRow[] {
  const items = event?.expense_items?.length
    ? event.expense_items
    : event?.planned_expense
      ? [{ label: '', amount: event.planned_expense }]
      : [{ label: '', amount: 0 }]
  return items.map((item, i) => ({
    id: i,
    label: item.label,
    amount: item.amount ? String(item.amount) : '',
  }))
}

export default function CalendarEventForm({
  isOpen,
  userId,
  date,
  event,
  onClose,
  onSaved,
}: Props) {
  const [eventDate, setEventDate] = useState(event?.date ?? date)
  const [endDate, setEndDate] = useState(event?.end_date ?? event?.date ?? date)
  const [allDay, setAllDay] = useState(event ? !event.start_time : false)
  const [title, setTitle] = useState(event?.title ?? '')
  const [startTime, setStartTime] = useState(event?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(event?.end_time?.slice(0, 5) ?? '')
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>(() => initialExpenseRows(event))
  const nextRowId = useRef(expenseRows.length)
  const [memo, setMemo] = useState(event?.memo ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setEventDate(event?.date ?? date)
    setEndDate(event?.end_date ?? event?.date ?? date)
    setAllDay(event ? !event.start_time : false)
    setTitle(event?.title ?? '')
    setStartTime(event?.start_time?.slice(0, 5) ?? '')
    setEndTime(event?.end_time?.slice(0, 5) ?? '')
    const rows = initialExpenseRows(event)
    setExpenseRows(rows)
    nextRowId.current = rows.length
    setMemo(event?.memo ?? '')
    setTitleError(null)
    setIsSubmitting(false)
    setError(null)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!title.trim()) {
      setTitleError('予定名を入力してください')
      return
    }
    setTitleError(null)
    setError(null)
    setIsSubmitting(true)
    const expenseItems = expenseRows
      .map((row) => ({ label: row.label.trim(), amount: parseInt(row.amount) || 0 }))
      .filter((item) => item.amount > 0)
    try {
      const payload = {
        user_id: userId,
        date: eventDate,
        end_date: endDate > eventDate ? endDate : null,
        title: title.trim(),
        start_time: allDay ? null : startTime || null,
        end_time: allDay ? null : endTime || null,
        planned_expense: expenseItems.reduce((sum, item) => sum + item.amount, 0),
        expense_items: expenseItems,
        memo: memo.trim() || null,
      }
      if (event) {
        await calendarEventService.update(event.id, payload)
      } else {
        await calendarEventService.insert(payload)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  function updateExpenseRow(id: number, patch: Partial<Omit<ExpenseRow, 'id'>>) {
    setExpenseRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function addExpenseRow() {
    setExpenseRows((rows) => [...rows, { id: nextRowId.current++, label: '', amount: '' }])
  }

  function removeExpenseRow(id: number) {
    setExpenseRows((rows) => rows.filter((row) => row.id !== id))
  }

  const expenseTotal = expenseRows.reduce((sum, row) => sum + (parseInt(row.amount) || 0), 0)

  async function handleDelete() {
    if (!event) return
    setIsSubmitting(true)
    try {
      await calendarEventService.delete(event.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={event ? '予定を編集' : '予定を追加'}
        rightAction={
          event
            ? {
                onClick: () => setConfirmDelete(true),
                disabled: isSubmitting,
                tone: 'danger',
              }
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-primary-500 active:bg-primary-600 text-white font-semibold disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
              {error}
            </div>
          )}
          <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <label className="text-xs text-ink-muted">予定名</label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (titleError) setTitleError(null)
                }}
                placeholder="例: 会議、買い物"
                error={!!titleError}
                className="mt-1"
              />
              <ErrorText>{titleError}</ErrorText>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-8 flex-shrink-0">開始</label>
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={eventDate}
                    onChange={(v) => {
                      setEventDate(v)
                      if (endDate < v) setEndDate(v)
                    }}
                    {...(allDay ? {} : { time: startTime, onTimeChange: setStartTime })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-8 flex-shrink-0">終了</label>
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={endDate}
                    onChange={(v) => setEndDate(v < eventDate ? eventDate : v)}
                    {...(allDay ? {} : { time: endTime, onTimeChange: setEndTime })}
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="text-sm text-ink">終日</span>
              <div
                onClick={() => setAllDay((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${allDay ? 'bg-primary-500' : 'bg-surface-muted'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${allDay ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </div>
            </label>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-ink-muted">予定出費</label>
                {expenseRows.length > 1 && (
                  <span className="text-xs text-ink-muted">
                    合計 <span className="font-semibold text-ink">{formatYen(expenseTotal)}</span>
                  </span>
                )}
              </div>
              <div className="space-y-2 mt-1">
                {expenseRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        value={row.label}
                        onChange={(e) => updateExpenseRow(row.id, { label: e.target.value })}
                        placeholder="ラベル（例: 交通費）"
                      />
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={row.amount}
                        onChange={(e) => updateExpenseRow(row.id, { amount: e.target.value })}
                        className="text-right"
                      />
                    </div>
                    <span className="text-sm text-ink-muted">円</span>
                    {expenseRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExpenseRow(row.id)}
                        aria-label="この出費を削除"
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExpenseRow}
                className="mt-2 w-full py-2 rounded-xl border border-dashed border-line text-sm text-primary-600 dark:text-primary-400 active:bg-surface-hover"
              >
                ＋ 出費を追加
              </button>
            </div>

            <div>
              <label className="text-xs text-ink-muted">メモ（任意）</label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </BottomSheet>

      {confirmDelete && event && (
        <ConfirmDialog
          message={`「${event.title}」を削除しますか？`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
