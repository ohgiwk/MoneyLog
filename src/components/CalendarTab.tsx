import Card from './ui/Card'
import FabButton from './ui/FabButton'
import CalendarEventForm from './CalendarEventForm'
import ErrorText from './ui/ErrorText'
import BottomSheet from './ui/BottomSheet'
import OneTimeTransactionForm from './OneTimeTransactionForm'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import type { CalendarEvent, ShiftType, Transaction } from '../lib/database.types'
import type { HeaderState } from '../types/layout'
import { workScheduleService } from '../lib/services/workScheduleService'
import { useCalendarEventsQuery } from '../hooks/queries/useCalendarEventsQuery'
import { useWorkScheduleQuery } from '../hooks/queries/useWorkScheduleQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { useQueryClient } from '@tanstack/react-query'
import { formatDateWithWeekday, formatYen, todayStr } from '../utils'
import { MEAL_TYPES, STORE_TYPES } from '../constants'
import { useWorkplacesQuery } from '../hooks/queries/useWorkplacesQuery'
import { countShiftDays, formatShiftTime, shiftColor, workplaceForDate } from '../lib/workShift'

interface Props {
  userId: string
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// expense_items カラム追加前のデータでも落ちないようにする
function expenseItemsOf(ev: CalendarEvent): CalendarEvent['expense_items'] {
  return ev.expense_items ?? []
}

function formatEventPoint(date: string, time: string | null): string {
  const label = `${parseInt(date.slice(5, 7))}/${parseInt(date.slice(8))}`
  return time ? `${label} ${time.slice(0, 5)}` : label
}

export default function CalendarTab({ userId }: Props) {
  const { month, calendarSelectedDate, categories } = useAppContext()
  const expenseCategories = categories.activeExpenseCategories
  const incomeCategories = categories.activeIncomeCategories
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<string>(calendarSelectedDate ?? todayStr())
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [dayTypeError, setDayTypeError] = useState<string | null>(null)
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [formEditingTx, setFormEditingTx] = useState<Transaction | null>(null)
  const [formHeaderState, setFormHeaderState] = useState<HeaderState | null>(null)
  const submitRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (selectedDate.slice(0, 7) !== month) {
      const today = todayStr()
      setSelectedDate(month === today.slice(0, 7) ? today : `${month}-01`)
    }
  }, [month])

  const { data: events = [], isError: eventsError } = useCalendarEventsQuery(userId, month)
  const { data: workSchedule = [], isError: scheduleError } = useWorkScheduleQuery(userId, month)
  const { data: transactions = [], isError: txError } = useTransactionsQuery(userId, month)

  const {
    workplaces,
    shiftTypeById,
    shiftTypes,
    isError: workplacesError,
  } = useWorkplacesQuery(userId)

  const fetchError =
    eventsError || scheduleError || txError || workplacesError
      ? 'データの読み込みに失敗しました'
      : null

  const shiftTypeByDate = useMemo(() => {
    const map = new Map<string, ShiftType>()
    for (const s of workSchedule) {
      const t = s.shift_type_id ? shiftTypeById.get(s.shift_type_id) : undefined
      if (t) map.set(s.date, t)
    }
    return map
  }, [workSchedule, shiftTypeById])

  const dayTypeCounts = useMemo(
    () => countShiftDays(workSchedule, shiftTypeById),
    [workSchedule, shiftTypeById]
  )

  const selectedShiftType = shiftTypeByDate.get(selectedDate)
  const selectedShiftTime = selectedShiftType ? formatShiftTime(selectedShiftType) : null
  // 選択日に適用される勤務先の区分を選択肢にする（職場が変わっても過去の日は元の区分のまま）
  const selectedWorkplace = workplaceForDate(workplaces, selectedDate)
  const shiftOptions = useMemo(
    () => shiftTypes.filter((t) => t.workplace_id === selectedWorkplace?.id && !t.archived),
    [shiftTypes, selectedWorkplace]
  )

  async function handleShiftTypeChange(next: ShiftType | null) {
    setDayTypeError(null)
    try {
      if (next === null) {
        await workScheduleService.clearDayType(userId, selectedDate)
      } else {
        await workScheduleService.setShiftType(userId, selectedDate, next.id)
      }
      void queryClient.invalidateQueries({ queryKey: ['workSchedule', userId, month] })
    } catch (err) {
      setDayTypeError(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  // カレンダーグリッド生成
  const calendarDays = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number)
    const firstDay = new Date(year, monthNum - 1, 1).getDay()
    const lastDate = new Date(year, monthNum, 0).getDate()
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= lastDate; d++) {
      days.push(`${month}-${String(d).padStart(2, '0')}`)
    }
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [month])

  const expenseByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type === 'expense') map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount)
    }
    return map
  }, [transactions])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const date of calendarDays) {
      if (!date) continue
      const dayEvents = events.filter((e) => e.date <= date && date <= (e.end_date ?? e.date))
      if (dayEvents.length > 0) map.set(date, dayEvents)
    }
    return map
  }, [events, calendarDays])

  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const selectedTransactions = useMemo(
    () => transactions.filter((tx) => tx.date === selectedDate && tx.type === 'expense'),
    [transactions, selectedDate]
  )

  function openAdd() {
    setEditingEvent(null)
    setShowForm(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingEvent(null)
  }

  function openEditTx(tx: Transaction) {
    setFormEditingTx(tx)
    setFormHeaderState(null)
    setTxModalOpen(true)
  }

  function closeTxModal() {
    setTxModalOpen(false)
    setFormEditingTx(null)
    void queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {fetchError && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      {/* カレンダーグリッド */}
      <Card>
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-line-subtle">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={
                'py-2 text-center text-xs font-semibold ' +
                (i === 0 ? 'text-danger-400' : i === 6 ? 'text-sky-500' : 'text-ink-muted')
              }
            >
              {d}
            </div>
          ))}
        </div>
        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, i) => {
            if (!date)
              return (
                <div
                  key={i}
                  className="h-16 border-b border-r border-line-subtle last:border-r-0"
                />
              )
            const isSelected = date === selectedDate
            const isToday = date === todayStr()
            const dow = new Date(date + 'T00:00:00').getDay()
            const dayNum = parseInt(date.slice(8))
            const shiftType = shiftTypeByDate.get(date)
            const cellBg = shiftType ? shiftColor(shiftType.color).cellBg : ''
            const expense = expenseByDate.get(date) ?? 0
            const hasEvent = eventsByDate.has(date)
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={
                  'relative h-16 flex flex-col items-center pt-1 border-b border-r border-line-subtle last:border-r-0 transition ' +
                  cellBg +
                  ' ' +
                  (isSelected
                    ? 'ring-2 ring-inset ring-primary-400'
                    : cellBg
                      ? ''
                      : 'active:bg-surface-subtle')
                }
              >
                <span
                  className={
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ' +
                    (isToday
                      ? 'bg-primary-500 text-white'
                      : dow === 0
                        ? 'text-danger-400'
                        : dow === 6
                          ? 'text-sky-500'
                          : 'text-ink')
                  }
                >
                  {dayNum}
                </span>
                {(expense > 0 || hasEvent) && (
                  <div className="flex flex-row items-center gap-0.5 mt-0.5">
                    {expense > 0 && (
                      <span
                        className={
                          'rounded-full bg-danger-400 ' +
                          (expense >= 15000
                            ? 'w-2.5 h-2.5'
                            : expense >= 5000
                              ? 'w-2 h-2'
                              : expense >= 1000
                                ? 'w-1.5 h-1.5'
                                : 'w-1 h-1')
                        }
                      />
                    )}
                    {hasEvent && <span className="w-1.5 h-1.5 rounded-full bg-income-400" />}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {/* 月の出勤・休日数 */}
        <div className="flex justify-end gap-3 px-3 py-1.5 text-[11px] text-ink-muted">
          <span>
            出勤{' '}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {dayTypeCounts.work}
            </span>
            日
          </span>
          <span>
            休日{' '}
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              {dayTypeCounts.off}
            </span>
            日
          </span>
        </div>
      </Card>

      {/* 選択日のヘッダー */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">
          {formatDateWithWeekday(selectedDate)}
        </span>
      </div>

      {/* 選択日の区分設定 */}
      <div className="bg-surface rounded-2xl shadow-sm px-3 py-2 flex items-start gap-2">
        <div className="shrink-0 pt-1.5">
          <div className="text-xs text-ink-muted">区分</div>
          {workplaces.length > 1 && selectedWorkplace && (
            <div className="text-[10px] text-ink-subtle max-w-[4rem] truncate">
              {selectedWorkplace.name}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <ErrorText>{dayTypeError}</ErrorText>
          {shiftOptions.length === 0 ? (
            <div className="py-1.5 text-xs text-ink-muted">
              区分がありません。設定の「勤務先と区分」から追加できます
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {shiftOptions.map((t) => {
                const selected = selectedShiftType?.id === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void handleShiftTypeChange(selected ? null : t)}
                    className={
                      'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ' +
                      (selected
                        ? shiftColor(t.color).chip
                        : 'border-line-subtle text-ink-muted bg-surface-subtle')
                    }
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 選択日の予定リスト */}
      <div className="space-y-1">
        <span className="text-xs text-ink-muted px-1">予定</span>
        {selectedShiftType && selectedShiftTime && (
          <div className="bg-surface rounded-xl shadow-sm px-3 py-1.5 flex items-center gap-2 text-xs">
            <span
              className={
                'px-1.5 py-0.5 rounded border font-semibold ' +
                shiftColor(selectedShiftType.color).chip
              }
            >
              {selectedShiftType.name}
            </span>
            <span className="text-ink font-medium tabular-nums">{selectedShiftTime}</span>
          </div>
        )}
        {selectedEvents.length === 0 ? (
          selectedShiftTime ? null : (
            <div className="bg-surface rounded-2xl shadow-sm px-4 py-6 text-center text-sm text-ink-muted">
              予定はありません
            </div>
          )
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => openEdit(ev)}
                className="w-full bg-surface rounded-2xl shadow-sm px-4 py-3 flex items-start justify-between gap-3 text-left active:bg-surface-subtle"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink truncate">{ev.title}</span>
                  </div>
                  {ev.end_date ? (
                    <div className="text-xs text-ink-muted mt-0.5">
                      {formatEventPoint(ev.date, ev.start_time)} 〜{' '}
                      {formatEventPoint(ev.end_date, ev.end_time)}
                    </div>
                  ) : (
                    (ev.start_time || ev.end_time) && (
                      <div className="text-xs text-ink-muted mt-0.5">
                        {ev.start_time ? ev.start_time.slice(0, 5) : ''}
                        {ev.end_time ? ` 〜 ${ev.end_time.slice(0, 5)}` : ''}
                      </div>
                    )
                  )}
                  {(expenseItemsOf(ev).length > 1 || expenseItemsOf(ev).some((i) => i.label)) && (
                    <div className="text-xs text-ink-muted mt-0.5 flex flex-wrap gap-x-2">
                      {expenseItemsOf(ev).map((item, i) => (
                        <span key={i}>
                          {item.label || '出費'} {formatYen(item.amount)}
                        </span>
                      ))}
                    </div>
                  )}
                  {ev.memo && (
                    <div className="text-xs text-ink-muted mt-0.5 truncate">{ev.memo}</div>
                  )}
                </div>
                {ev.planned_expense > 0 && (
                  <span className="text-sm font-semibold text-danger-500 shrink-0">
                    -{formatYen(ev.planned_expense)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 選択日の出費記録 */}
      {selectedTransactions.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-ink-muted">出費記録</span>
            <span className="text-xs font-semibold text-danger-500">
              -{formatYen(selectedTransactions.reduce((s, tx) => s + tx.amount, 0))}
            </span>
          </div>
          <div className="space-y-2">
            {selectedTransactions.map((tx) => {
              const store = tx.store_type
                ? STORE_TYPES.find((s) => s.name === tx.store_type)
                : undefined
              const meal =
                tx.category === '食費' && tx.meal_type
                  ? MEAL_TYPES.find((m) => m.name === tx.meal_type)
                  : undefined
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => openEditTx(tx)}
                  className="w-full bg-surface rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3 text-left active:bg-surface-subtle"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg shrink-0">
                      {expenseCategories.find((c) => c.name === tx.category)?.icon ?? '📦'}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm text-ink truncate block">{tx.category}</span>
                      {(meal || store || tx.memo) && (
                        <div className="text-xs text-ink-muted flex items-center gap-1">
                          {meal && (
                            <span className="flex items-center gap-0.5">
                              <span>{meal.icon}</span>
                              <span>{meal.name}</span>
                            </span>
                          )}
                          {meal && (store || tx.memo) && <span>/</span>}
                          {store && (
                            <span className="flex items-center gap-0.5">
                              <span>{store.icon}</span>
                              <span>{store.name}</span>
                            </span>
                          )}
                          {store && tx.memo && <span>/</span>}
                          {tx.memo && <span className="truncate">{tx.memo}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-danger-500 shrink-0">
                    -{formatYen(tx.amount)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <FabButton onClick={openAdd} ariaLabel="予定を追加" />
      </div>

      {/* 出費記録編集ボトムシート */}
      <BottomSheet
        isOpen={txModalOpen}
        onClose={closeTxModal}
        title="出費を編集"
        rightAction={
          formHeaderState?.action
            ? {
                onClick: formHeaderState.action.onClick,
                disabled: formHeaderState.action.disabled,
                tone: 'danger',
              }
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => submitRef.current?.()}
            disabled={!!formHeaderState?.isSubmitting}
            className="w-full py-3.5 text-base rounded-[2rem] shadow-lg text-white font-semibold disabled:opacity-50 bg-danger-500 active:bg-danger-600"
          >
            更新する
          </button>
        }
      >
        <OneTimeTransactionForm
          userId={userId}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          editingTx={formEditingTx}
          onBack={closeTxModal}
          onTypeChange={() => {}}
          onHeaderChange={setFormHeaderState}
          submitRef={submitRef}
        />
      </BottomSheet>

      {/* カレンダー予定追加・編集ボトムシート */}
      <CalendarEventForm
        isOpen={showForm}
        userId={userId}
        date={selectedDate}
        event={editingEvent}
        onClose={closeForm}
        onSaved={() => {
          closeForm()
          void queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId, month] })
          void queryClient.invalidateQueries({ queryKey: ['calendarEvents', 'upcoming', userId] })
        }}
      />
    </div>
  )
}
